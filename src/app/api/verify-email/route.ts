import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { SignupService } from "@/lib/services/signup";
import { requestUrl } from "@/lib/http";
import { pushToUsers } from "@/lib/push";

export const runtime = "nodejs";

/** יעד הקישור שנשלח בדוא״ל. מסמן את הכתובת כמאומתת ומפנה לעמוד ההמתנה (או ישר למערכת אם המנהל כבר אישר). */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  try {
    const database = db();
    const result = new SignupService(database).verifyEmail(token);
    await pushToUsers(database, result.push);
    return NextResponse.redirect(requestUrl(result.activated ? "/login?activated=1" : "/pending?verified=1", req), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "האימות נכשל";
    return NextResponse.redirect(requestUrl(`/pending?error=${encodeURIComponent(message)}`, req), 303);
  }
}
