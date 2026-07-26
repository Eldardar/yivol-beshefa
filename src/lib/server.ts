import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { openDb } from "@/lib/db";
import { AuthService, type SessionUser } from "@/lib/services/auth";
import type Database from "better-sqlite3";

declare global { var __yivolDb: Database.Database | undefined; }
export function db(): Database.Database { globalThis.__yivolDb ??= openDb(); return globalThis.__yivolDb; }
export async function currentUser(): Promise<SessionUser|undefined> {
 const token=(await cookies()).get("yivol_session")?.value ?? "";
 return new AuthService(db()).authenticate(token);
}
export async function requireUser():Promise<SessionUser>{const user=await currentUser();if(!user)redirect("/login");if(user.mustChangePassword)redirect("/change-password");return user;}
export async function requireAdmin():Promise<SessionUser>{const user=await requireUser();if(user.role!=="ADMIN")redirect("/");return user;}
export async function csrfValue():Promise<string>{return (await cookies()).get("yivol_csrf")?.value ?? "";}
