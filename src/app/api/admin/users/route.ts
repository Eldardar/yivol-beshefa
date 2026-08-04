import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { generateInitialPassword, hashPassword } from "@/lib/security";
import { pickerCreateSchema } from "@/lib/schemas";
import { escapeHtml, htmlPage, requestBodyIssue } from "@/lib/http";
import { maskNationalId } from "@/lib/privacy";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  const isJson = req.headers.get("content-type")?.toLowerCase().startsWith("application/json") ?? false;

  try {
    const issue = requestBodyIssue(req, 16_384, ["application/json", "application/x-www-form-urlencoded"]);
    if (issue) throw new Error(issue.message);
    const body = isJson ? await req.json() as Record<string, unknown> : Object.fromEntries(await req.formData());
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const candidate = { ...body };
    delete candidate.csrf;
    const input = pickerCreateSchema.parse(candidate);
    const password = generateInitialPassword();
    const hash = await hashPassword(password);
    database.transaction(() => {
      const result = database.prepare("INSERT INTO users(name,email,phone,national_id,notes,role,password_hash,active,must_change_password) VALUES(?,?,?,?,?,'PICKER',?,1,1)").run(input.name, input.email, input.phone, input.nationalId, input.notes, hash);
      database.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(user.id, "CREATE", "USER", Number(result.lastInsertRowid));
    })();
    if (isJson) return NextResponse.json({ initialPassword: password }, { headers: noStoreHeaders });
    return htmlPage("הקוטף נוצר בהצלחה", `<dl><dt>שם</dt><dd>${escapeHtml(input.name)}</dd><dt>תעודת זהות</dt><dd>${escapeHtml(maskNationalId(input.nationalId))}</dd></dl><p><strong>הסיסמה מוצגת פעם אחת בלבד:</strong></p><p><code>${escapeHtml(password)}</code></p><p>יש להעתיק ולמסור לקוטף בערוץ מאובטח. היא אינה נשמרת בטקסט גלוי.</p>`, 201);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "קלט אינו תקין")
      : error instanceof Error && ["בקשה לא תקינה", "בקשה גדולה מדי או ללא אורך תקין", "סוג תוכן אינו נתמך"].includes(error.message)
        ? error.message
        : error instanceof Error && error.message.includes("UNIQUE constraint failed")
          ? "תעודת הזהות או הדוא״ל כבר קיימים"
          : "לא ניתן ליצור קוטף";
    if (!isJson) return htmlPage("יצירת הקוטף נכשלה", `<p role="alert">${escapeHtml(message)}</p>`, 400);
    return NextResponse.json({ error: message }, { status: 400, headers: noStoreHeaders });
  }
}
