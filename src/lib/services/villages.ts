import type Database from "better-sqlite3";
import { villageSchema } from "@/lib/schemas";
import type { Coordinates } from "@/lib/geo";

export type VillageInput = { name: unknown; description: unknown; location: unknown; sleepingOptions: unknown; availableMonths: unknown };

export class VillageService {
  constructor(private readonly db: Database.Database) {}

  /** Creates a village (villageId null) or updates it, syncing its sleeping options and available months. */
  save(actorId:number, villageId:number|null, raw:VillageInput, coordinates:Coordinates|null=null):number {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
    const input=villageSchema.parse(raw);
    return this.db.transaction(()=>{
      let id:number;
      if(villageId===null){
        id=Number(this.db.prepare("INSERT INTO villages(name,description,location,latitude,longitude) VALUES(?,?,?,?,?)").run(input.name,input.description,input.location,coordinates?.latitude??null,coordinates?.longitude??null).lastInsertRowid);
      }else{
        const result=this.db.prepare("UPDATE villages SET name=?,description=?,location=?,latitude=?,longitude=? WHERE id=?").run(input.name,input.description,input.location,coordinates?.latitude??null,coordinates?.longitude??null,villageId);
        if(result.changes!==1) throw new Error("הכפר לא נמצא");
        id=villageId;
      }

      const existing=new Set((this.db.prepare("SELECT id FROM village_sleeping_options WHERE village_id=?").all(id) as Array<{id:number}>).map(row=>row.id));
      const kept=new Set<number>();
      for(const option of input.sleepingOptions){
        if(option.id!==null){
          if(!existing.has(option.id)) throw new Error("אפשרות הלינה לא נמצאה");
          this.db.prepare("UPDATE village_sleeping_options SET name=?,description=?,cost_per_day=? WHERE id=? AND village_id=?").run(option.name,option.description,option.costPerDay,option.id,id);
          kept.add(option.id);
        }else{
          this.db.prepare("INSERT INTO village_sleeping_options(village_id,name,description,cost_per_day) VALUES(?,?,?,?)").run(id,option.name,option.description,option.costPerDay);
        }
      }
      for(const optionId of existing) if(!kept.has(optionId)) this.db.prepare("DELETE FROM village_sleeping_options WHERE id=?").run(optionId);

      this.db.prepare("DELETE FROM village_available_months WHERE village_id=?").run(id);
      for(const month of input.availableMonths) this.db.prepare("INSERT INTO village_available_months(village_id,month) VALUES(?,?)").run(id,month);

      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,villageId===null?"CREATE":"UPDATE","VILLAGE",id);
      return id;
    }).immediate();
  }
}
