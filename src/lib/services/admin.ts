import type Database from "better-sqlite3";
import { generatePassword, hashPassword } from "@/lib/security";
import { adminAvailabilityUpdateSchema, adminGoalSchema, adminHousingUpdateSchema, broadcastNotificationSchema, fieldUnitRatesSchema, notificationTargetSchema } from "@/lib/schemas";
import { pushToUsers } from "@/lib/push";
import { jerusalemInstant } from "@/lib/dates";
import type { Unit } from "@/lib/units";
import { parseTiers, type PriceTier } from "@/lib/pricing";
import fs from "node:fs";
import { AvatarService } from "@/lib/services/avatars";

export type AdminGoal = { startDate: string; endDate: string; goals: Array<{ unit: Unit; goal: number }> };
export type ManagedEntity = "USER" | "FARM" | "PLANTATION_FIELD" | "VEHICLE" | "VILLAGE";
const tables: Record<ManagedEntity,string> = { USER:"users", FARM:"farms", PLANTATION_FIELD:"plantation_fields", VEHICLE:"vehicles", VILLAGE:"villages" };

export class AdminService {
  constructor(private readonly db: Database.Database) {}

  setActive(actorId:number, entity:ManagedEntity, entityId:number, active:boolean):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    if(!Number.isSafeInteger(entityId)||entityId<1) throw new Error("מזהה אינו תקין");
    if(entity==="USER" && actorId===entityId && !active) throw new Error("לא ניתן להעביר את עצמך לארכיון");
    const table=tables[entity];
    this.db.transaction(()=>{
      if(!active&&entity!=="VILLAGE"){
        const operational=entity==="USER"
          ?this.db.prepare(`SELECT 1 FROM shifts s LEFT JOIN shift_pickers sp ON sp.shift_id=s.id WHERE s.status IN ('DRAFT','PUBLISHED') AND (s.leader_id=? OR sp.user_id=?) LIMIT 1`).get(entityId,entityId)
          :entity==="FARM"
            ?this.db.prepare(`SELECT 1 FROM shifts s JOIN plantation_fields pf ON pf.id=s.plantation_field_id WHERE s.status IN ('DRAFT','PUBLISHED') AND pf.farm_id=? LIMIT 1`).get(entityId)
            :entity==="PLANTATION_FIELD"
              ?this.db.prepare(`SELECT 1 FROM shifts WHERE status IN ('DRAFT','PUBLISHED') AND plantation_field_id=? LIMIT 1`).get(entityId)
              :this.db.prepare(`SELECT 1 FROM shifts s JOIN shift_vehicles sv ON sv.shift_id=s.id WHERE s.status IN ('DRAFT','PUBLISHED') AND sv.vehicle_id=? LIMIT 1`).get(entityId);
        if(operational)throw new Error("לא ניתן להעביר לארכיון משאב המשובץ במשמרת פעילה");
      }
      const result=this.db.prepare(`UPDATE ${table} SET active=? WHERE id=?`).run(active?1:0,entityId);
      if(result.changes!==1) throw new Error("הרשומה לא נמצאה");
      if(entity==="USER"){
        this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(entityId);
        if(active)this.db.prepare("UPDATE users SET must_change_password=1 WHERE id=?").run(entityId);
      }
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,active?"RESTORE":"ARCHIVE",entity,entityId,JSON.stringify({active}));
    }).immediate();
  }

  deleteEntity(actorId:number, entity:ManagedEntity, entityId:number):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    if(!Number.isSafeInteger(entityId)||entityId<1) throw new Error("מזהה אינו תקין");
    if(entity==="USER" && actorId===entityId) throw new Error("לא ניתן למחוק את עצמך");
    const table=tables[entity];
    const avatar=entity==="USER"?new AvatarService(this.db).getImage(entityId)?.path:undefined;
    this.db.transaction(()=>{
      const row=this.db.prepare(`SELECT active FROM ${table} WHERE id=?`).get(entityId) as {active:number}|undefined;
      if(!row) throw new Error("הרשומה לא נמצאה");
      if(row.active) throw new Error("ניתן למחוק רק רשומות בארכיון");
      if(entity==="USER"){
        for(const t of ["sessions","availability","notifications","password_reset_tokens","push_subscriptions","journal_entries","shift_report_reminders","scheduled_notification_recipients","admin_goals"]){
          this.db.prepare(`DELETE FROM ${t} WHERE user_id=?`).run(entityId);
        }
      }
      let result;
      try{
        result=this.db.prepare(`DELETE FROM ${table} WHERE id=?`).run(entityId);
      }catch(error){
        if((error as {code?:string}).code==="SQLITE_CONSTRAINT_FOREIGNKEY") throw new Error("לא ניתן למחוק — קיימת היסטוריה המשויכת לרשומה זו. ניתן להשאיר בארכיון");
        throw error;
      }
      if(result.changes!==1) throw new Error("הרשומה לא נמצאה");
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,"DELETE",entity,entityId);
    }).immediate();
    if(avatar) fs.rmSync(avatar,{force:true});
  }

  async resetPickerPassword(actorId:number, targetId:number):Promise<string> {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    if(!Number.isSafeInteger(targetId)||targetId<1) throw new Error("מזהה אינו תקין");
    const target=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(targetId) as {role:string;active:number}|undefined;
    if(!target || target.role!=="PICKER" || !target.active) throw new Error("ניתן לאפס סיסמה רק לחשבון קוטף פעיל");
    const password=generatePassword();
    const hash=await hashPassword(password);
    this.db.transaction(()=>{
      const result=this.db.prepare("UPDATE users SET password_hash=?,must_change_password=1 WHERE id=? AND role='PICKER' AND active=1").run(hash,targetId);
      if(result.changes!==1) throw new Error("ניתן לאפס סיסמה רק לחשבון קוטף פעיל");
      this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(targetId);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,"PASSWORD_RESET","USER",targetId);
    }).immediate();
    return password;
  }

  async setWorkerAvailability(actorId:number, raw:unknown, window:{start:string;end:string}):Promise<void> {
    const input=adminAvailabilityUpdateSchema.parse(raw);
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    const target=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(input.userId) as {role:string;active:number}|undefined;
    if(!target?.active || target.role!=="PICKER") throw new Error("עובד לא נמצא");
    const seen=new Set<string>();
    for(const entry of input.entries){
      if(seen.has(entry.date)) throw new Error("תאריך כפול בבקשה");
      seen.add(entry.date);
      if(entry.date<window.start || entry.date>=window.end) throw new Error("ניתן לעדכן זמינות רק לטווח המוצג");
    }
    const title="עדכון זמינות";
    const body="מנהל/ת עדכן/ה את הזמינות שלך. אפשר לבדוק ולערוך בעמוד \"הזמינות שלי\".";
    this.db.transaction(()=>{
      const upsert=this.db.prepare(`INSERT INTO availability(user_id,date,status) VALUES(?,?,?)
        ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status`);
      const clear=this.db.prepare("DELETE FROM availability WHERE user_id=? AND date=?");
      for(const entry of input.entries){if(entry.status===null)clear.run(input.userId,entry.date);else upsert.run(input.userId,entry.date,entry.status);}
      this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)").run(input.userId,title,body);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"UPDATE","AVAILABILITY",input.userId,JSON.stringify({dates:input.entries.map(e=>e.date)}));
    }).immediate();
    await pushToUsers(this.db,[{userId:input.userId,title,body}]);
  }

  goal(userId:number):AdminGoal|null {
    const rows=this.db.prepare("SELECT unit,goal,start_date,end_date FROM admin_goals WHERE user_id=?").all(userId) as Array<{unit:Unit;goal:number;start_date:string;end_date:string}>;
    if(!rows.length)return null;
    return {startDate:rows[0]!.start_date,endDate:rows[0]!.end_date,goals:rows.map(r=>({unit:r.unit,goal:r.goal}))};
  }

  setGoal(actorId:number, raw:unknown):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    const input=adminGoalSchema.parse(raw);
    this.db.transaction(()=>{
      this.db.prepare("DELETE FROM admin_goals WHERE user_id=?").run(actorId);
      const add=this.db.prepare("INSERT INTO admin_goals(user_id,unit,goal,start_date,end_date) VALUES(?,?,?,?,?)");
      for(const g of input.goals)add.run(actorId,g.unit,g.goal,input.startDate,input.endDate);
    }).immediate();
  }

  clearGoal(actorId:number):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    this.db.prepare("DELETE FROM admin_goals WHERE user_id=?").run(actorId);
  }

  async setWorkerHousing(actorId:number, raw:unknown):Promise<void> {
    const input=adminHousingUpdateSchema.parse(raw);
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    const target=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(input.userId) as {role:string;active:number}|undefined;
    if(!target?.active || target.role!=="PICKER") throw new Error("עובד לא נמצא");
    const seen=new Set<string>();
    for(const entry of input.entries){
      if(seen.has(entry.date)) throw new Error("תאריך כפול בבקשה");
      seen.add(entry.date);
    }
    const title="עדכון סידור שינה";
    const body="מנהל/ת עדכן/ה את סידור השינה שלך. אפשר לבדוק ולערוך בעמוד \"מגורים\".";
    this.db.transaction(()=>{
      const bookable=this.db.prepare(`SELECT 1 FROM village_sleeping_options o JOIN villages v ON v.id=o.village_id
        JOIN village_available_months m ON m.village_id=v.id WHERE o.id=? AND v.active=1 AND m.month=?`);
      // Without sleepingOptionId the worker's existing booking is kept (cleared for AWAY).
      const keepOption=this.db.prepare(`INSERT INTO housing_status(user_id,date,status) VALUES(?,?,?)
        ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status,sleeping_option_id=CASE WHEN excluded.status='AWAY' THEN NULL ELSE housing_status.sleeping_option_id END`);
      const setOption=this.db.prepare(`INSERT INTO housing_status(user_id,date,status,sleeping_option_id) VALUES(?,?,?,?)
        ON CONFLICT(user_id,date) DO UPDATE SET status=excluded.status,sleeping_option_id=excluded.sleeping_option_id`);
      const clear=this.db.prepare("DELETE FROM housing_status WHERE user_id=? AND date=?");
      for(const entry of input.entries){
        if(entry.status===null){clear.run(input.userId,entry.date);continue;}
        if(entry.sleepingOptionId===undefined){keepOption.run(input.userId,entry.date,entry.status);continue;}
        const optionId=entry.status==="AWAY"?null:entry.sleepingOptionId;
        if(optionId!==null&&!bookable.get(optionId,Number(entry.date.slice(5,7)))) throw new Error("אפשרות הלינה אינה זמינה בחודש זה");
        setOption.run(input.userId,entry.date,entry.status,optionId);
      }
      this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)").run(input.userId,title,body);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"UPDATE","HOUSING",input.userId,JSON.stringify({dates:input.entries.map(e=>e.date)}));
    }).immediate();
    await pushToUsers(this.db,[{userId:input.userId,title,body}]);
  }

  async broadcastNotification(actorId:number, raw:unknown):Promise<number> {
    const input=broadcastNotificationSchema.parse(raw);
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    const workers=this.db.prepare("SELECT id FROM users WHERE role='PICKER' AND active=1").all() as Array<{id:number}>;
    if(workers.length===0) throw new Error("אין עובדים פעילים לשליחה");
    this.db.transaction(()=>{
      const notify=this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
      for(const w of workers) notify.run(w.id,input.title,input.body);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"BROADCAST","NOTIFICATION",actorId,JSON.stringify({title:input.title,recipients:workers.length}));
    }).immediate();
    await pushToUsers(this.db,workers.map(w=>({userId:w.id,title:input.title,body:input.body})));
    return workers.length;
  }

  async sendOrScheduleNotification(actorId:number, raw:unknown):Promise<{sent:number}|{scheduled:true}> {
    const input=notificationTargetSchema.parse(raw);
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    const placeholders=input.userIds.map(()=>"?").join(",");
    const recipients=this.db.prepare(`SELECT id FROM users WHERE active=1 AND id IN (${placeholders})`).all(...input.userIds) as Array<{id:number}>;
    if(recipients.length===0) throw new Error("לא נבחרו נמענים פעילים");

    if(!input.sendAt){
      this.db.transaction(()=>{
        const notify=this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
        for(const r of recipients) notify.run(r.id,input.title,input.body);
        this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"BROADCAST","NOTIFICATION",actorId,JSON.stringify({title:input.title,recipients:recipients.length}));
      }).immediate();
      await pushToUsers(this.db,recipients.map(r=>({userId:r.id,title:input.title,body:input.body})));
      return {sent:recipients.length};
    }

    const sendDate=input.sendAt.slice(0,10),sendTime=input.sendAt.slice(11,16);
    if(jerusalemInstant(sendDate,sendTime).getTime()<=Date.now()) throw new Error("מועד השליחה חייב להיות בעתיד");
    this.db.transaction(()=>{
      const result=this.db.prepare("INSERT INTO scheduled_notifications(title,body,send_at,created_by) VALUES(?,?,?,?)").run(input.title,input.body,input.sendAt,actorId);
      const scheduledId=Number(result.lastInsertRowid);
      const addRecipient=this.db.prepare("INSERT INTO scheduled_notification_recipients(scheduled_notification_id,user_id) VALUES(?,?)");
      for(const r of recipients) addRecipient.run(scheduledId,r.id);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"SCHEDULE","NOTIFICATION",scheduledId,JSON.stringify({title:input.title,recipients:recipients.length,sendAt:input.sendAt}));
    }).immediate();
    return {scheduled:true};
  }

  listScheduledNotifications():Array<{id:number;title:string;body:string;sendAt:string;recipientCount:number}> {
    return this.db.prepare(`
      SELECT sn.id,sn.title,sn.body,sn.send_at sendAt,COUNT(r.user_id) recipientCount
      FROM scheduled_notifications sn
      LEFT JOIN scheduled_notification_recipients r ON r.scheduled_notification_id=sn.id
      WHERE sn.sent_at IS NULL AND sn.cancelled_at IS NULL
      GROUP BY sn.id
      ORDER BY sn.send_at
    `).all() as Array<{id:number;title:string;body:string;sendAt:string;recipientCount:number}>;
  }

  cancelScheduledNotification(actorId:number, id:number):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    if(!Number.isSafeInteger(id)||id<1) throw new Error("מזהה אינו תקין");
    this.db.transaction(()=>{
      const result=this.db.prepare("UPDATE scheduled_notifications SET cancelled_at=CURRENT_TIMESTAMP WHERE id=? AND sent_at IS NULL AND cancelled_at IS NULL").run(id);
      if(result.changes!==1) throw new Error("ההודעה המתוזמנת לא נמצאה או שכבר נשלחה/בוטלה");
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,"CANCEL","SCHEDULED_NOTIFICATION",id);
    }).immediate();
  }

  listFieldUnitRates(fieldId:number):Array<{unit:string;rateNis:number;tiers:PriceTier[]}> {
    if(!Number.isSafeInteger(fieldId)||fieldId<1) throw new Error("מזהה אינו תקין");
    const field=this.db.prepare("SELECT id FROM plantation_fields WHERE id=?").get(fieldId);
    if(!field) throw new Error("החלקה לא נמצאה");
    const rows=this.db.prepare("SELECT unit,rate_nis AS rateNis,tiers FROM field_unit_rates WHERE field_id=? ORDER BY unit").all(fieldId) as Array<{unit:string;rateNis:number;tiers:string|null}>;
    return rows.map(r=>({unit:r.unit,rateNis:r.rateNis,tiers:parseTiers(r.tiers)}));
  }

  setFieldUnitRates(actorId:number, fieldId:number, raw:unknown):void {
    const input=fieldUnitRatesSchema.parse(raw);
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    if(!Number.isSafeInteger(fieldId)||fieldId<1) throw new Error("מזהה אינו תקין");
    this.db.transaction(()=>{
      const field=this.db.prepare("SELECT id FROM plantation_fields WHERE id=?").get(fieldId);
      if(!field) throw new Error("החלקה לא נמצאה");
      this.db.prepare("DELETE FROM field_unit_rates WHERE field_id=?").run(fieldId);
      const insert=this.db.prepare("INSERT INTO field_unit_rates(field_id,unit,rate_nis,tiers) VALUES(?,?,?,?)");
      for(const r of input.rates) insert.run(fieldId,r.unit,r.rateNis,r.tiers.length?JSON.stringify(r.tiers):null);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"UPDATE","FIELD_UNIT_RATES",fieldId,JSON.stringify({units:input.rates.map(r=>r.unit)}));
    }).immediate();
  }
}
