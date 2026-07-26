import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth";
import { db } from "@/lib/server";
import { requestBodyIssue, requestUrl } from "@/lib/http";

export const runtime="nodejs";
const MAX_BODY=8_192;
function trustedClientIp(req:Request):string|undefined{if(process.env.TRUST_PROXY!=="1")return undefined;const chain=req.headers.get("x-forwarded-for")?.split(",").map(x=>x.trim()).filter(Boolean);return chain?.at(-1);}
function isSameSite(req:Request):boolean{if(req.headers.get("sec-fetch-site")==="cross-site")return false;const origin=req.headers.get("origin");if(!origin)return true;try{return new URL(origin).origin===requestUrl("/",req).origin;}catch{return false;}}
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
