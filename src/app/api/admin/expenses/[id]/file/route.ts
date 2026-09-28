import fs from "node:fs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/server";
import { AuthService } from "@/lib/services/auth";
import { ExpenseService } from "@/lib/services/expenses";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const jar = await cookies();
  const token = jar.get("yivol_session")?.value ?? "";
  const database = db();
  const user = new AuthService(database).authenticate(token);
  if (!user || user.role !== "ADMIN" || user.mustChangePassword) return NextResponse.json({ error: "אין הרשאה" }, { status: 403 });

  const id = Number((await params).id);
  const file = Number.isSafeInteger(id) && id > 0 ? new ExpenseService(database).getFile(id) : undefined;
  if (!file || !fs.existsSync(file.path)) return NextResponse.json({ error: "הקובץ לא נמצא" }, { status: 404 });
  return new Response(fs.readFileSync(file.path), {
    headers: {
      "Content-Type": file.mime,
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="${file.name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
