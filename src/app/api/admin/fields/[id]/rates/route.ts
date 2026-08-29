import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { AdminService } from "@/lib/services/admin";
import { requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };
const idSchema = z.coerce.number().int().positive();

async function authenticate() {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  return { database, auth, user, token };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, user } = await authenticate();
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const fieldId = idSchema.parse((await params).id);
    const rates = new AdminService(database).listFieldUnitRates(fieldId);
    return NextResponse.json({ rates }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "לא ניתן לטעון תעריפים";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, auth, user, token } = await authenticate();
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 8_192, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const fieldId = idSchema.parse((await params).id);
    new AdminService(database).setFieldUnitRates(user.id, fieldId, { rates: body.rates });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof z.ZodError ? (error.issues[0]?.message ?? "קלט אינו תקין") : error instanceof Error ? error.message : "לא ניתן לשמור תעריפים";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
