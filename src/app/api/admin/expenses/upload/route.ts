import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { ExpenseService, isExpenseFileType } from "@/lib/services/expenses";
import { createExpenseFromFile } from "@/lib/expense-extraction";
import { MAX_EXPENSE_FILE_BYTES } from "@/lib/expenses";
import { requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 300;
const noStoreHeaders = { "Cache-Control": "no-store" };

// צילום או קובץ מהמכשיר: שמירת הקובץ, חילוץ הנתונים עם Claude ושמירת ההוצאה
export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });

  try {
    const issue = requestBodyIssue(req, MAX_EXPENSE_FILE_BYTES + 65_536, ["multipart/form-data"]);
    if (issue) throw new Error(issue.message);
    const form = await req.formData();
    auth.assertCsrf(token, String(form.get("csrf") ?? ""));
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("לא נבחר קובץ");
    if (file.size > MAX_EXPENSE_FILE_BYTES) throw new Error("הקובץ גדול מדי");
    if (!isExpenseFileType(file.type)) throw new Error("ניתן להעלות רק תמונה (JPG, PNG, WEBP, GIF) או PDF");
    const source = form.get("source") === "CAMERA" ? "CAMERA" : "UPLOAD";
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await createExpenseFromFile(new ExpenseService(database), user.id, source, { bytes, mime: file.type });
    return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "ההעלאה נכשלה" }, { status: 400, headers: noStoreHeaders });
  }
}
