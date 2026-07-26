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
  const season = Number(db.prepare("INSERT INTO seasons(farm_id,crop,start_date,end_date) VALUES(?,?,?,?)").run(farm, "תות", "2026-08-01", "2026-09-01").lastInsertRowid);
  const shift = Number(db.prepare("INSERT INTO shifts(date,slot,season_id,leader_id,goal,notes,created_by) VALUES(?,?,?,?,?,?,?)").run("2026-08-10", "MORNING", season, p1, 10.5, "", admin).lastInsertRowid);
  db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?),(?,?)").run(shift, p1, shift, p2);
  return { admin, p1, p2, shift };
}

describe("מחזור משמרת ודיווח", () => {
  it("מוביל אינו רואה או מעדכן דוח של טיוטה",()=>{const x=setup();expect(()=>new ShiftService(db).saveQuantities(x.p1,x.shift,[{userId:x.p1,quantity:1}])).toThrow("אין הרשאה");});
  it("רק מנהל מפרסם ויוצר התראה לכל קוטף", () => {
    const x = setup(); const service = new ShiftService(db);
    expect(() => service.transition(x.p1, x.shift, "PUBLISHED")).toThrow("אין הרשאה");
    service.transition(x.admin, x.shift, "PUBLISHED");
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 2 });
  });

  it("רק ראש הצוות או מנהל מדווחים והסכום מחושב", () => {
    const x = setup(); const service = new ShiftService(db); db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(x.shift);
    expect(() => service.saveQuantities(x.p2, x.shift, [{ userId: x.p1, quantity: 1 }])).toThrow("אין הרשאה");
    service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: 4.25 }, { userId: x.p2, quantity: 5.5 }]);
    expect(service.total(x.admin, x.shift)).toBe(9.75);
  });

  it("דוחה כמות עבור מי שאינו משובץ וכמות שלילית", () => {
    const x = setup(); const service = new ShiftService(db); db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(x.shift);
    expect(() => service.saveQuantities(x.p1, x.shift, [{ userId: 999, quantity: 2 }])).toThrow("אינו משובץ");
    expect(() => service.saveQuantities(x.p1, x.shift, [{ userId: x.p1, quantity: -1 }])).toThrow("כמות");
  });
});
