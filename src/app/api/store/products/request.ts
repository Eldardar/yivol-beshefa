import { cookies } from "next/headers";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import type { StoreImageChange, StoreProductInput } from "@/lib/services/store";
import { MAX_STORE_IMAGE_BYTES, isStoreImageType } from "@/lib/store";
import { requestBodyIssue } from "@/lib/http";

export const noStoreHeaders = { "Cache-Control": "no-store" };

export async function adminRequest() {
  const token = (await cookies()).get("yivol_session")?.value ?? "";
  const database = db();
  const auth = new AuthService(database);
  const user = auth.authenticate(token);
  return { database, auth, token, user: user && user.role === "ADMIN" && !user.mustChangePassword ? user : undefined };
}

// טופס מוצר: שדות, ותמונה חדשה או בקשה להסרת התמונה הקיימת
export async function readProductForm(req: Request, auth: AuthService, token: string): Promise<{ input: StoreProductInput; image: StoreImageChange }> {
  const issue = requestBodyIssue(req, MAX_STORE_IMAGE_BYTES + 65_536, ["multipart/form-data"]);
  if (issue) throw new Error(issue.message);
  const form = await req.formData();
  auth.assertCsrf(token, String(form.get("csrf") ?? ""));
  const input = { name: form.get("name"), description: form.get("description") ?? "", price: form.get("price") };
  const file = form.get("image");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_STORE_IMAGE_BYTES) throw new Error("התמונה גדולה מדי (עד 5MB)");
    if (!isStoreImageType(file.type)) throw new Error("ניתן להעלות רק תמונה (JPG, PNG, WEBP, GIF)");
    return { input, image: { bytes: Buffer.from(await file.arrayBuffer()), mime: file.type } };
  }
  return { input, image: form.get("removeImage") === "1" ? null : undefined };
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)) return (error.issues[0] as { message?: string } | undefined)?.message ?? "קלט אינו תקין";
  return error instanceof Error ? error.message : fallback;
}
