import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { SignupService } from "@/lib/services/signup";
import { requestBodyIssue, requestUrl } from "@/lib/http";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

/** יוצר קישור הזמנה חד-פעמי להרשמה עצמית של עובד. האסימון מוצג פעם אחת בלבד ונשמר כגיבוב. */
export async function POST(req: Request) {
  const token = (await cookies()).get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const invite = new SignupService(database).createInvite(user.id);
    const url = requestUrl(`/signup?token=${encodeURIComponent(invite.token)}`, req).toString();
    return NextResponse.json({ url, expiresAt: invite.expiresAt }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "לא ניתן ליצור קישור" }, { status: 400, headers: noStoreHeaders });
  }
}
