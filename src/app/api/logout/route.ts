import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AuthService } from "@/lib/services/auth";
import { db } from "@/lib/server";
import { requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
export async function POST(req: Request) {
  const issue=requestBodyIssue(req,8_192,["application/x-www-form-urlencoded","multipart/form-data"]);
  if(issue)return NextResponse.json({error:issue.message},{status:issue.status});
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const form = await req.formData();
  const auth = new AuthService(db());
  try { auth.assertCsrf(token, String(form.get("csrf") ?? "")); }
  catch { return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 403 }); }
  auth.logout(token);
  const res = NextResponse.redirect(new URL("/login", req.url), 303);
  res.cookies.delete("yivol_session");
  res.cookies.delete("yivol_csrf");
  return res;
}
