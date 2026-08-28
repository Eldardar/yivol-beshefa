import type Database from "better-sqlite3";
import { shiftSchema, type ShiftInput } from "@/lib/schemas";
import { pushToUsers } from "@/lib/push";
import { sendWhatsAppMessages } from "@/lib/whatsapp";
import { jerusalemDate } from "@/lib/dates";

type Result={shiftId:number;warnings:string[]};
type ParsedShift=ReturnType<typeof shiftSchema.parse>;

export class SchedulingService{
 constructor(private readonly db:Database.Database){}
 private assertAdmin(actorId:number){const actor=this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as {role:string;active:number}|undefined;if(!actor?.active||actor.role!=="ADMIN")throw new Error("אין הרשאה");}
 private validateAssignments(input:ParsedShift,excludeShiftId?:number):string[]{
  if(!input.pickerIds.includes(input.leaderId))throw new Error("המוביל חייב להיות חלק מהצוות");
  const warnings:string[]=[];
  const isPastShift=input.date<jerusalemDate();
  for(const pickerId of input.pickerIds){
   const picker=this.db.prepare("SELECT role,active,name FROM users WHERE id=?").get(pickerId) as {role:string;active:number;name:string}|undefined;
   if(!picker?.active||picker.role!=="PICKER")throw new Error("קוטף אינו פעיל");
   if(!isPastShift){
    const availability=this.db.prepare("SELECT status FROM availability WHERE user_id=? AND date=?").get(pickerId,input.date) as {status:string}|undefined;
    if(!availability||availability.status==="UNAVAILABLE")throw new Error("קוטף אינו זמין");
    if(availability.status==="MAYBE")warnings.push(`${picker.name} סימן/ה אולי`);
   }
   const conflict=this.db.prepare(`SELECT 1 FROM shift_pickers sp JOIN shifts s ON s.id=sp.shift_id
    WHERE sp.user_id=? AND s.date=? AND s.status<>'CANCELLED' AND s.id<>? AND s.start_time<? AND ?<s.end_time`).get(pickerId,input.date,excludeShiftId??-1,input.endTime,input.startTime);
   if(conflict)throw new Error("שיבוץ כפול");
  }
  for(const vehicleId of input.vehicleIds){
   const vehicle=this.db.prepare("SELECT active FROM vehicles WHERE id=?").get(vehicleId) as {active:number}|undefined;
   if(!vehicle?.active)throw new Error("רכב אינו פעיל");
   const conflict=this.db.prepare(`SELECT 1 FROM shift_vehicles sv JOIN shifts s ON s.id=sv.shift_id
    WHERE sv.vehicle_id=? AND s.date=? AND s.status<>'CANCELLED' AND s.id<>? AND s.start_time<? AND ?<s.end_time`).get(vehicleId,input.date,excludeShiftId??-1,input.endTime,input.startTime);
   if(conflict)throw new Error("רכב כבר משובץ");
  }
  const field=this.db.prepare(`SELECT pf.active field_active,f.active farm_active
   FROM plantation_fields pf JOIN farms f ON f.id=pf.farm_id WHERE pf.id=?`).get(input.plantationFieldId) as {field_active:number;farm_active:number}|undefined;
  if(!field?.field_active||!field.farm_active)throw new Error("חלקת הגידול אינה פעילה");
  return warnings;
 }
 validateExistingShift(shiftId:number):string[]{
  const row=this.db.prepare("SELECT date,start_time,end_time,plantation_field_id,leader_id,notes FROM shifts WHERE id=?").get(shiftId) as {date:string;start_time:string;end_time:string;plantation_field_id:number;leader_id:number;notes:string}|undefined;
  if(!row)throw new Error("המשמרת לא נמצאה");
  const pickerIds=(this.db.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=?").all(shiftId) as Array<{user_id:number}>).map(x=>x.user_id);
  const vehicleIds=(this.db.prepare("SELECT vehicle_id FROM shift_vehicles WHERE shift_id=?").all(shiftId) as Array<{vehicle_id:number}>).map(x=>x.vehicle_id);
  const goals=this.db.prepare("SELECT unit,goal FROM shift_goals WHERE shift_id=?").all(shiftId) as Array<{unit:string;goal:number}>;
  const input=shiftSchema.parse({date:row.date,startTime:row.start_time,endTime:row.end_time,plantationFieldId:row.plantation_field_id,pickerIds,leaderId:row.leader_id,vehicleIds,goals,notes:row.notes});
  return this.validateAssignments(input,shiftId);
 }
 createShift(actorId:number,raw:ShiftInput):Result{
  const input=shiftSchema.parse(raw);this.assertAdmin(actorId);
  const create=this.db.transaction(()=>{const warnings=this.validateAssignments(input);const shiftId=Number(this.db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,notes,created_by) VALUES(?,?,?,?,?,?,?)").run(input.date,input.startTime,input.endTime,input.plantationFieldId,input.leaderId,input.notes,actorId).lastInsertRowid);const addGoal=this.db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)");for(const g of input.goals)addGoal.run(shiftId,g.unit,g.goal);const addPicker=this.db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)");for(const id of input.pickerIds)addPicker.run(shiftId,id);const addVehicle=this.db.prepare("INSERT INTO shift_vehicles(shift_id,vehicle_id) VALUES(?,?)");for(const id of input.vehicleIds)addVehicle.run(shiftId,id);this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId,"CREATE","SHIFT",shiftId);return {shiftId,warnings};});
  return create.immediate();
 }
 updateShift(actorId:number,shiftId:number,raw:ShiftInput):Result{
  const input=shiftSchema.parse(raw);this.assertAdmin(actorId);if(!Number.isSafeInteger(shiftId)||shiftId<1)throw new Error("מזהה אינו תקין");
  const pushItems:Array<{userId:number;title:string;body:string}>=[];
  const whatsappItems:Array<{to:string;title:string;body:string}>=[];
  const update=this.db.transaction(()=>{const existing=this.db.prepare("SELECT status,date FROM shifts WHERE id=?").get(shiftId) as {status:string;date:string}|undefined;if(!existing)throw new Error("המשמרת לא נמצאה");if(!["DRAFT","PUBLISHED"].includes(existing.status))throw new Error("לא ניתן לערוך משמרת שהסתיימה או בוטלה");const warnings=this.validateAssignments(input,shiftId);const oldPickers=(this.db.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=?").all(shiftId) as Array<{user_id:number}>).map(x=>x.user_id);this.db.prepare("UPDATE shifts SET date=?,start_time=?,end_time=?,plantation_field_id=?,leader_id=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(input.date,input.startTime,input.endTime,input.plantationFieldId,input.leaderId,input.notes,shiftId);this.db.prepare("DELETE FROM shift_goals WHERE shift_id=?").run(shiftId);const addGoal=this.db.prepare("INSERT INTO shift_goals(shift_id,unit,goal) VALUES(?,?,?)");for(const g of input.goals)addGoal.run(shiftId,g.unit,g.goal);this.db.prepare("DELETE FROM shift_pickers WHERE shift_id=?").run(shiftId);const addPicker=this.db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)");for(const id of input.pickerIds)addPicker.run(shiftId,id);this.db.prepare("DELETE FROM shift_vehicles WHERE shift_id=?").run(shiftId);const addVehicle=this.db.prepare("INSERT INTO shift_vehicles(shift_id,vehicle_id) VALUES(?,?)");for(const id of input.vehicleIds)addVehicle.run(shiftId,id);for(const id of oldPickers)if(!input.pickerIds.includes(id))this.db.prepare("DELETE FROM quantities WHERE shift_id=? AND user_id=?").run(shiftId,id);if(existing.status==="PUBLISHED"&&existing.date>=jerusalemDate()){const notify=this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");const phoneOf=this.db.prepare("SELECT phone FROM users WHERE id=?");for(const id of new Set([...oldPickers,...input.pickerIds])){const body=input.pickerIds.includes(id)?`משמרת בתאריך ${input.date} עודכנה`:`הוסרת ממשמרת בתאריך ${input.date}`;notify.run(id,"המשמרת עודכנה",body);pushItems.push({userId:id,title:"המשמרת עודכנה",body});const phone=(phoneOf.get(id) as {phone:string}|undefined)?.phone;if(phone)whatsappItems.push({to:phone,title:"המשמרת עודכנה",body});}}this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(actorId,"UPDATE","SHIFT",shiftId,JSON.stringify({published:existing.status==="PUBLISHED"}));return {shiftId,warnings};});
  const result=update.immediate();
  if(pushItems.length)void pushToUsers(this.db,pushItems);
  if(whatsappItems.length)void sendWhatsAppMessages(whatsappItems);
  return result;
 }
 listAvailablePickers(shiftId:number):Array<{id:number;name:string;availability:string|null;conflict:boolean;assigned:boolean}>{
  const row=this.db.prepare("SELECT date,start_time,end_time FROM shifts WHERE id=?").get(shiftId) as {date:string;start_time:string;end_time:string}|undefined;
  if(!row)throw new Error("המשמרת לא נמצאה");
  const assignedIds=new Set((this.db.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=?").all(shiftId) as Array<{user_id:number}>).map(x=>x.user_id));
  const pickers=this.db.prepare("SELECT id,name FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as Array<{id:number;name:string}>;
  return pickers.map(p=>{
   const availability=this.db.prepare("SELECT status FROM availability WHERE user_id=? AND date=?").get(p.id,row.date) as {status:string}|undefined;
   const conflict=Boolean(this.db.prepare(`SELECT 1 FROM shift_pickers sp JOIN shifts s ON s.id=sp.shift_id
    WHERE sp.user_id=? AND s.date=? AND s.status<>'CANCELLED' AND s.id<>? AND s.start_time<? AND ?<s.end_time`).get(p.id,row.date,shiftId,row.end_time,row.start_time));
   return {id:p.id,name:p.name,availability:availability?.status??null,conflict,assigned:assignedIds.has(p.id)};
  });
 }
 assignPickers(actorId:number,shiftId:number,pickerIds:number[]):Result{
  const row=this.db.prepare("SELECT date,start_time,end_time,plantation_field_id,leader_id,notes FROM shifts WHERE id=?").get(shiftId) as {date:string;start_time:string;end_time:string;plantation_field_id:number;leader_id:number;notes:string}|undefined;
  if(!row)throw new Error("המשמרת לא נמצאה");
  const vehicleIds=(this.db.prepare("SELECT vehicle_id FROM shift_vehicles WHERE shift_id=?").all(shiftId) as Array<{vehicle_id:number}>).map(x=>x.vehicle_id);
  const goals=this.db.prepare("SELECT unit,goal FROM shift_goals WHERE shift_id=?").all(shiftId) as ShiftInput["goals"];
  const ids=new Set(pickerIds);ids.add(row.leader_id);
  const raw:ShiftInput={date:row.date,startTime:row.start_time,endTime:row.end_time,plantationFieldId:row.plantation_field_id,pickerIds:[...ids],leaderId:row.leader_id,vehicleIds,goals,notes:row.notes};
  return this.updateShift(actorId,shiftId,raw);
 }
 listAvailableVehicles(shiftId:number):Array<{id:number;number:string;name:string;conflict:boolean;assigned:boolean}>{
  const row=this.db.prepare("SELECT date,start_time,end_time FROM shifts WHERE id=?").get(shiftId) as {date:string;start_time:string;end_time:string}|undefined;
  if(!row)throw new Error("המשמרת לא נמצאה");
  const assignedIds=new Set((this.db.prepare("SELECT vehicle_id FROM shift_vehicles WHERE shift_id=?").all(shiftId) as Array<{vehicle_id:number}>).map(x=>x.vehicle_id));
  const vehicles=this.db.prepare("SELECT id,number,name FROM vehicles WHERE active=1 ORDER BY name").all() as Array<{id:number;number:string;name:string}>;
  return vehicles.map(v=>{
   const conflict=Boolean(this.db.prepare(`SELECT 1 FROM shift_vehicles sv JOIN shifts s ON s.id=sv.shift_id
    WHERE sv.vehicle_id=? AND s.date=? AND s.status<>'CANCELLED' AND s.id<>? AND s.start_time<? AND ?<s.end_time`).get(v.id,row.date,shiftId,row.end_time,row.start_time));
   return {id:v.id,number:v.number,name:v.name,conflict,assigned:assignedIds.has(v.id)};
  });
 }
 assignVehicles(actorId:number,shiftId:number,vehicleIds:number[]):Result{
  const row=this.db.prepare("SELECT date,start_time,end_time,plantation_field_id,leader_id,notes FROM shifts WHERE id=?").get(shiftId) as {date:string;start_time:string;end_time:string;plantation_field_id:number;leader_id:number;notes:string}|undefined;
  if(!row)throw new Error("המשמרת לא נמצאה");
  const pickerIds=(this.db.prepare("SELECT user_id FROM shift_pickers WHERE shift_id=?").all(shiftId) as Array<{user_id:number}>).map(x=>x.user_id);
  const goals=this.db.prepare("SELECT unit,goal FROM shift_goals WHERE shift_id=?").all(shiftId) as ShiftInput["goals"];
  const raw:ShiftInput={date:row.date,startTime:row.start_time,endTime:row.end_time,plantationFieldId:row.plantation_field_id,pickerIds,leaderId:row.leader_id,vehicleIds:[...new Set(vehicleIds)],goals,notes:row.notes};
  return this.updateShift(actorId,shiftId,raw);
 }
}
