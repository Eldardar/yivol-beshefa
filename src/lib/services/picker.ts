import type Database from "better-sqlite3";
import { availabilityMonthSchema, personalDetailsSchema } from "@/lib/schemas";
import { availabilityWindow } from "@/lib/dates";

type Notification={id:number;title:string;body:string;read_at:string|null;created_at:string};
export class PickerService{
 constructor(private readonly db:Database.Database){}
 profile(actorId:number,targetId:number){
  const actor=this.db.prepare("SELECT role FROM users WHERE id=? AND active=1").get(actorId) as {role:string}|undefined;
  if(!actor || (actor.role!=="ADMIN" && actorId!==targetId)) throw new Error("אין הרשאה");
  const profile=this.db.prepare("SELECT id,name,email,phone,notes,active FROM users WHERE id=? AND role='PICKER'").get(targetId);
  if(!profile) throw new Error("הקוטף לא נמצא"); return profile;
 }
 personalDetails(actorId:number){
  return this.db.prepare("SELECT date_of_birth AS dateOfBirth, favorite_fruit AS favoriteFruit FROM users WHERE id=?").get(actorId) as {dateOfBirth:string|null;favoriteFruit:string}|undefined;
 }
 updatePersonalDetails(actorId:number,raw:unknown):void{
  const input=personalDetailsSchema.parse(raw);
  const result=this.db.prepare("UPDATE users SET date_of_birth=?,favorite_fruit=? WHERE id=? AND active=1").run(input.dateOfBirth||null,input.favoriteFruit,actorId);
  if(result.changes!==1)throw new Error("המשתמש לא נמצא");
 }
 notifications(actorId:number):Notification[]{return this.db.prepare("SELECT id,title,body,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC").all(actorId) as Notification[];}
 unreadCount(actorId:number):number{return (this.db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id=? AND read_at IS NULL").get(actorId) as {n:number}).n;}
 markRead(actorId:number,notificationId:number):void{
  const result=this.db.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?").run(notificationId,actorId);
  if(result.changes!==1)throw new Error("ההודעה לא נמצאה");
 }
 markAllRead(actorId:number):void{
  this.db.prepare("UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE user_id=? AND read_at IS NULL").run(actorId);
 }
 setAvailability(actorId:number,raw:unknown,now=new Date()){
  const input=availabilityMonthSchema.parse(raw); const user=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
  if(!user?.active || user.role!=="PICKER") throw new Error("אין הרשאה");
  const window=availabilityWindow(now);
  const seen=new Set<string>();
  for(const entry of input.entries){
   if(seen.has(entry.date)) throw new Error("תאריך כפול בבקשה");
   seen.add(entry.date);
   if(entry.date<window.start || entry.date>=window.end) throw new Error("ניתן לעדכן זמינות רק ל-60 הימים הקרובים");
  }
  this.db.transaction(()=>{
   const upsert=this.db.prepare(`INSERT INTO availability(user_id,date,status) VALUES(?,?,?)
     ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status`);
   const clear=this.db.prepare("DELETE FROM availability WHERE user_id=? AND date=?");
   for(const entry of input.entries){if(entry.status===null)clear.run(actorId,entry.date);else upsert.run(actorId,entry.date,entry.status);}
  }).immediate();
 }
}
