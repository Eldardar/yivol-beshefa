import type Database from "better-sqlite3";
import { availabilityMonthSchema, bankDetailsSchema, housingMonthSchema, journalEntrySchema, personalDetailsSchema } from "@/lib/schemas";
import { findBank, findBranch } from "@/lib/israeli-banks";
import { availabilityWindow, housingEditable } from "@/lib/dates";

type Notification={id:number;title:string;body:string;read_at:string|null;created_at:string};
export type BankDetails={accountHolder:string;bankNumber:string;bankName:string;branchNumber:string;branchName:string;accountNumber:string};
type JournalEntry={id:number;message:string;created_at:string};
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
 bankDetails(actorId:number){
  return this.db.prepare("SELECT bank_account_holder AS accountHolder, bank_number AS bankNumber, bank_name AS bankName, bank_branch_number AS branchNumber, bank_branch_name AS branchName, bank_account_number AS accountNumber FROM users WHERE id=?").get(actorId) as BankDetails|undefined;
 }
 updateBankDetails(actorId:number,raw:unknown):void{
  const input=bankDetailsSchema.parse(raw);
  // Known banks/branches get their official names; unknown numbers keep whatever the worker typed.
  const bankName=findBank(input.bankNumber)?.name??(input.bankNumber?input.bankName:"");
  const branch=findBranch(input.bankNumber,input.branchNumber);
  const branchName=branch?[...new Set([branch.name,branch.city].filter(Boolean))].join(", "):(input.branchNumber?input.branchName:"");
  const result=this.db.prepare("UPDATE users SET bank_account_holder=?,bank_number=?,bank_name=?,bank_branch_number=?,bank_branch_name=?,bank_account_number=? WHERE id=? AND active=1").run(input.accountHolder,input.bankNumber,bankName,input.branchNumber,branchName,input.accountNumber,actorId);
  if(result.changes!==1)throw new Error("המשתמש לא נמצא");
  this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,"UPDATE_BANK_DETAILS","USER",actorId);
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
 setHousingStatus(actorId:number,raw:unknown,now=new Date()){
  const input=housingMonthSchema.parse(raw); const user=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
  if(!user?.active || user.role!=="PICKER") throw new Error("אין הרשאה");
  const seen=new Set<string>();
  for(const entry of input.entries){
   if(seen.has(entry.date)) throw new Error("תאריך כפול בבקשה");
   seen.add(entry.date);
   if(!housingEditable(entry.date,now)) throw new Error("ניתן לעדכן את סידור השינה של היום הנוכחי עד השעה 18:00 בלבד");
  }
  this.db.transaction(()=>{
   const upsert=this.db.prepare(`INSERT INTO housing_status(user_id,date,status) VALUES(?,?,?)
     ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status`);
   const clear=this.db.prepare("DELETE FROM housing_status WHERE user_id=? AND date=?");
   for(const entry of input.entries){if(entry.status===null)clear.run(actorId,entry.date);else upsert.run(actorId,entry.date,entry.status);}
  }).immediate();
 }
 addJournalEntry(actorId:number,raw:unknown):void{
  const input=journalEntrySchema.parse(raw);
  this.db.prepare("INSERT INTO journal_entries(user_id,message) VALUES(?,?)").run(actorId,input.message);
 }
 journalEntries(actorId:number):JournalEntry[]{
  return this.db.prepare("SELECT id,message,created_at FROM journal_entries WHERE user_id=? ORDER BY created_at DESC").all(actorId) as JournalEntry[];
 }
}
