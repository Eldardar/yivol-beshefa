import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { changePasswordSelfSchema } from "@/lib/schemas";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { requestBodyIssue, requestUrl } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const auth = new AuthService(db());
  const user = auth.authenticate(token);
  if (!user) return NextResponse.redirect(requestUrl("/login", req), 303);
  try {
    const issue = requestBodyIssue(req, 8_192, ["application/x-www-form-urlencoded", "multipart/form-data"]);
    if (issue) throw new Error(issue.message);
    const form = await req.formData();
    auth.assertCsrf(token, String(form.get("csrf") ?? ""));
    const input = changePasswordSelfSchema.parse({
      currentPassword: String(form.get("currentPassword") ?? ""),
      password: String(form.get("password") ?? ""),
      confirmation: String(form.get("confirmation") ?? ""),
    });
    await auth.changePasswordSelf(user.id, input.currentPassword, input.password);
    const response = NextResponse.redirect(requestUrl("/login?changed=1", req), 303);
    response.cookies.delete("yivol_session");
    response.cookies.delete("yivol_csrf");
    return response;
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "הסיסמה אינה תקינה")
      : error instanceof Error
        ? error.message
        : "לא ניתן להחליף סיסמה";
    return NextResponse.redirect(requestUrl(`/account?error=${encodeURIComponent(message)}`, req), 303);
  }
}
