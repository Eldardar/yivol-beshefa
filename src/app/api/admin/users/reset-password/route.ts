import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { AdminService } from "@/lib/services/admin";
import { escapeHtml, htmlPage, requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };
const targetIdSchema = z.coerce.number().int().positive();

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  const isJson = req.headers.get("content-type")?.toLowerCase().startsWith("application/json") ?? false;

  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json", "application/x-www-form-urlencoded"]);
    if (issue) throw new Error(issue.message);
    const body = isJson ? await req.json() as Record<string, unknown> : Object.fromEntries(await req.formData());
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const targetId = targetIdSchema.parse(body.userId);
    const password = await new AdminService(database).resetPickerPassword(user.id, targetId);
    if (isJson) return NextResponse.json({ temporaryPassword: password }, { headers: noStoreHeaders });
    return htmlPage("הסיסמה אופסה בהצלחה", `<p><strong>הסיסמה החדשה מוצגת פעם אחת בלבד:</strong></p><p><code>${escapeHtml(password)}</code></p><p>יש להעתיק ולמסור לקוטף בערוץ מאובטח. היא אינה נשמרת בטקסט גלוי.</p>`, 200);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "קלט אינו תקין")
      : error instanceof Error
        ? error.message
        : "לא ניתן לאפס סיסמה";
    if (!isJson) return htmlPage("איפוס הסיסמה נכשל", `<p role="alert">${escapeHtml(message)}</p>`, 400);
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
