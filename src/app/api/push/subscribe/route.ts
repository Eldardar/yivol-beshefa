import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };
const subscribeSchema = z.object({
  endpoint: z.string().url().max(2048),
  keys: z.object({ p256dh: z.string().min(1).max(512), auth: z.string().min(1).max(512) }),
  csrf: z.string(),
});
const unsubscribeSchema = z.object({ endpoint: z.string().url().max(2048), csrf: z.string() });

async function authenticate() {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  return { database, auth, user, token };
}

export async function POST(req: Request) {
  const { database, auth, user, token } = await authenticate();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 401, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = (await req.json()) as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const { endpoint, keys } = subscribeSchema.parse(body);
    database
      .prepare(
        `INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth) VALUES(?,?,?,?)
         ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,p256dh=excluded.p256dh,auth=excluded.auth`
      )
      .run(user.id, endpoint, keys.p256dh, keys.auth);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof z.ZodError ? (error.issues[0]?.message ?? "קלט אינו תקין") : error instanceof Error ? error.message : "לא ניתן לשמור מנוי התראות";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}

export async function DELETE(req: Request) {
  const { database, auth, user, token } = await authenticate();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 401, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = (await req.json()) as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const { endpoint } = unsubscribeSchema.parse(body);
    database.prepare("DELETE FROM push_subscriptions WHERE endpoint=? AND user_id=?").run(endpoint, user.id);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof z.ZodError ? (error.issues[0]?.message ?? "קלט אינו תקין") : error instanceof Error ? error.message : "לא ניתן לבטל מנוי התראות";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
