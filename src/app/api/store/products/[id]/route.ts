import { NextResponse } from "next/server";
import { StoreService } from "@/lib/services/store";
import { requestBodyIssue } from "@/lib/http";
import { adminRequest, errorMessage, noStoreHeaders, readProductForm } from "../request";

export const runtime = "nodejs";

async function productId(params: Promise<{ id: string }>): Promise<number> {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("מזהה מוצר אינו תקין");
  return id;
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, auth, token, user } = await adminRequest();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const id = await productId(params);
    const { input, image } = await readProductForm(req, auth, token);
    new StoreService(database).save(user.id, id, input, image);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "השמירה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, auth, token, user } = await adminRequest();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    new StoreService(database).delete(user.id, await productId(params));
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "המחיקה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}
