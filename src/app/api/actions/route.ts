import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { AdminService, type ManagedEntity } from "@/lib/services/admin";
import { PickerService } from "@/lib/services/picker";
import { SchedulingService } from "@/lib/services/scheduling";
import { ShiftService } from "@/lib/services/shifts";
import { farmSchema, seasonSchema, shiftSchema, vehicleSchema } from "@/lib/schemas";
import { requestBodyIssue } from "@/lib/http";

export const runtime="nodejs";
const positiveId=z.coerce.number().int().positive();
const activeSchema=z.enum(["0","1"]);
const entitySchema=z.enum(["USER","FARM","SEASON","VEHICLE"]);

function destination(action:string,form:FormData):string {
  if(action==="availability")return "/availability?saved=1";
  if(action==="setActive")return form.get("entity")==="USER"?"/admin/users?saved=1":"/admin/resources?saved=1";
  if(action.startsWith("farm")||action.startsWith("season")||action.startsWith("vehicle"))return "/admin/resources?saved=1";
  if(action.startsWith("shift")||action==="quantities")return "/admin/shifts?saved=1";
  if(action==="readNotification")return "/notifications";
  return "/";
}

export async function POST(req:Request){
  const jar=await cookies();const token=jar.get("yivol_session")?.value??"";
  const database=db();const auth=new AuthService(database);const user=auth.authenticate(token);
  if(!user)return NextResponse.redirect(new URL("/login",req.url),303);
  if(user.mustChangePassword)return NextResponse.redirect(new URL("/change-password",req.url),303);
  const bodyIssue=requestBodyIssue(req,65_536,["application/x-www-form-urlencoded","multipart/form-data"]);if(bodyIssue)return NextResponse.json({error:bodyIssue.message},{status:bodyIssue.status});
  const form=await req.formData();const action=String(form.get("action")??"");const csrf=String(form.get("csrf")??"");
  let warning="";try{
    auth.assertCsrf(token,csrf);
    if(action==="availability"){
      new PickerService(database).setAvailability(user.id,{date:String(form.get("date")),status:String(form.get("status"))});
    }else if(action==="farmCreate"){
      if(user.role!=="ADMIN")throw new Error("אין הרשאה");
      const input=farmSchema.parse({name:form.get("name"),contactPerson:form.get("contact"),phone:form.get("phone"),address:form.get("address"),navigationUrl:form.get("navigation")??"",notes:form.get("notes")??""});
      database.transaction(()=>{const result=database.prepare("INSERT INTO farms(name,contact_person,phone,address,navigation_link,notes) VALUES(?,?,?,?,?,?)").run(input.name,input.contactPerson,input.phone,input.address,input.navigationUrl||null,input.notes);database.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(user.id,"CREATE","FARM",Number(result.lastInsertRowid));})();
    }else if(action==="seasonCreate"){
      if(user.role!=="ADMIN")throw new Error("אין הרשאה");
      const input=seasonSchema.parse({farmId:form.get("farmId"),crop:form.get("crop"),startDate:form.get("start"),endDate:form.get("end"),notes:form.get("notes")??""});
      database.transaction(()=>{const farm=database.prepare("SELECT active FROM farms WHERE id=?").get(input.farmId) as {active:number}|undefined;if(!farm?.active)throw new Error("המשק אינו פעיל");const result=database.prepare("INSERT INTO seasons(farm_id,crop,start_date,end_date,notes) VALUES(?,?,?,?,?)").run(input.farmId,input.crop,input.startDate,input.endDate,input.notes);database.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(user.id,"CREATE","SEASON",Number(result.lastInsertRowid));})();
    }else if(action==="vehicleCreate"){
      if(user.role!=="ADMIN")throw new Error("אין הרשאה");
      const input=vehicleSchema.parse({number:form.get("number"),name:form.get("name"),notes:form.get("notes")??""});
      database.transaction(()=>{const result=database.prepare("INSERT INTO vehicles(number,name,notes) VALUES(?,?,?)").run(input.number,input.name,input.notes);database.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(user.id,"CREATE","VEHICLE",Number(result.lastInsertRowid));})();
    }else if(action==="setActive"){
      const entity=entitySchema.parse(form.get("entity")) as ManagedEntity;const entityId=positiveId.parse(form.get("entityId"));const active=activeSchema.parse(form.get("active"))==="1";
      new AdminService(database).setActive(user.id,entity,entityId,active);
    }else if(action==="shiftCreate"||action==="shiftUpdate"){
      if(user.role!=="ADMIN")throw new Error("אין הרשאה");
      const input=shiftSchema.parse({date:form.get("date"),slot:form.get("slot"),seasonId:form.get("seasonId"),pickerIds:form.getAll("pickerIds"),leaderId:form.get("leaderId"),vehicleIds:form.getAll("vehicleIds"),goal:form.get("goal"),notes:form.get("notes")??""});
      const scheduling=new SchedulingService(database);
      const result=action==="shiftCreate"?scheduling.createShift(user.id,input):scheduling.updateShift(user.id,positiveId.parse(form.get("shiftId")),input);warning=result.warnings.join(" · ");
    }else if(action==="shiftTransition"){
      if(user.role!=="ADMIN")throw new Error("אין הרשאה");
      const target=z.enum(["DRAFT","PUBLISHED","COMPLETED","CANCELLED"]).parse(form.get("target"));warning=new ShiftService(database).transition(user.id,positiveId.parse(form.get("shiftId")),target).join(" · ");
    }else if(action==="quantities"){
      const shiftId=positiveId.parse(form.get("shiftId"));const entries:Array<{userId:number;quantity:number}>=[];
      for(const [key,value] of form.entries()){const match=/^quantity_(\d+)$/.exec(key);if(match)entries.push({userId:positiveId.parse(match[1]),quantity:z.coerce.number().finite().nonnegative().max(1_000_000).parse(value)});}
      new ShiftService(database).saveQuantities(user.id,shiftId,entries);
    }else if(action==="readNotification"){
      new PickerService(database).markRead(user.id,positiveId.parse(form.get("notificationId")));
    }else throw new Error("פעולה אינה מוכרת");
    const redirect=new URL(destination(action,form),req.url);if(warning)redirect.searchParams.set("warning",warning);return NextResponse.redirect(redirect,303);
  }catch(error){
    const message=error instanceof z.ZodError?(error.issues[0]?.message??"קלט אינו תקין"):error instanceof Error?error.message:"הפעולה נכשלה";
    return NextResponse.redirect(new URL(`${destination(action,form).split("?")[0]}?error=${encodeURIComponent(message)}`,req.url),303);
  }
}
