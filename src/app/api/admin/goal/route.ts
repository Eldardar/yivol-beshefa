import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { AdminService } from "@/lib/services/admin";
import { requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });

  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const admin = new AdminService(database);
    if (body.clear === true) admin.clearGoal(user.id);
    else admin.setGoal(user.id, { startDate: body.startDate, endDate: body.endDate, goals: body.goals });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "קלט אינו תקין")
      : error instanceof Error
        ? error.message
        : "השמירה נכשלה";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
