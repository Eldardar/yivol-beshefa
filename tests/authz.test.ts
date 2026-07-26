import { beforeEach,afterEach,describe,expect,it,vi } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AuthService } from "@/lib/services/auth";
import { PickerService } from "@/lib/services/picker";
import { hashPassword } from "@/lib/security";
let db:Database.Database;
beforeEach(()=>{db=createTestDb();}); afterEach(()=>db.close());
async function users(){const h=await hashPassword("Strong!Pass123");const p1=Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("א","one@example.com","0500000000","PICKER",h).lastInsertRowid);const p2=Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("ב","two@example.com","0500000001","PICKER",h).lastInsertRowid);return {p1,p2};}
describe("הרשאות והפעלות",()=>{
 it("שגיאת כניסה כללית וזהה",async()=>{await users();const a=new AuthService(db);await expect(a.login("none@example.com","wrong","1.2.3.4")).rejects.toThrow("פרטי ההתחברות שגויים");await expect(a.login("one@example.com","wrong","1.2.3.5")).rejects.toThrow("פרטי ההתחברות שגויים");});
 it("שומר רק גיבוב אסימון ומאמת CSRF",async()=>{await users();const a=new AuthService(db);const s=await a.login("one@example.com","Strong!Pass123","1.2.3.6");const row=db.prepare("SELECT token_hash,csrf_hash FROM sessions").get() as {token_hash:string;csrf_hash:string};expect(row.token_hash).not.toBe(s.token);expect(a.authenticate(s.token)?.email).toBe("one@example.com");expect(()=>a.assertCsrf(s.token,"bad")).toThrow("בקשה לא תקינה");expect(()=>a.assertCsrf(s.token,s.csrf)).not.toThrow();});
 it("מגביל ניסיונות כניסה גם בין מופעי שירות באותו תהליך",async()=>{vi.useFakeTimers();for(let i=0;i<5;i++)await expect(new AuthService(db).login("x@y.co","bad","9.9.9.9")).rejects.toThrow();await expect(new AuthService(db).login("x@y.co","bad","9.9.9.9")).rejects.toThrow("ניסיונות רבים");vi.useRealTimers();});
 it("מונע IDOR בפרופיל ובהודעות",async()=>{const {p1,p2}=await users();const notificationId=Number(db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)").run(p2,"סודי","תוכן").lastInsertRowid);const p=new PickerService(db);expect(()=>p.profile(p1,p2)).toThrow("אין הרשאה");expect(p.notifications(p1).some(x=>x.title==="סודי")).toBe(false);expect(()=>p.markRead(p1,notificationId)).toThrow("לא נמצאה");expect(()=>p.markRead(p2,notificationId)).not.toThrow();});
 it("מקבל זמינות רק בחודש הבא בירושלים",async()=>{const {p1}=await users();const p=new PickerService(db);expect(()=>p.setAvailability(p1,{date:"2026-09-01",status:"AVAILABLE"},new Date("2026-07-15T12:00:00Z"))).toThrow("החודש הבא");expect(()=>p.setAvailability(p1,{date:"2026-08-01",status:"AVAILABLE"},new Date("2026-07-15T12:00:00Z"))).not.toThrow();});
});
