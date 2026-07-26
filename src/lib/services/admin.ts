import type Database from "better-sqlite3";

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
      const result=this.db.prepare(`UPDATE ${table} SET active=? WHERE id=?`).run(active?1:0,entityId);
      if(result.changes!==1) throw new Error("הרשומה לא נמצאה");
      if(entity==="USER"&&!active)this.db.prepare("DELETE FROM sessions WHERE user_id=?").run(entityId);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,active?"RESTORE":"ARCHIVE",entity,entityId,JSON.stringify({active}));
    })();
  }
}
