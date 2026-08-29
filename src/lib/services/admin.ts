import type Database from "better-sqlite3";
import { generatePassword, hashPassword } from "@/lib/security";
import { adminAvailabilityUpdateSchema, fieldUnitRatesSchema } from "@/lib/schemas";
import { pushToUsers } from "@/lib/push";

export type ManagedEntity = "USER" | "FARM" | "PLANTATION_FIELD" | "VEHICLE";
const tables: Record<ManagedEntity,string> = { USER:"users", FARM:"farms", PLANTATION_FIELD:"plantation_fields", VEHICLE:"vehicles" };

export class AdminService {
  constructor(private readonly db: Database.Database) {}

  setActive(actorId:number, entity:ManagedEntity, entityId:number, active:boolean):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    if(!Number.isSafeInteger(entityId)||entityId<1) throw new Error("מזהה אינו תקין");
    if(entity==="USER" && actorId===entityId && !active) throw new Error("לא ניתן להעביר את עצמך לארכיון");
    const table=tables[entity];
    this.db.transaction(()=>{
      if(!active){
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

  listFieldUnitRates(fieldId:number):Array<{unit:string;rateNis:number}> {
    if(!Number.isSafeInteger(fieldId)||fieldId<1) throw new Error("מזהה אינו תקין");
    const field=this.db.prepare("SELECT id FROM plantation_fields WHERE id=?").get(fieldId);
    if(!field) throw new Error("החלקה לא נמצאה");
    return this.db.prepare("SELECT unit,rate_nis AS rateNis FROM field_unit_rates WHERE field_id=? ORDER BY unit").all(fieldId) as Array<{unit:string;rateNis:number}>;
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
      const insert=this.db.prepare("INSERT INTO field_unit_rates(field_id,unit,rate_nis) VALUES(?,?,?)");
      for(const r of input.rates) insert.run(fieldId,r.unit,r.rateNis);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"UPDATE","FIELD_UNIT_RATES",fieldId,JSON.stringify({units:input.rates.map(r=>r.unit)}));
    }).immediate();
  }
}
