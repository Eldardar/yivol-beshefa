import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { passwordChangeSchema } from "@/lib/schemas";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { requestBodyIssue, requestUrl } from "@/lib/http";
export const runtime="nodejs";
export async function POST(req:Request){const jar=await cookies(),token=jar.get("yivol_session")?.value??"",auth=new AuthService(db()),user=auth.authenticate(token);if(!user)return NextResponse.redirect(requestUrl("/login",req),303);if(!user.mustChangePassword)return NextResponse.redirect(requestUrl("/",req),303);try{const issue=requestBodyIssue(req,8_192,["application/x-www-form-urlencoded","multipart/form-data"]);if(issue)throw new Error(issue.message);const form=await req.formData();auth.assertCsrf(token,String(form.get("csrf")??""));const input=passwordChangeSchema.parse({password:String(form.get("password")??""),confirmation:String(form.get("confirmation")??"")});await auth.changePassword(user.id,input.password);const response=NextResponse.redirect(requestUrl("/login?changed=1",req),303);response.cookies.delete("yivol_session");response.cookies.delete("yivol_csrf");return response;}catch(error){const message=error instanceof z.ZodError?(error.issues[0]?.message??"הסיסמה אינה תקינה"):error instanceof Error&&["בקשה לא תקינה","בקשה גדולה מדי או ללא אורך תקין","סוג תוכן אינו נתמך"].includes(error.message)?error.message:"לא ניתן להחליף סיסמה";return NextResponse.redirect(requestUrl(`/change-password?error=${encodeURIComponent(message)}`,req),303);}}
