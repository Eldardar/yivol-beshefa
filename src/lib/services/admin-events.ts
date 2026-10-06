import type Database from "better-sqlite3";
import { adminEventSchema } from "@/lib/schemas";

export type AdminEventInput = { name: unknown; startDate: unknown; endDate: unknown; isPublished: unknown; details: unknown };
export type AdminEventRow = { id: number; created_by: number; creator: string; name: string; start_date: string; end_date: string; is_published: number; details: string };

export class AdminEventService {
  constructor(private readonly db: Database.Database) {}

  private assertAdmin(actorId:number):void {
    const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;
    if(!actor?.active || actor.role!=="ADMIN") throw new Error("אין הרשאה");
  }

  /** Creates an event (eventId null) or updates one the actor created. */
  save(actorId:number, eventId:number|null, raw:AdminEventInput):number {
    this.assertAdmin(actorId);
    const input=adminEventSchema.parse(raw);
    return this.db.transaction(()=>{
      let id:number;
      if(eventId===null){
        id=Number(this.db.prepare("INSERT INTO admin_events(created_by,name,start_date,end_date,is_published,details) VALUES(?,?,?,?,?,?)").run(actorId,input.name,input.startDate,input.endDate,input.isPublished?1:0,input.details).lastInsertRowid);
      }else{
        const result=this.db.prepare("UPDATE admin_events SET name=?,start_date=?,end_date=?,is_published=?,details=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND created_by=?").run(input.name,input.startDate,input.endDate,input.isPublished?1:0,input.details,eventId,actorId);
        if(result.changes!==1) throw new Error("האירוע לא נמצא");
        id=eventId;
      }
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,eventId===null?"CREATE":"UPDATE","ADMIN_EVENT",id);
      return id;
    })();
  }

  /** Deletes an event the actor created and returns its start date. */
  delete(actorId:number, eventId:number):string {
    this.assertAdmin(actorId);
    return this.db.transaction(()=>{
      const event=this.db.prepare("SELECT start_date FROM admin_events WHERE id=? AND created_by=?").get(eventId,actorId) as {start_date:string}|undefined;
      if(!event) throw new Error("האירוע לא נמצא");
      this.db.prepare("DELETE FROM admin_events WHERE id=?").run(eventId);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,"DELETE","ADMIN_EVENT",eventId);
      return event.start_date;
    })();
  }

  /** Events overlapping [from, to) that the viewer created or that are published. */
  visibleBetween(viewerId:number, from:string, to:string):AdminEventRow[] {
    return this.db.prepare(
      `SELECT e.id,e.created_by,u.name creator,e.name,e.start_date,e.end_date,e.is_published,e.details
       FROM admin_events e JOIN users u ON u.id=e.created_by
       WHERE (e.created_by=? OR e.is_published=1) AND e.start_date<? AND e.end_date>=?
       ORDER BY e.start_date,e.id`
    ).all(viewerId,to,from) as AdminEventRow[];
  }
}
