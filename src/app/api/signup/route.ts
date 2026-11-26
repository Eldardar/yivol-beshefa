import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { SignupService } from "@/lib/services/signup";
import { isSameSite, requestBodyIssue, requestUrl, trustedClientIp } from "@/lib/http";
import { selfSignupSchema } from "@/lib/schemas";
import { sendEmailVerificationEmail } from "@/lib/email";
import { pushToUsers } from "@/lib/push";

export const runtime = "nodejs";
const MAX_BODY = 8_192;
const FIELDS = ["name", "email", "phone", "nationalId", "password", "confirmation"] as const;

export async function POST(req: Request) {
  let token = "";
  let keep = "";
  try {
    if (!isSameSite(req)) throw new Error("בקשה לא תקינה");
    const issue = requestBodyIssue(req, MAX_BODY, ["application/x-www-form-urlencoded", "multipart/form-data"]);
    if (issue) throw new Error(issue.message);
    const form = await req.formData();
    token = String(form.get("token") ?? "");
    // שמירת הערכים שאינם רגישים כדי שלא יצטרכו להקליד הכל מחדש אחרי שגיאה
    keep = new URLSearchParams({ name: String(form.get("name") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? "") }).toString();
    const input = selfSignupSchema.parse({ token, ...Object.fromEntries(FIELDS.map(key => [key, String(form.get(key) ?? "")])) });
    const database = db();
    const signup = new SignupService(database);
    const result = await signup.register(input.token, input);
    const verifyUrl = requestUrl(`/api/verify-email?token=${encodeURIComponent(result.verificationToken)}`, req).toString();
    await sendEmailVerificationEmail(input.email, input.name, verifyUrl).catch(error => console.error("שליחת דוא״ל אימות נכשלה", error));
    await pushToUsers(database, result.push);
    // כניסה אוטומטית: ההפעלה מאפשרת לראות רק את עמוד ההמתנה עד לאימות ולאישור
    const session = await new AuthService(database).login(input.email, input.password, trustedClientIp(req)).catch(() => undefined);
    if (!session) return NextResponse.redirect(requestUrl("/login?registered=1", req), 303);
    const response = NextResponse.redirect(requestUrl("/pending", req), 303);
    const cookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict" as const, path: "/", maxAge: 604800 };
    response.cookies.set("yivol_session", session.token, cookie);
    response.cookies.set("yivol_csrf", session.csrf, cookie);
    return response;
  } catch (error) {
    const message = error instanceof z.ZodError ? (error.issues[0]?.message ?? "קלט אינו תקין") : error instanceof Error ? error.message : "ההרשמה נכשלה";
    return NextResponse.redirect(requestUrl(`/signup?token=${encodeURIComponent(token)}&${keep}&error=${encodeURIComponent(message)}`, req), 303);
  }
}
