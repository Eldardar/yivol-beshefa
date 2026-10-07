import { NextResponse } from "next/server";
import { SiteContentService } from "@/lib/services/site-content";
import { requestBodyIssue } from "@/lib/http";
import { adminRequest, errorMessage, noStoreHeaders } from "@/app/api/store/products/request";

export const runtime = "nodejs";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, auth, token, user } = await adminRequest();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const id = Number((await params).id);
    if (!Number.isSafeInteger(id) || id <= 0) throw new Error("מזהה ציטוט אינו תקין");
    new SiteContentService(database).deleteQuote(user.id, id);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "המחיקה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}
