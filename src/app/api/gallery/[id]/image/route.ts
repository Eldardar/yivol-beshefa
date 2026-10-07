import fs from "node:fs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { SiteContentService } from "@/lib/services/site-content";

export const runtime = "nodejs";

// תמונות הגלריה גלויות לכל משתמש מחובר — מנהלים ועובדים
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get("yivol_session")?.value ?? "";
  const database = db();
  const user = new AuthService(database).authenticate(token);
  if (!user || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const id = Number((await params).id);
  const image = Number.isSafeInteger(id) && id > 0 ? new SiteContentService(database).getPhotoImage(id) : undefined;
  if (!image || !fs.existsSync(image.path)) return NextResponse.json({ error: "התמונה לא נמצאה" }, { status: 404 });
  // כל העלאה מקבלת מזהה חדש, כך שהתוכן תחת אותה כתובת לעולם לא משתנה
  return new Response(fs.readFileSync(image.path), {
    headers: { "Content-Type": image.mime, "Content-Disposition": "inline", "X-Content-Type-Options": "nosniff", "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
