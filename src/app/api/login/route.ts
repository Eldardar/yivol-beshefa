import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth";
import { db } from "@/lib/server";
import { isSameSite, requestBodyIssue, requestUrl, trustedClientIp } from "@/lib/http";

export const runtime="nodejs";
const MAX_BODY=8_192;
export async function POST(req:Request){
 try{
  if(!isSameSite(req))throw new Error("cross-site");
  if(requestBodyIssue(req,MAX_BODY,["application/x-www-form-urlencoded","multipart/form-data"]))throw new Error("body");
  const form=await req.formData(),email=String(form.get("email")??""),password=String(form.get("password")??"");
  const session=await new AuthService(db()).login(email,password,trustedClientIp(req));
  const response=NextResponse.redirect(requestUrl("/",req),303),cookie={httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"strict" as const,path:"/",maxAge:604800};
  response.cookies.set("yivol_session",session.token,cookie);response.cookies.set("yivol_csrf",session.csrf,cookie);return response;
 }catch{return NextResponse.redirect(requestUrl("/login?error=1",req),303);}
}
