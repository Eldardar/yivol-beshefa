import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { SignupService } from "@/lib/services/signup";
import { requestBodyIssue, requestUrl } from "@/lib/http";
import { sendEmailVerificationEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const token = (await cookies()).get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const pending = auth.authenticatePending(token);
  if (!pending) return NextResponse.redirect(requestUrl("/login", req), 303);
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/x-www-form-urlencoded", "multipart/form-data"]);
    if (issue) throw new Error(issue.message);
    const form = await req.formData();
    auth.assertCsrf(token, String(form.get("csrf") ?? ""));
    const verificationToken = new SignupService(database).issueVerificationToken(pending.id);
    const verifyUrl = requestUrl(`/api/verify-email?token=${encodeURIComponent(verificationToken)}`, req).toString();
    await sendEmailVerificationEmail(pending.email, pending.name, verifyUrl);
    return NextResponse.redirect(requestUrl("/pending?resent=1", req), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "לא ניתן לשלוח את הקישור";
    return NextResponse.redirect(requestUrl(`/pending?error=${encodeURIComponent(message)}`, req), 303);
  }
}
