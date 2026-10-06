import { NextResponse } from "next/server";
import { StoreService } from "@/lib/services/store";
import { adminRequest, errorMessage, noStoreHeaders, readProductForm } from "./request";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { database, auth, token, user } = await adminRequest();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const { input, image } = await readProductForm(req, auth, token);
    const id = new StoreService(database).save(user.id, null, input, image);
    return NextResponse.json({ ok: true, id }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "השמירה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}
