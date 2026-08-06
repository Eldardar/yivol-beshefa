import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { PickerService } from "@/lib/services/picker";
import { requestBodyIssue } from "@/lib/http";
import { availabilitySchema } from "@/lib/schemas";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  if (user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });

  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const entry = availabilitySchema.parse({ date: body.date, status: body.status ?? null });
    new PickerService(database).setAvailability(user.id, { entries: [entry] });
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "קלט אינו תקין")
      : error instanceof Error
        ? error.message
        : "העדכון נכשל";
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
