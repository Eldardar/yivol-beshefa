import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthService } from "@/lib/services/auth";
import { db } from "@/lib/server";
import { isSameSite, requestBodyIssue, requestUrl } from "@/lib/http";
import { resetPasswordSchema } from "@/lib/schemas";

export const runtime = "nodejs";
const MAX_BODY = 8_192;

export async function POST(req: Request) {
  let token = "";
  try {
    if (!isSameSite(req)) throw new Error("cross-site");
    if (requestBodyIssue(req, MAX_BODY, ["application/x-www-form-urlencoded", "multipart/form-data"])) throw new Error("body");
    const form = await req.formData();
    token = String(form.get("token") ?? "");
    const input = resetPasswordSchema.parse({ token, password: String(form.get("password") ?? ""), confirmation: String(form.get("confirmation") ?? "") });
    await new AuthService(db()).resetPasswordWithToken(input.token, input.password);
    return NextResponse.redirect(requestUrl("/login?reset=1", req), 303);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "קלט אינו תקין")
      : error instanceof Error
        ? error.message
        : "לא ניתן לאפס סיסמה";
    return NextResponse.redirect(requestUrl(`/reset-password?token=${encodeURIComponent(token)}&error=${encodeURIComponent(message)}`, req), 303);
  }
}
