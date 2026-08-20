import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { ShiftService } from "@/lib/services/shifts";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const admin = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const p1 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("ראש", "leader@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const p2 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף", "picker@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "סטרולסה").lastInsertRowid);
  const shift = Number(db.prepare("INSERT INTO shifts(date,slot,plantation_field_id,leader_id,notes,created_by) VALUES(?,?,?,?,?,?)").run("2026-08-10", "MORNING", field, p1, "", admin).lastInsertRowid);
  db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)").run(shift, "KG", 10.5);
  db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?),(?,?)").run(shift, p1, shift, p2);
  db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?),(?,?,?)").run(p1,"2026-08-10","AVAILABLE",p2,"2026-08-10","AVAILABLE");
  return { admin, p1, p2, shift, field };
}

describe("מחזור משמרת ודיווח", () => {
  it("מוביל אינו רואה או מעדכן דוח של טיוטה",()=>{const x=setup();expect(()=>new ShiftService(db).saveQuantities(x.p1,x.shift,[{userId:x.p1,quantity:1,unit:"KG"}])).toThrow("מצב המשמרת");});
  it("רק מנהל מפרסם ויוצר התראה לכל קוטף", () => {
    const x = setup(); const service = new ShiftService(db);
    expect(() => service.transition(x.p1, x.shift, "PUBLISHED")).toThrow("אין הרשאה");
    service.transition(x.admin, x.shift, "PUBLISHED");
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 2 });
  });

  it("רק ראש הצוות או מנהל מדווחים והסכום מחושב", () => {
    const x = setup(); const service = new ShiftService(db); db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(x.shift);
    expect(() => service.saveQuantities(x.p2, x.shift, [{ userId: x.p1, quantity: 1, unit: "KG" }])).toThrow("אין הרשאה");
    service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: 4.25, unit: "KG" }, { userId: x.p2, quantity: 5.5, unit: "KG" }]);
    expect(service.totals(x.admin, x.shift)).toEqual([{ unit: "KG", produced: 9.75, goal: 10.5 }]);
  });

  it("מאפשר לקוטף לדווח מספר יחידות מידה באותה משמרת", () => {
    const x = setup(); const service = new ShiftService(db); db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(x.shift);
    service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: 3, unit: "KG" }, { userId: x.p1, quantity: 2, unit: "CRATE_LARGE" }, { userId: x.p2, quantity: 1, unit: "KG" }]);
    expect(service.totals(x.admin, x.shift).sort((a,b)=>a.unit.localeCompare(b.unit))).toEqual([
      { unit: "CRATE_LARGE", produced: 2, goal: 0 }, { unit: "KG", produced: 4, goal: 10.5 }
    ]);
    expect(() => service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: 1, unit: "KG" }, { userId: x.p1, quantity: 2, unit: "KG" }, { userId: x.p2, quantity: 1, unit: "KG" }])).toThrow("יחידת מידה כפולה");
  });

  it("דוחה כמות עבור מי שאינו משובץ, דוח חלקי וכמות שלילית", () => {
    const x = setup(); const service = new ShiftService(db); db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(x.shift);
    expect(() => service.saveQuantities(x.p1, x.shift, [{ userId: 999, quantity: 2, unit: "KG" }, { userId: x.p2, quantity: 1, unit: "KG" }])).toThrow("אינו משובץ");
    expect(() => service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: 1, unit: "KG" }])).toThrow("כל הקוטפים");
    expect(() => service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: -1, unit: "KG" }, { userId: x.p2, quantity: 1, unit: "KG" }])).toThrow("כמות");
  });
  it("פרסום ופתיחה מחדש מאמתים מחדש משאבים והתנגשויות",()=>{const x=setup();const service=new ShiftService(db);db.prepare("UPDATE users SET active=0 WHERE id=?").run(x.p2);expect(()=>service.transition(x.admin,x.shift,"PUBLISHED")).toThrow("קוטף אינו פעיל");db.prepare("UPDATE users SET active=1 WHERE id=?").run(x.p2);db.prepare("UPDATE shifts SET status='CANCELLED' WHERE id=?").run(x.shift);const other=Number(db.prepare("INSERT INTO shifts(date,slot,plantation_field_id,leader_id,created_by) VALUES(?,?,?,?,?)").run("2026-08-10","MORNING",x.field,x.p1,x.admin).lastInsertRowid);db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)").run(other,"KG",1);db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)").run(other,x.p1);expect(()=>service.transition(x.admin,x.shift,"DRAFT")).toThrow("שיבוץ כפול");});
  it("אינו משלים משמרת בלי דוח מלא ומדויק לכל הקוטפים",()=>{const x=setup();const service=new ShiftService(db);service.transition(x.admin,x.shift,"PUBLISHED");expect(()=>service.transition(x.admin,x.shift,"COMPLETED")).toThrow("דיווח מלא");db.prepare("INSERT INTO quantities(shift_id,user_id,quantity,unit,updated_by) VALUES(?,?,?,?,?)").run(x.shift,x.p1,1,"KG",x.admin);expect(()=>service.transition(x.admin,x.shift,"COMPLETED")).toThrow("דיווח מלא");db.prepare("INSERT INTO quantities(shift_id,user_id,quantity,unit,updated_by) VALUES(?,?,?,?,?)").run(x.shift,x.p2,2,"KG",x.admin);expect(()=>service.transition(x.admin,x.shift,"COMPLETED")).not.toThrow();});
  it("אינו משלים משמרת כשקוטף מדווח מספר יחידות וקוטף אחר לא דיווח כלל",()=>{const x=setup();const service=new ShiftService(db);service.transition(x.admin,x.shift,"PUBLISHED");db.prepare("INSERT INTO quantities(shift_id,user_id,quantity,unit,updated_by) VALUES(?,?,?,?,?),(?,?,?,?,?)").run(x.shift,x.p1,3,"KG",x.admin,x.shift,x.p1,2,"CRATE_LARGE",x.admin);expect(()=>service.transition(x.admin,x.shift,"COMPLETED")).toThrow("דיווח מלא");});
  it("השלמה סופית ומשיכת פרסום מודיעה לצוות",()=>{const x=setup();const service=new ShiftService(db);service.transition(x.admin,x.shift,"PUBLISHED");db.prepare("DELETE FROM notifications").run();service.transition(x.admin,x.shift,"DRAFT");expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({count:2});service.transition(x.admin,x.shift,"PUBLISHED");service.saveQuantities(x.admin,x.shift,[{userId:x.p1,quantity:1,unit:"KG"},{userId:x.p2,quantity:2,unit:"KG"}]);service.transition(x.admin,x.shift,"COMPLETED");expect(()=>service.transition(x.admin,x.shift,"PUBLISHED")).toThrow("מעבר מצב");});
  it("גם מנהל אינו מדווח בטיוטה או בביטול",()=>{const x=setup();const service=new ShiftService(db);expect(()=>service.saveQuantities(x.admin,x.shift,[{userId:x.p1,quantity:1,unit:"KG"},{userId:x.p2,quantity:2,unit:"KG"}])).toThrow("מצב");db.prepare("UPDATE shifts SET status='CANCELLED' WHERE id=?").run(x.shift);expect(()=>service.saveQuantities(x.admin,x.shift,[{userId:x.p1,quantity:1,unit:"KG"},{userId:x.p2,quantity:2,unit:"KG"}])).toThrow("מצב");});
});
