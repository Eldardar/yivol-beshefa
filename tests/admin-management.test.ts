import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
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
  const season = Number(db.prepare("INSERT INTO seasons(farm_id,crop,start_date,end_date) VALUES(?,?,?,?)").run(farm, "תות", "2026-08-01", "2026-09-01").lastInsertRowid);
  const vehicle = Number(db.prepare("INSERT INTO vehicles(number,name) VALUES(?,?)").run("1", "טנדר").lastInsertRowid);
  for (const id of [p1,p2]) db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(id,"2026-08-10","AVAILABLE");
  return { admin,p1,p2,farm,season,vehicle };
}

describe("ניהול וארכוב", () => {
  it("מנהל מעביר קוטף לארכיון, מבטל הפעלות ושומר אירוע ביקורת", () => {
    const x=setup(); db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(x.p1,"t","2099-01-01","c");
    new AdminService(db).setActive(x.admin,"USER",x.p1,false);
    expect(db.prepare("SELECT active FROM users WHERE id=?").get(x.p1)).toEqual({active:0});
    expect(db.prepare("SELECT count(*) count FROM sessions WHERE user_id=?").get(x.p1)).toEqual({count:0});
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='USER' AND entity_id=?").get(x.p1)).toEqual({action:"ARCHIVE"});
  });
  it("מונע ממנהל להעביר את עצמו לארכיון",()=>{const x=setup();expect(()=>new AdminService(db).setActive(x.admin,"USER",x.admin,false)).toThrow("עצמך");});
  it("מונע ארכוב משתמש או משאב המשובצים במשמרת תפעולית",()=>{const x=setup();const shift=Number(db.prepare("INSERT INTO shifts(date,slot,season_id,leader_id,goal,created_by) VALUES(?,?,?,?,?,?)").run("2026-08-10","MORNING",x.season,x.p1,1,x.admin).lastInsertRowid);db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?),(?,?)").run(shift,x.p1,shift,x.p2);db.prepare("INSERT INTO shift_vehicles(shift_id,vehicle_id) VALUES(?,?)").run(shift,x.vehicle);const service=new AdminService(db);for(const [entity,id] of [["USER",x.p1],["FARM",x.farm],["SEASON",x.season],["VEHICLE",x.vehicle]] as const)expect(()=>service.setActive(x.admin,entity,id,false)).toThrow("משמרת פעילה");});
  it("שחזור משתמש מבטל הפעלות ודורש החלפת סיסמה",()=>{const x=setup();const service=new AdminService(db);service.setActive(x.admin,"USER",x.p1,false);db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(x.p1,"late","2099-01-01","c");service.setActive(x.admin,"USER",x.p1,true);expect(db.prepare("SELECT active,must_change_password FROM users WHERE id=?").get(x.p1)).toEqual({active:1,must_change_password:1});expect(db.prepare("SELECT count(*) count FROM sessions WHERE user_id=?").get(x.p1)).toEqual({count:0});});
  it("ארכוב משאב אינו מוחק היסטוריה",()=>{const x=setup();new AdminService(db).setActive(x.admin,"FARM",x.farm,false);expect(db.prepare("SELECT active FROM farms WHERE id=?").get(x.farm)).toEqual({active:0});expect(db.prepare("SELECT count(*) count FROM seasons WHERE farm_id=?").get(x.farm)).toEqual({count:1});});
});

describe("עריכת משמרת",()=>{
  it("מעדכן טיוטה ומונע התנגשות מול משמרת אחרת",()=>{const x=setup();const service=new SchedulingService(db);const first=service.createShift(x.admin,{date:"2026-08-10",slot:"MORNING",seasonId:x.season,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[x.vehicle],goal:10,notes:""}).shiftId;expect(()=>service.updateShift(x.admin,first,{date:"2026-08-10",slot:"MORNING",seasonId:x.season,pickerIds:[x.p1,x.p2],leaderId:x.p1,vehicleIds:[x.vehicle],goal:12,notes:"עודכן"})).not.toThrow();expect(db.prepare("SELECT goal,notes FROM shifts WHERE id=?").get(first)).toEqual({goal:12,notes:"עודכן"});});
  it("עריכה חומרית של משמרת שפורסמה מודיעה לקוטפים המושפעים",()=>{const x=setup();const scheduling=new SchedulingService(db);const shift=scheduling.createShift(x.admin,{date:"2026-08-10",slot:"MORNING",seasonId:x.season,pickerIds:[x.p1],leaderId:x.p1,vehicleIds:[],goal:10,notes:""}).shiftId;db.prepare("UPDATE shifts SET status='PUBLISHED' WHERE id=?").run(shift);scheduling.updateShift(x.admin,shift,{date:"2026-08-10",slot:"MORNING",seasonId:x.season,pickerIds:[x.p2],leaderId:x.p2,vehicleIds:[],goal:20,notes:"שינוי"});expect(db.prepare("SELECT count(*) count FROM notifications WHERE user_id IN (?,?)").get(x.p1,x.p2)).toEqual({count:2});});
});
