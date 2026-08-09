import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { PickerService } from "@/lib/services/picker";
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
    new PickerService(db()).updatePersonalDetails(user.id, {
      dateOfBirth: String(form.get("dateOfBirth") ?? ""),
      favoriteFruit: String(form.get("favoriteFruit") ?? ""),
    });
    return NextResponse.redirect(requestUrl("/account?detailsSaved=1", req), 303);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "הפרטים אינם תקינים")
      : error instanceof Error
        ? error.message
        : "לא ניתן לעדכן את הפרטים";
    return NextResponse.redirect(requestUrl(`/account?detailsError=${encodeURIComponent(message)}`, req), 303);
  }
}
