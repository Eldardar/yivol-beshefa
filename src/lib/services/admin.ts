import type Database from "better-sqlite3";
import { generatePassword, hashPassword } from "@/lib/security";

export type ManagedEntity = "USER" | "FARM" | "SEASON" | "VEHICLE";
const tables: Record<ManagedEntity,string> = { USER:"users", FARM:"farms", SEASON:"seasons", VEHICLE:"vehicles" };

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
            ?this.db.prepare(`SELECT 1 FROM shifts s JOIN seasons se ON se.id=s.season_id WHERE s.status IN ('DRAFT','PUBLISHED') AND se.farm_id=? LIMIT 1`).get(entityId)
            :entity==="SEASON"
              ?this.db.prepare(`SELECT 1 FROM shifts WHERE status IN ('DRAFT','PUBLISHED') AND season_id=? LIMIT 1`).get(entityId)
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
}
