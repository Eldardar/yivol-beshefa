import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import fs from "node:fs";
import { createTestDb, migrate } from "@/lib/db";
import { AdminService } from "@/lib/services/admin";
import { SchedulingService } from "@/lib/services/scheduling";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const admin = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const p1 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("ראש", "leader@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const p2 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף", "picker@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "סטרולסה").lastInsertRowid);
  const vehicle = Number(db.prepare("INSERT INTO vehicles(number,name) VALUES(?,?)").run("1", "טנדר").lastInsertRowid);
  for (const id of [p1,p2]) db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(id,"2026-08-10","AVAILABLE");
  return { admin,p1,p2,farm,field,vehicle };
}

describe("זהות קוטף",()=>{
  it("שומר תעודת זהות ייחודית ומאפשר רשומות מורשת ללא תעודה",()=>{expect((db.prepare("PRAGMA table_info(users)").all() as Array<{name:string}>).some(column=>column.name==="national_id")).toBe(true);db.prepare("INSERT INTO users(name,email,phone,national_id,role,password_hash) VALUES(?,?,?,?,?,?)").run("א","id-a@example.com","0500000000","316250257","PICKER","x");expect(()=>db.prepare("INSERT INTO users(name,email,phone,national_id,role,password_hash) VALUES(?,?,?,?,?,?)").run("ב","id-b@example.com","0500000001","316250257","PICKER","x")).toThrow(/UNIQUE/);expect(()=>db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מורשת","legacy@example.com","0500000002","PICKER","x")).not.toThrow();});
  it("משדרג מסד גרסה 2 בלי לפגוע בקוטף קיים",()=>{const legacy=new Database(":memory:");try{legacy.exec("CREATE TABLE schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");for(const [version,file] of [[1,"migrations/001_initial.sql"],[2,"migrations/002_password_rotation.sql"]] as const){legacy.exec(fs.readFileSync(file,"utf8"));legacy.prepare("INSERT INTO schema_migrations(version) VALUES(?)").run(version);}legacy.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף ותיק","legacy-v2@example.com","0502223344","PICKER","x");migrate(legacy);expect(legacy.prepare("SELECT name,national_id FROM users WHERE email=?").get("legacy-v2@example.com")).toEqual({name:"קוטף ותיק",national_id:null});expect(legacy.prepare("SELECT 1 FROM schema_migrations WHERE version=3").get()).toEqual({1:1});}finally{legacy.close();}});
});

describe("ניהול וארכוב", () => {
  it("מנהל מעביר קוטף לארכיון, מבטל הפעלות ושומר אירוע ביקורת", () => {
    const x=setup(); db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(x.p1,"t","2099-01-01","c");
    new AdminService(db).setActive(x.admin,"USER",x.p1,false);
    expect(db.prepare("SELECT active FROM users WHERE id=?").get(x.p1)).toEqual({active:0});
    expect(db.prepare("SELECT count(*) count FROM sessions WHERE user_id=?").get(x.p1)).toEqual({count:0});
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='USER' AND entity_id=?").get(x.p1)).toEqual({action:"ARCHIVE"});
  });
  it("מונע ממנהל להעביר את עצמו לארכיון",()=>{const x=setup();expect(()=>new AdminService(db).setActive(x.admin,"USER",x.admin,false)).toThrow("עצמך");});
  it("מונע ארכוב משתמש או משאב המשובצים במשמרת תפעולית",()=>{const x=setup();const shift=Number(db.prepare("INSERT INTO shifts(date,slot,plantation_field_id,leader_id,created_by) VALUES(?,?,?,?,?)").run("2026-08-10","MORNING",x.field,x.p1,x.admin).lastInsertRowid);db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)").run(shift,"KG",1);db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?),(?,?)").run(shift,x.p1,shift,x.p2);db.prepare("INSERT INTO shift_vehicles(shift_id,vehicle_id) VALUES(?,?)").run(shift,x.vehicle);const service=new AdminService(db);for(const [entity,id] of [["USER",x.p1],["FARM",x.farm],["PLANTATION_FIELD",x.field],["VEHICLE",x.vehicle]] as const)expect(()=>service.setActive(x.admin,entity,id,false)).toThrow("משמרת פעילה");});
  it("שחזור משתמש מבטל הפעלות ודורש החלפת סיסמה",()=>{const x=setup();const service=new AdminService(db);service.setActive(x.admin,"USER",x.p1,false);db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(x.p1,"late","2099-01-01","c");service.setActive(x.admin,"USER",x.p1,true);expect(db.prepare("SELECT active,must_change_password FROM users WHERE id=?").get(x.p1)).toEqual({active:1,must_change_password:1});expect(db.prepare("SELECT count(*) count FROM sessions WHERE user_id=?").get(x.p1)).toEqual({count:0});});
  it("ארכוב משאב אינו מוחק היסטוריה",()=>{const x=setup();new AdminService(db).setActive(x.admin,"FARM",x.farm,false);expect(db.prepare("SELECT active FROM farms WHERE id=?").get(x.farm)).toEqual({active:0});expect(db.prepare("SELECT count(*) count FROM plantation_fields WHERE farm_id=?").get(x.farm)).toEqual({count:1});});
});

describe("איפוס סיסמה לקוטף",()=>{
  it("מנהל מאפס סיסמה לקוטף פעיל, מבטל הפעלות וכופה החלפה",async()=>{
    const x=setup();
    db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(x.p1,"t","2099-01-01","c");
    const before=(db.prepare("SELECT password_hash FROM users WHERE id=?").get(x.p1) as {password_hash:string}).password_hash;
    const password=await new AdminService(db).resetPickerPassword(x.admin,x.p1);
    expect(password.length).toBeGreaterThanOrEqual(8);
    const after=db.prepare("SELECT password_hash,must_change_password FROM users WHERE id=?").get(x.p1) as {password_hash:string;must_change_password:number};
    expect(after.password_hash).not.toBe(before);
    expect(after.must_change_password).toBe(1);
    expect(db.prepare("SELECT count(*) count FROM sessions WHERE user_id=?").get(x.p1)).toEqual({count:0});
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='USER' AND entity_id=? AND action='PASSWORD_RESET'").get(x.p1)).toEqual({action:"PASSWORD_RESET"});
  });
  it("דוחה איפוס עבור מנהל שאינו קוטף",async()=>{const x=setup();await expect(new AdminService(db).resetPickerPassword(x.admin,x.admin)).rejects.toThrow("קוטף פעיל");});
  it("דוחה איפוס עבור קוטף בארכיון",async()=>{const x=setup();new AdminService(db).setActive(x.admin,"USER",x.p1,false);await expect(new AdminService(db).resetPickerPassword(x.admin,x.p1)).rejects.toThrow("קוטף פעיל");});
  it("דוחה מזהה מזויף ומשתמש שאינו מנהל",async()=>{const x=setup();await expect(new AdminService(db).resetPickerPassword(x.admin,-1)).rejects.toThrow("מזהה אינו תקין");await expect(new AdminService(db).resetPickerPassword(x.p1,x.p2)).rejects.toThrow("אין הרשאה");});
});

describe("עריכת משמרת",()=>{
  it("מעדכן טיוטה ומונע התנגשות מול משמרת אחרת",()=>{const x=setup();const service=new SchedulingService(db);const first=service.createShift(x.admin,{date:"2026-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[x.vehicle],goals:[{unit:"KG",goal:10}],notes:""}).shiftId;expect(()=>service.updateShift(x.admin,first,{date:"2026-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1,x.p2],leaderId:x.p1,vehicleIds:[x.vehicle],goals:[{unit:"KG",goal:12}],notes:"עודכן"})).not.toThrow();expect(db.prepare("SELECT notes FROM shifts WHERE id=?").get(first)).toEqual({notes:"עודכן"});expect(db.prepare("SELECT unit,goal FROM shift_goals WHERE shift_id=?").all(first)).toEqual([{unit:"KG",goal:12}]);});
  it("עריכה חומרית של משמרת שפורסמה מודיעה לקוטפים המושפעים",()=>{const x=setup();for(const id of [x.p1,x.p2])db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(id,"2099-08-10","AVAILABLE");const scheduling=new SchedulingService(db);const shift=scheduling.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[],goals:[{unit:"KG",goal:10}],notes:""}).shiftId;db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(shift);scheduling.updateShift(x.admin,shift,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p2],leaderId:x.p2,vehicleIds:[],goals:[{unit:"KG",goal:20}],notes:"שינוי"});expect(db.prepare("SELECT count(*) count FROM notifications WHERE user_id IN (?,?)").get(x.p1,x.p2)).toEqual({count:2});});
  it("עריכת משמרת שפורסמה בעבר אינה מודיעה לקוטפים",()=>{const x=setup();const scheduling=new SchedulingService(db);const shift=scheduling.createShift(x.admin,{date:"2026-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[],goals:[{unit:"KG",goal:10}],notes:""}).shiftId;db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(shift);scheduling.updateShift(x.admin,shift,{date:"2026-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p2],leaderId:x.p2,vehicleIds:[],goals:[{unit:"KG",goal:20}],notes:"שינוי"});expect(db.prepare("SELECT count(*) count FROM notifications WHERE user_id IN (?,?)").get(x.p1,x.p2)).toEqual({count:0});});
});
