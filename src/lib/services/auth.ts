import type Database from "better-sqlite3";
import { createSessionToken, hashPassword, hashToken, verifyPassword } from "@/lib/security";
import { timingSafeEqual } from "node:crypto";

const GENERIC_ERROR = "פרטי ההתחברות שגויים";
type Attempts = { count: number; resetAt: number };
const attempts = new Map<string, Attempts>();
export type SessionUser = { id: number; email: string; name: string; role: "ADMIN"|"PICKER" };

export class AuthService {
  private dummyHash?: string;
  constructor(private readonly db: Database.Database) {}

  private async getDummyHash() {
    this.dummyHash ??= await hashPassword(createSessionToken());
    return this.dummyHash;
  }

  async login(emailRaw: string, password: string, ip: string): Promise<{token:string;csrf:string;expires:string;user:SessionUser}> {
    const now=Date.now(); const current=attempts.get(ip);
    if(current && current.resetAt>now && current.count>=5) throw new Error("ניסיונות רבים מדי, נסו שוב מאוחר יותר");
    if(current && current.resetAt<=now) attempts.delete(ip);
    const email=emailRaw.trim().toLowerCase();
    const row=this.db.prepare("SELECT id,email,name,role,password_hash,active FROM users WHERE email=?").get(email) as (SessionUser & {password_hash:string;active:number})|undefined;
    const valid=await verifyPassword(password,row?.password_hash ?? await this.getDummyHash());
    if(!row || !row.active || !valid){
      const value=attempts.get(ip); attempts.set(ip,{count:(value?.count ?? 0)+1,resetAt:value?.resetAt ?? now+15*60_000});
      throw new Error(GENERIC_ERROR);
    }
    attempts.delete(ip);
    const token=createSessionToken(), csrf=createSessionToken();
    const expires=new Date(now+7*24*60*60_000).toISOString();
    this.db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date(now).toISOString());
    this.db.prepare("INSERT INTO sessions(user_id,token_hash,expires_at,csrf_hash) VALUES(?,?,?,?)").run(row.id,hashToken(token),expires,hashToken(csrf));
    return {token,csrf,expires,user:{id:row.id,email:row.email,name:row.name,role:row.role}};
  }

  authenticate(token: string|undefined): SessionUser|undefined {
    if(!token) return undefined;
    return this.db.prepare(`SELECT u.id,u.email,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.token_hash=? AND s.expires_at>? AND u.active=1`).get(hashToken(token),new Date().toISOString()) as SessionUser|undefined;
  }

  assertCsrf(token:string,csrf:string):void {
    const row=this.db.prepare("SELECT csrf_hash FROM sessions WHERE token_hash=? AND expires_at>?").get(hashToken(token),new Date().toISOString()) as {csrf_hash:string}|undefined;
    const supplied = Buffer.from(hashToken(csrf), "hex");
    const expected = row ? Buffer.from(row.csrf_hash, "hex") : Buffer.alloc(32);
    if(!row || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error("בקשה לא תקינה");
  }

  logout(token:string):void { if(token) this.db.prepare("DELETE FROM sessions WHERE token_hash=?").run(hashToken(token)); }
}
