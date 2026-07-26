import type Database from "better-sqlite3";
import { SchedulingService } from "@/lib/services/scheduling";

const transitions:Record<string,Set<string>>={DRAFT:new Set(["PUBLISHED","CANCELLED"]),PUBLISHED:new Set(["COMPLETED","CANCELLED","DRAFT"]),COMPLETED:new Set(),CANCELLED:new Set(["DRAFT"])};

export class ShiftService{
 constructor(private readonly db:Database.Database){}
 private actor(actorId:number){return this.db.prepare("SELECT id,role,active FROM users WHERE id=?").get(actorId) as {id:number;role:string;active:number}|undefined;}
 transition(actorId:number,shiftId:number,target:"DRAFT"|"PUBLISHED"|"COMPLETED"|"CANCELLED"):string[]{
  const actor=this.actor(actorId);if(!actor?.active||actor.role!=="ADMIN")throw new Error("אין הרשאה");
  const change=this.db.transaction(()=>{
   const shift=this.db.prepare("SELECT id,status,date,slot FROM shifts WHERE id=?").get(shiftId) as {id:number;status:string;date:string;slot:string}|undefined;
   if(!shift)throw new Error("המשמרת לא נמצאה");if(!transitions[shift.status]?.has(target))throw new Error("מעבר מצב אינו תקין");
   if(target==="COMPLETED"){
    const counts=this.db.prepare(`SELECT
      (SELECT count(*) FROM shift_pickers WHERE shift_id=?) assigned,
      (SELECT count(*) FROM quantities WHERE shift_id=?) reported,
      (SELECT count(*) FROM quantities q JOIN shift_pickers sp ON sp.shift_id=q.shift_id AND sp.user_id=q.user_id WHERE q.shift_id=?) matched`).get(shiftId,shiftId,shiftId) as {assigned:number;reported:number;matched:number};
    if(counts.assigned<1||counts.reported!==counts.assigned||counts.matched!==counts.assigned)throw new Error("לא ניתן להשלים משמרת לפני דיווח מלא לכל הקוטפים");
   }
   const warnings=(target==="PUBLISHED"||(shift.status==="CANCELLED"&&target==="DRAFT"))?new SchedulingService(this.db).validateExistingShift(shiftId):[];
   this.db.prepare("UPDATE shifts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(target,shiftId);
   let title:string|undefined;
   if(target==="PUBLISHED")title="שיבוץ למשמרת";else if(target==="CANCELLED")title="משמרת בוטלה";else if(shift.status==="PUBLISHED"&&target==="DRAFT")title="פרסום המשמרת נמשך";
   if(title){const body=`${shift.date} · ${shift.slot==="MORNING"?"בוקר":"ערב"}`;this.db.prepare("INSERT INTO notifications(user_id,title,body) SELECT user_id,?,? FROM shift_pickers WHERE shift_id=?").run(title,body,shiftId);}
   this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"TRANSITION","SHIFT",shiftId,JSON.stringify({from:shift.status,to:target}));
   return warnings;
  });
  return change.immediate();
 }
 saveQuantities(actorId:number,shiftId:number,entries:Array<{userId:number;quantity:number}>):void{
  const actor=this.actor(actorId);const shift=this.db.prepare("SELECT leader_id,status FROM shifts WHERE id=?").get(shiftId) as {leader_id:number;status:string}|undefined;
  if(!actor?.active||!shift)throw new Error("אין הרשאה");if(shift.status!=="PUBLISHED")throw new Error("מצב המשמרת אינו מאפשר דיווח");if(actor.role!=="ADMIN"&&shift.leader_id!==actorId)throw new Error("אין הרשאה");
  const assigned=(this.db.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=? ORDER BY user_id").all(shiftId) as Array<{user_id:number}>).map(x=>x.user_id);
  if(entries.length!==assigned.length||entries.length===0)throw new Error("יש לדווח עבור כל הקוטפים");
  const seen=new Set<number>();for(const entry of entries){if(!Number.isInteger(entry.userId)||!Number.isFinite(entry.quantity)||entry.quantity<0||entry.quantity>1_000_000)throw new Error("כמות אינה תקינה");if(seen.has(entry.userId))throw new Error("קוטף מופיע יותר מפעם אחת");seen.add(entry.userId);if(!assigned.includes(entry.userId))throw new Error("הקוטף אינו משובץ");}
  this.db.transaction(()=>{const upsert=this.db.prepare(`INSERT INTO quantities(shift_id,user_id,quantity,updated_by) VALUES(?,?,?,?) ON CONFLICT(shift_id,user_id) DO UPDATE SET quantity=excluded.quantity,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP`);for(const entry of entries)upsert.run(shiftId,entry.userId,entry.quantity,actorId);this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"REPORT_UPDATE","SHIFT",shiftId,JSON.stringify({count:entries.length}));})();
 }
 total(actorId:number,shiftId:number):number{const actor=this.actor(actorId);const shift=this.db.prepare("SELECT leader_id,status FROM shifts WHERE id=?").get(shiftId) as {leader_id:number;status:string}|undefined;if(!actor?.active||!shift||!["PUBLISHED","COMPLETED"].includes(shift.status)||(actor.role!=="ADMIN"&&shift.leader_id!==actorId))throw new Error("אין הרשאה");return (this.db.prepare("SELECT COALESCE(SUM(quantity),0) total FROM quantities WHERE shift_id=?").get(shiftId) as {total:number}).total;}
}
