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
    new PickerService(db()).updateBankDetails(user.id, {
      accountHolder: String(form.get("accountHolder") ?? ""),
      bankNumber: String(form.get("bankNumber") ?? ""),
      bankName: String(form.get("bankName") ?? ""),
      branchNumber: String(form.get("branchNumber") ?? ""),
      branchName: String(form.get("branchName") ?? ""),
      accountNumber: String(form.get("accountNumber") ?? ""),
    });
    return NextResponse.redirect(requestUrl("/account?bankSaved=1#bank", req), 303);
  } catch (error) {
    const message = error instanceof z.ZodError
      ? (error.issues[0]?.message ?? "הפרטים אינם תקינים")
      : error instanceof Error
        ? error.message
        : "לא ניתן לעדכן את הפרטים";
    return NextResponse.redirect(requestUrl(`/account?bankError=${encodeURIComponent(message)}#bank`, req), 303);
  }
}
