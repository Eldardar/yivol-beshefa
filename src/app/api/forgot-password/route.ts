import { NextResponse } from "next/server";
import { AuthService } from "@/lib/services/auth";
import { db } from "@/lib/server";
import { isSameSite, requestBodyIssue, requestUrl, trustedClientIp } from "@/lib/http";
import { forgotPasswordSchema } from "@/lib/schemas";
import { sendPasswordResetEmail } from "@/lib/email";

export const runtime = "nodejs";
const MAX_BODY = 8_192;

export async function POST(req: Request) {
  try {
    if (!isSameSite(req)) throw new Error("cross-site");
    if (requestBodyIssue(req, MAX_BODY, ["application/x-www-form-urlencoded", "multipart/form-data"])) throw new Error("body");
    const form = await req.formData();
    const { email } = forgotPasswordSchema.parse({ email: String(form.get("email") ?? "") });
    const result = await new AuthService(db()).requestPasswordReset(email, trustedClientIp(req));
    if (result) {
      const resetUrl = requestUrl(`/reset-password?token=${encodeURIComponent(result.token)}`, req).toString();
      await sendPasswordResetEmail(email, resetUrl).catch(() => {});
    }
  } catch {
    // Always fall through to the same generic redirect below, regardless of outcome,
    // to avoid revealing whether an account with the given email exists.
  }
  return NextResponse.redirect(requestUrl("/forgot-password?sent=1", req), 303);
}
