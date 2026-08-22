import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db";
import { SchedulingService } from "@/lib/services/scheduling";
import type Database from "better-sqlite3";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const admin = db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,1)").run("מנהל", "a@example.com", "0500000000", "ADMIN", "x").lastInsertRowid;
  const p1 = db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,1)").run("קוטף א", "p1@example.com", "0500000001", "PICKER", "x").lastInsertRowid;
  const p2 = db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,1)").run("קוטף ב", "p2@example.com", "0500000002", "PICKER", "x").lastInsertRowid;
  const farm = db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid;
  const field = db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm,"תות","סטרולסה").lastInsertRowid;
  const vehicle = db.prepare("INSERT INTO vehicles(number,name) VALUES(?,?)").run("12","טנדר").lastInsertRowid;
  for (const p of [p1,p2]) db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(p,"2099-08-10","AVAILABLE");
  return {admin:Number(admin),p1:Number(p1),p2:Number(p2),field:Number(field),vehicle:Number(vehicle)};
}

describe("כללי שיבוץ", () => {
  it("דורש מוביל יחיד מתוך הקוטפים", () => {
    const x=setup(); const service=new SchedulingService(db);
    expect(() => service.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1,x.p2],leaderId:999,vehicleIds:[x.vehicle],goals:[{unit:"KG",goal:0}],notes:""})).toThrow("המוביל חייב להיות חלק מהצוות");
  });
  it("חוסם חסר זמינות ומאפשר אולי עם אזהרה", () => {
    const x=setup(); const service=new SchedulingService(db);
    db.prepare("DELETE FROM availability WHERE user_id=?").run(x.p2);
    expect(() => service.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1,x.p2],leaderId:x.p1,vehicleIds:[],goals:[{unit:"KG",goal:1}],notes:""})).toThrow("אינו זמין");
    db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(x.p2,"2099-08-10","MAYBE");
    expect(service.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1,x.p2],leaderId:x.p1,vehicleIds:[],goals:[{unit:"KG",goal:1}],notes:""}).warnings).toHaveLength(1);
  });
  it("מאפשר שיבוץ ללא זמינות במשמרת שכבר עברה",()=>{
    const x=setup(); const service=new SchedulingService(db);
    db.prepare("DELETE FROM availability WHERE user_id=?").run(x.p2);
    expect(service.createShift(x.admin,{date:"2000-01-01",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1,x.p2],leaderId:x.p2,vehicleIds:[],goals:[{unit:"KG",goal:1}],notes:""}).warnings).toHaveLength(0);
  });
  it("חוסם שיבוץ במשמרת של חלקת גידול שאינה פעילה",()=>{const x=setup();db.prepare("UPDATE plantation_fields SET active=0 WHERE id=?").run(x.field);expect(()=>new SchedulingService(db).createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[],goals:[{unit:"KG",goal:1}],notes:""})).toThrow("חלקת הגידול אינה פעילה");});
  it("חוסם שיבוץ כפול לקוטף ולרכב באותו מועד", () => {
    const x=setup(); const service=new SchedulingService(db);
    service.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[x.vehicle],goals:[{unit:"KG",goal:1}],notes:""});
    expect(() => service.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[],goals:[{unit:"KG",goal:1}],notes:""})).toThrow("שיבוץ כפול");
    expect(() => service.createShift(x.admin,{date:"2099-08-10",slot:"MORNING",plantationFieldId:x.field,pickerIds:[x.p2],leaderId:x.p2,vehicleIds:[x.vehicle],goals:[{unit:"KG",goal:1}],notes:""})).toThrow("רכב כבר משובץ");
  });
});
