import fs from "node:fs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { AvatarService } from "@/lib/services/avatars";
import { MAX_STORE_IMAGE_BYTES, isStoreImageType } from "@/lib/store";
import { requestBodyIssue } from "@/lib/http";
import { errorMessage, noStoreHeaders } from "@/app/api/store/products/request";

export const runtime = "nodejs";

async function session() {
  const token = (await cookies()).get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  return { database, auth, token, user: user && !user.mustChangePassword ? user : undefined };
}

async function userId(params: Promise<{ id: string }>): Promise<number> {
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("מזהה משתמש אינו תקין");
  return id;
}

// תמונות הפרופיל גלויות לכל משתמש מחובר — הן מוצגות בטבלאות השיאים
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, user } = await session();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });
  const id = Number((await params).id);
  const image = Number.isSafeInteger(id) && id > 0 ? new AvatarService(database).getImage(id) : undefined;
  if (!image || !fs.existsSync(image.path)) return NextResponse.json({ error: "התמונה לא נמצאה" }, { status: 404 });
  // כל החלפה מקבלת גרסה חדשה בכתובת, כך שהתוכן תחת אותה כתובת לעולם לא משתנה
  return new Response(fs.readFileSync(image.path), {
    headers: { "Content-Type": image.mime, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=31536000, immutable" },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, auth, token, user } = await session();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, MAX_STORE_IMAGE_BYTES + 65_536, ["multipart/form-data"]);
    if (issue) throw new Error(issue.message);
    const form = await req.formData();
    auth.assertCsrf(token, String(form.get("csrf") ?? ""));
    const file = form.get("image");
    if (!(file instanceof File) || file.size === 0) throw new Error("לא נבחרה תמונה");
    if (file.size > MAX_STORE_IMAGE_BYTES) throw new Error("התמונה גדולה מדי (עד 5MB)");
    if (!isStoreImageType(file.type)) throw new Error("ניתן להעלות רק תמונה (JPG, PNG, WEBP, GIF)");
    const service = new AvatarService(database);
    const id = await userId(params);
    service.set(user.id, id, { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type });
    return NextResponse.json({ ok: true, version: service.version(id) }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "ההעלאה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { database, auth, token, user } = await session();
  if (!user) return NextResponse.json({ error: "אין הרשאה" }, { status: 403, headers: noStoreHeaders });
  try {
    const issue = requestBodyIssue(req, 4_096, ["application/json"]);
    if (issue) throw new Error(issue.message);
    const body = await req.json() as Record<string, unknown>;
    auth.assertCsrf(token, String(body.csrf ?? ""));
    new AvatarService(database).set(user.id, await userId(params), null);
    return NextResponse.json({ ok: true }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "המחיקה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}
