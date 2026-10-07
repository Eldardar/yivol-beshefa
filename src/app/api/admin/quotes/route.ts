import { NextResponse } from "next/server";
import { SiteContentService } from "@/lib/services/site-content";
import { requestBodyIssue } from "@/lib/http";
import { adminRequest, errorMessage, noStoreHeaders } from "@/app/api/store/products/request";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { database, auth, token, user } = await adminRequest();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 8_192, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    const id = new SiteContentService(database).addQuote(user.id, { text: body.text, cite: body.cite });
    return NextResponse.json({ ok: true, id }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "השמירה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}
