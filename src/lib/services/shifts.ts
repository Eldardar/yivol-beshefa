import type Database from "better-sqlite3";
import { SchedulingService } from "@/lib/services/scheduling";
import { pushToUsers } from "@/lib/push";
import { sendWhatsAppMessages } from "@/lib/whatsapp";
import type { Unit } from "@/lib/units";

const transitions:Record<string,Set<string>>={DRAFT:new Set(["PUBLISHED","CANCELLED"]),PUBLISHED:new Set(["COMPLETED","CANCELLED","DRAFT"]),COMPLETED:new Set(),CANCELLED:new Set(["DRAFT"])};

export class ShiftService{
 constructor(private readonly db:Database.Database){}
 private actor(actorId:number){return this.db.prepare("SELECT id,role,active FROM users WHERE id=?").get(actorId) as {id:number;role:string;active:number}|undefined;}
 transition(actorId:number,shiftId:number,target:"DRAFT"|"PUBLISHED"|"COMPLETED"|"CANCELLED"):string[]{
  const actor=this.actor(actorId);if(!actor?.active||actor.role!=="ADMIN")throw new Error("אין הרשאה");
  let pushItems:Array<{userId:number;title:string;body:string}>=[];
  let whatsappItems:Array<{to:string;title:string;body:string}>=[];
  const change=this.db.transaction(()=>{
   const shift=this.db.prepare("SELECT id,status,date,start_time,end_time FROM shifts WHERE id=?").get(shiftId) as {id:number;status:string;date:string;start_time:string;end_time:string}|undefined;
   if(!shift)throw new Error("המשמרת לא נמצאה");if(!transitions[shift.status]?.has(target))throw new Error("מעבר מצב אינו תקין");
   if(target==="COMPLETED"){
    const counts=this.db.prepare(`SELECT
      (SELECT count(*) FROM shift_pickers WHERE shift_id=?) assigned,
      (SELECT count(DISTINCT user_id) FROM quantities WHERE shift_id=?) reported,
      (SELECT count(DISTINCT q.user_id) FROM quantities q JOIN shift_pickers sp ON sp.shift_id=q.shift_id AND sp.user_id=q.user_id WHERE q.shift_id=?) matched`).get(shiftId,shiftId,shiftId) as {assigned:number;reported:number;matched:number};
    if(counts.assigned<1||counts.reported!==counts.assigned||counts.matched!==counts.assigned)throw new Error("לא ניתן להשלים משמרת לפני דיווח מלא לכל הקוטפים");
   }
   const warnings=(target==="PUBLISHED"||(shift.status==="CANCELLED"&&target==="DRAFT"))?new SchedulingService(this.db).validateExistingShift(shiftId):[];
   this.db.prepare("UPDATE shifts SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(target,shiftId);
   let title:string|undefined;
   if(target==="PUBLISHED")title="שיבוץ למשמרת";else if(target==="CANCELLED")title="משמרת בוטלה";else if(shift.status==="PUBLISHED"&&target==="DRAFT")title="פרסום המשמרת נמשך";
   if(title){
    const body=`${shift.date} · ${shift.start_time}–${shift.end_time}`;
    this.db.prepare("INSERT INTO notifications(user_id,title,body) SELECT user_id,?,? FROM shift_pickers WHERE shift_id=?").run(title,body,shiftId);
    const pickers=(this.db.prepare("SELECT sp.user_id,u.phone FROM shift_pickers sp JOIN users u ON u.id=sp.user_id WHERE sp.shift_id=?").all(shiftId) as Array<{user_id:number;phone:string}>);
    pushItems=pickers.map(p=>({userId:p.user_id,title:title!,body}));
    whatsappItems=pickers.map(p=>({to:p.phone,title:title!,body}));
   }
   this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"TRANSITION","SHIFT",shiftId,JSON.stringify({from:shift.status,to:target}));
   return warnings;
  });
  const warnings=change.immediate();
  if(pushItems.length)void pushToUsers(this.db,pushItems);
  if(whatsappItems.length)void sendWhatsAppMessages(whatsappItems);
  return warnings;
 }
 saveQuantities(actorId:number,shiftId:number,entries:Array<{userId:number;quantity:number;unit:Unit}>,report?:{teamLeaderDetails:string},hours?:Array<{userId:number;startTime:string;endTime:string}>):void{
  const actor=this.actor(actorId);const shift=this.db.prepare("SELECT leader_id,status FROM shifts WHERE id=?").get(shiftId) as {leader_id:number;status:string}|undefined;
  if(!actor?.active||!shift)throw new Error("אין הרשאה");if(shift.status!=="PUBLISHED")throw new Error("מצב המשמרת אינו מאפשר דיווח");if(actor.role!=="ADMIN"&&shift.leader_id!==actorId)throw new Error("אין הרשאה");
  const assigned=(this.db.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=? ORDER BY user_id").all(shiftId) as Array<{user_id:number}>).map(x=>x.user_id);
  if(entries.length===0)throw new Error("יש לדווח עבור כל הקוטפים");
  const seen=new Map<number,Set<Unit>>();
  for(const entry of entries){
   if(!Number.isInteger(entry.userId)||!Number.isFinite(entry.quantity)||entry.quantity<0||entry.quantity>1_000_000)throw new Error("כמות אינה תקינה");
   if(!assigned.includes(entry.userId))throw new Error("הקוטף אינו משובץ");
   const units=seen.get(entry.userId)??new Set<Unit>();if(units.has(entry.unit))throw new Error("יחידת מידה כפולה עבור אותו קוטף");units.add(entry.unit);seen.set(entry.userId,units);
  }
  for(const userId of assigned)if(!seen.has(userId))throw new Error("יש לדווח עבור כל הקוטפים");
  for(const h of hours??[])if(!assigned.includes(h.userId))throw new Error("הקוטף אינו משובץ");
  this.db.transaction(()=>{
   this.db.prepare("DELETE FROM quantities WHERE shift_id=?").run(shiftId);
   const insert=this.db.prepare("INSERT INTO quantities(shift_id,user_id,quantity,unit,updated_by) VALUES(?,?,?,?,?)");for(const entry of entries)insert.run(shiftId,entry.userId,entry.quantity,entry.unit,actorId);
   if(report)this.db.prepare("UPDATE shifts SET team_leader_details=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(report.teamLeaderDetails,shiftId);
   const upsertHours=this.db.prepare("INSERT INTO shift_hours(shift_id,user_id,start_time,end_time,updated_by,updated_at) VALUES(?,?,?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(shift_id,user_id) DO UPDATE SET start_time=excluded.start_time,end_time=excluded.end_time,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP");
   for(const h of hours??[])upsertHours.run(shiftId,h.userId,h.startTime,h.endTime,actorId);
   this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"REPORT_UPDATE","SHIFT",shiftId,JSON.stringify({count:entries.length}));
  })();
 }
 totals(actorId:number,shiftId:number):Array<{unit:Unit;produced:number;goal:number}>{
  const actor=this.actor(actorId);const shift=this.db.prepare("SELECT leader_id,status FROM shifts WHERE id=?").get(shiftId) as {leader_id:number;status:string}|undefined;if(!actor?.active||!shift||!["PUBLISHED","COMPLETED"].includes(shift.status)||(actor.role!=="ADMIN"&&shift.leader_id!==actorId))throw new Error("אין הרשאה");
  const produced=this.db.prepare("SELECT unit,SUM(quantity) produced FROM quantities WHERE shift_id=? GROUP BY unit").all(shiftId) as Array<{unit:Unit;produced:number}>;
  const goals=this.db.prepare("SELECT unit,goal FROM shift_goals WHERE shift_id=?").all(shiftId) as Array<{unit:Unit;goal:number}>;
  const map=new Map<Unit,{unit:Unit;produced:number;goal:number}>();
  for(const g of goals)map.set(g.unit,{unit:g.unit,produced:0,goal:g.goal});
  for(const p of produced){const existing=map.get(p.unit);if(existing)existing.produced=p.produced;else map.set(p.unit,{unit:p.unit,produced:p.produced,goal:0});}
  return [...map.values()];
 }
}
