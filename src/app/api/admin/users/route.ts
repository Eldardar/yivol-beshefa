import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { generateInitialPassword,hashPassword } from "@/lib/security";
import { userCreateSchema } from "@/lib/schemas";
import { requestBodyIssue } from "@/lib/http";
export const runtime="nodejs";
const headers={"Cache-Control":"no-store"};
export async function POST(req:Request){const jar=await cookies(),token=jar.get("yivol_session")?.value??"",database=db(),auth=new AuthService(database),user=auth.authenticate(token);if(!user||user.role!=="ADMIN"||user.mustChangePassword)return NextResponse.json({error:"אין הרשאה"},{status:403,headers});try{const issue=requestBodyIssue(req,16_384,["application/json"]);if(issue)throw new Error(issue.message);const body=await req.json() as Record<string,unknown>;auth.assertCsrf(token,String(body.csrf??""));const password=generateInitialPassword(),input=userCreateSchema.parse({name:body.name,email:body.email,phone:body.phone,role:body.role,password,active:true,notes:body.notes??""}),hash=await hashPassword(password);database.transaction(()=>{const result=database.prepare("INSERT INTO users(name,email,phone,notes,role,password_hash,active,must_change_password) VALUES(?,?,?,?,?,?,1,1)").run(input.name,input.email,input.phone,input.notes,input.role,hash);database.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(user.id,"CREATE","USER",Number(result.lastInsertRowid));})();return NextResponse.json({initialPassword:password},{headers});}catch(error){const message=error instanceof z.ZodError?(error.issues[0]?.message??"קלט אינו תקין"):error instanceof Error&&["בקשה לא תקינה","בקשה גדולה מדי או ללא אורך תקין","סוג תוכן אינו נתמך"].includes(error.message)?error.message:"לא ניתן ליצור משתמש";return NextResponse.json({error:message},{status:400,headers});}}
