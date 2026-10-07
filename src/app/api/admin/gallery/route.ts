import { NextResponse } from "next/server";
import { SiteContentService } from "@/lib/services/site-content";
import { MAX_STORE_IMAGE_BYTES, isStoreImageType } from "@/lib/store";
import { requestBodyIssue } from "@/lib/http";
import { adminRequest, errorMessage, noStoreHeaders } from "@/app/api/store/products/request";

export const runtime = "nodejs";

// העלאת תמונה אחת לגלריית העובדים
export async function POST(req: Request) {
  const { database, auth, token, user } = await adminRequest();
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
    const id = new SiteContentService(database).addPhoto(user.id, { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type });
    return NextResponse.json({ ok: true, id }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "ההעלאה נכשלה") }, { status: 400, headers: noStoreHeaders });
  }
}
