import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { ExpenseService } from "@/lib/services/expenses";
import { requestBodyIssue } from "@/lib/http";

export const runtime = "nodejs";
const noStoreHeaders = { "Cache-Control": "no-store" };

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("מזהה הוצאה אינו תקין");
    new ExpenseService(database).delete(user.id, id);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "המחיקה נכשלה" }, { status: 400, headers: noStoreHeaders });
  }
}
