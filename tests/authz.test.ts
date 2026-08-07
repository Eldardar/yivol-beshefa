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
 it("מגביל גם לפי חשבון ואינו מאפשר לכניסה מוצלחת לאפס מונה IP",async()=>{const {p1}=await users();const auth=new AuthService(db);for(let i=0;i<4;i++)await expect(auth.login(`none${i}@example.com`,`bad`,`7.7.7.7`)).rejects.toThrow();await expect(auth.login("one@example.com","Strong!Pass123","7.7.7.7")).resolves.toBeTruthy();await expect(auth.login("another@example.com","bad","7.7.7.7")).rejects.toThrow("פרטי");await expect(auth.login("last@example.com","bad","7.7.7.7")).rejects.toThrow("ניסיונות רבים");for(let i=0;i<5;i++)await expect(auth.login("target@example.com","bad",`8.8.8.${i}`)).rejects.toThrow();await expect(auth.login("target@example.com","bad","8.8.9.1")).rejects.toThrow("ניסיונות רבים");expect(p1).toBeGreaterThan(0);});
 it("שומר מקום לניסיונות מקבילים לפני חישוב scrypt",async()=>{const results=await Promise.all(Array.from({length:10},()=>new AuthService(db).login("burst@example.com","bad","203.0.113.77").then(()=>"ok",e=>String((e as Error).message))));expect(results.filter(x=>x.includes("ניסיונות רבים"))).toHaveLength(5);expect(results.filter(x=>x.includes("פרטי ההתחברות"))).toHaveLength(5);});
 it("כשלונות בחשבונות נפרדים אינם נועלים את כל המערכת",async()=>{await users();const auth=new AuthService(db);for(let i=0;i<100;i++)await expect(auth.login(`spray-${i}@example.com`,"")).rejects.toThrow("פרטי ההתחברות");await expect(auth.login("one@example.com","Strong!Pass123")).resolves.toBeTruthy();});
 it("כופה סיסמה חדשה השונה מהזמנית ומבטל את כל ההפעלות",async()=>{const {p1}=await users();db.prepare("UPDATE users SET must_change_password=1 WHERE id=?").run(p1);const auth=new AuthService(db),session=await auth.login("one@example.com","Strong!Pass123","10.0.0.1");expect(session.user.mustChangePassword).toBe(true);await expect(auth.changePassword(p1,"Strong!Pass123")).rejects.toThrow("שונה");expect(db.prepare("SELECT must_change_password FROM users WHERE id=?").get(p1)).toEqual({must_change_password:1});expect(auth.authenticate(session.token)).toBeTruthy();await auth.changePassword(p1,"NewStrong!Pass456");expect(auth.authenticate(session.token)).toBeUndefined();await expect(auth.login("one@example.com","NewStrong!Pass456","10.0.0.2")).resolves.toBeTruthy();});
 it("איפוס סיסמה: מנפיק אסימון רק למשתמש פעיל קיים ומגביל ניסיונות",async()=>{
  const {p1}=await users();const auth=new AuthService(db);
  const result=await auth.requestPasswordReset("one@example.com","1.2.3.4");
  expect(result?.userId).toBe(p1);
  const row=db.prepare("SELECT token_hash FROM password_reset_tokens WHERE user_id=?").get(p1) as {token_hash:string};
  expect(row.token_hash).not.toBe(result!.token);
  expect(await auth.requestPasswordReset("missing@example.com","1.2.3.4")).toBeUndefined();
  for(let i=0;i<5;i++)await auth.requestPasswordReset(`spray-${i}@example.com`,"9.9.9.9");
  await expect(auth.requestPasswordReset("one@example.com","9.9.9.9")).rejects.toThrow("ניסיונות רבים");
 });
 it("איפוס סיסמה: מחליף סיסמה פעם אחת בלבד ומבטל הפעלות",async()=>{
  const {p1}=await users();const auth=new AuthService(db);
  const session=await auth.login("one@example.com","Strong!Pass123","10.0.0.1");
  const {token}=(await auth.requestPasswordReset("one@example.com"))!;
  await auth.resetPasswordWithToken(token,"NewStrong!Pass456");
  expect(auth.authenticate(session.token)).toBeUndefined();
  await expect(auth.login("one@example.com","NewStrong!Pass456","10.0.0.2")).resolves.toBeTruthy();
  await expect(auth.resetPasswordWithToken(token,"AnotherStrong!789")).rejects.toThrow("אינו תקין");
  await expect(auth.resetPasswordWithToken("bad-token","AnotherStrong!789")).rejects.toThrow("אינו תקין");
  expect(p1).toBeGreaterThan(0);
 });
 it("החלפת סיסמה עצמאית: דורשת סיסמה נוכחית נכונה ושונה מהחדשה",async()=>{
  const {p1}=await users();const auth=new AuthService(db);
  const session=await auth.login("one@example.com","Strong!Pass123","10.0.0.3");
  await expect(auth.changePasswordSelf(p1,"wrong","NewStrong!Pass456")).rejects.toThrow("שגויה");
  await expect(auth.changePasswordSelf(p1,"Strong!Pass123","Strong!Pass123")).rejects.toThrow("שונה");
  await auth.changePasswordSelf(p1,"Strong!Pass123","NewStrong!Pass456");
  expect(auth.authenticate(session.token)).toBeUndefined();
  await expect(auth.login("one@example.com","NewStrong!Pass456","10.0.0.4")).resolves.toBeTruthy();
 });
 it("מונע IDOR בפרופיל ובהודעות",async()=>{const {p1,p2}=await users();const notificationId=Number(db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)").run(p2,"סודי","תוכן").lastInsertRowid);const p=new PickerService(db);expect(()=>p.profile(p1,p2)).toThrow("אין הרשאה");expect(p.notifications(p1).some(x=>x.title==="סודי")).toBe(false);expect(()=>p.markRead(p1,notificationId)).toThrow("לא נמצאה");expect(()=>p.markRead(p2,notificationId)).not.toThrow();});
 it("מקבל זמינות רק בטווח 60 הימים הקרובים בירושלים, כולל חסימת היום",async()=>{
  const {p1}=await users();const p=new PickerService(db);const now=new Date("2026-07-15T12:00:00Z");
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-07-14",status:"AVAILABLE"}]},now)).toThrow("60");
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-07-15",status:"AVAILABLE"}]},now)).toThrow("60");
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-09-14",status:"AVAILABLE"}]},now)).toThrow("60");
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-07-16",status:"AVAILABLE"}]},now)).not.toThrow();
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-09-13",status:"AVAILABLE"}]},now)).not.toThrow();
 });
 it("שומר קבוצת ימים באופן אטומי ומחליף רק תאריכים שנשלחו",async()=>{
  const {p1}=await users();const p=new PickerService(db);const now=new Date("2026-07-15T12:00:00Z");
  db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(p1,"2026-08-05","AVAILABLE");
  p.setAvailability(p1,{entries:[{date:"2026-08-01",status:"AVAILABLE"},{date:"2026-08-02",status:"MAYBE"},{date:"2026-08-03",status:"UNAVAILABLE"}]},now);
  expect(db.prepare("SELECT date,status FROM availability WHERE user_id=? ORDER BY date").all(p1)).toEqual([
   {date:"2026-08-01",status:"AVAILABLE"},{date:"2026-08-02",status:"MAYBE"},{date:"2026-08-03",status:"UNAVAILABLE"},{date:"2026-08-05",status:"AVAILABLE"}
  ]);
 });
 it("דוחה תאריך כפול באותה בקשה ואינו כותב דבר",async()=>{
  const {p1}=await users();const p=new PickerService(db);const now=new Date("2026-07-15T12:00:00Z");
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-08-01",status:"AVAILABLE"},{date:"2026-08-01",status:"MAYBE"}]},now)).toThrow("תאריך כפול");
  expect(db.prepare("SELECT count(*) count FROM availability WHERE user_id=?").get(p1)).toEqual({count:0});
 });
 it("דוחה קבוצה עם תאריך מחוץ לטווח 60 הימים ואינו מיישם חלקית",async()=>{
  const {p1}=await users();const p=new PickerService(db);const now=new Date("2026-07-15T12:00:00Z");
  expect(()=>p.setAvailability(p1,{entries:[{date:"2026-08-01",status:"AVAILABLE"},{date:"2026-09-14",status:"AVAILABLE"}]},now)).toThrow("60");
  expect(db.prepare("SELECT count(*) count FROM availability WHERE user_id=?").get(p1)).toEqual({count:0});
 });
 it("שליחת סטטוס ריק מוחקת רשומת זמינות קיימת",async()=>{
  const {p1}=await users();const p=new PickerService(db);const now=new Date("2026-07-15T12:00:00Z");
  p.setAvailability(p1,{entries:[{date:"2026-08-01",status:"AVAILABLE"},{date:"2026-08-02",status:"MAYBE"}]},now);
  p.setAvailability(p1,{entries:[{date:"2026-08-01",status:null}]},now);
  expect(db.prepare("SELECT date,status FROM availability WHERE user_id=? ORDER BY date").all(p1)).toEqual([{date:"2026-08-02",status:"MAYBE"}]);
 });
 it("שינוי זמינות אינו משנה שיבוץ קיים",async()=>{
  const {p1}=await users();
  const admin=Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל","admin2@example.com","0500000009","ADMIN","x").lastInsertRowid);
  const farm=Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק","איש","0500000003","כתובת").lastInsertRowid);
  const season=Number(db.prepare("INSERT INTO seasons(farm_id,crop,start_date,end_date) VALUES(?,?,?,?)").run(farm,"תות","2026-08-01","2026-08-31").lastInsertRowid);
  db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(p1,"2026-08-01","AVAILABLE");
  const shift=Number(db.prepare("INSERT INTO shifts(date,slot,season_id,leader_id,created_by) VALUES(?,?,?,?,?)").run("2026-08-01","MORNING",season,p1,admin).lastInsertRowid);
  db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)").run(shift,"KG",1);
  db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)").run(shift,p1);
  new PickerService(db).setAvailability(p1,{entries:[{date:"2026-08-01",status:"UNAVAILABLE"}]},new Date("2026-07-15T12:00:00Z"));
  expect(db.prepare("SELECT status FROM availability WHERE user_id=? AND date=?").get(p1,"2026-08-01")).toEqual({status:"UNAVAILABLE"});
  expect(db.prepare("SELECT count(*) count FROM shift_pickers WHERE shift_id=? AND user_id=?").get(shift,p1)).toEqual({count:1});
 });
});
