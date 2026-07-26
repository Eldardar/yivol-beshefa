import type Database from "better-sqlite3";
import { availabilitySchema } from "@/lib/schemas";

type Notification={id:number;title:string;body:string;read_at:string|null;created_at:string};
function monthInJerusalem(date:Date):{year:number;month:number}{
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Jerusalem",year:"numeric",month:"numeric"}).formatToParts(date);
 return {year:Number(parts.find(p=>p.type==="year")?.value),month:Number(parts.find(p=>p.type==="month")?.value)};
}
export class PickerService{
 constructor(private readonly db:Database.Database){}
 profile(actorId:number,targetId:number){
  const actor=this.db.prepare("SELECT role FROM users WHERE id=? AND active=1").get(actorId) as {role:string}|undefined;
  if(!actor || (actor.role!=="ADMIN" && actorId!==targetId)) throw new Error("אין הרשאה");
  const profile=this.db.prepare("SELECT id,name,email,phone,notes,active FROM users WHERE id=? AND role='PICKER'").get(targetId);
  if(!profile) throw new Error("הקוטף לא נמצא"); return profile;
 }
 notifications(actorId:number):Notification[]{return this.db.prepare("SELECT id,title,body,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC").all(actorId) as Notification[];}
 markRead(actorId:number,notificationId:number):void{
  const result=this.db.prepare("UPDATE notifications SET read_at=COALESCE(read_at,CURRENT_TIMESTAMP) WHERE id=? AND user_id=?").run(notificationId,actorId);
  if(result.changes!==1)throw new Error("ההודעה לא נמצאה");
 }
 setAvailability(actorId:number,raw:unknown,now=new Date()){
  const input=availabilitySchema.parse(raw); const user=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
  if(!user?.active || user.role!=="PICKER") throw new Error("אין הרשאה");
  const current=monthInJerusalem(now); const next=current.month===12?{year:current.year+1,month:1}:{year:current.year,month:current.month+1};
  const [year,month]=input.date.split("-").map(Number);
  if(year!==next.year || month!==next.month) throw new Error("ניתן לעדכן רק את החודש הבא");
  this.db.prepare(`INSERT INTO availability(user_id,date,status) VALUES(?,?,?)
    ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status`).run(actorId,input.date,input.status);
 }
}
