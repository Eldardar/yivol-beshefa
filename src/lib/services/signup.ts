import type Database from "better-sqlite3";
import { createSessionToken, hashPassword, hashToken, normalizeEmail } from "@/lib/security";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60_000;
export const VERIFICATION_TTL_MS = 48 * 60 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;

export type SignupInput = { name: string; email: string; phone: string; nationalId: string; password: string };
export type PushItem = { userId: number; title: string; body: string; url?: string };
export type PendingStatus = { id: number; name: string; email: string; emailVerified: boolean; approved: boolean };

const NEW_SIGNUP_TITLE = "עובד חדש ממתין לאישור";
const APPROVED_TITLE = "החשבון שלך אושר";
const APPROVED_BODY = "ברוכים הבאים ליבול בשפע! החשבון שלך פעיל וניתן להתחיל לעבוד במערכת.";

/** הרשמה עצמית של עובדים: הזמנה חד-פעמית, אימות דוא״ל ואישור מנהל. החשבון נפתח רק כששני התנאים מתקיימים. */
export class SignupService {
  constructor(private readonly db: Database.Database) {}

  private assertAdmin(actorId: number): void {
    const actor = this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as { role: string; active: number } | undefined;
    if (!actor?.active || actor.role !== "ADMIN") throw new Error("אין הרשאה");
  }

  createInvite(actorId: number, now = Date.now()): { token: string; expiresAt: string } {
    this.assertAdmin(actorId);
    const token = createSessionToken(), expiresAt = new Date(now + INVITE_TTL_MS).toISOString();
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM user_invites WHERE used_at IS NULL AND expires_at<=?").run(new Date(now).toISOString());
      const result = this.db.prepare("INSERT INTO user_invites(token_hash,created_by,expires_at) VALUES(?,?,?)").run(hashToken(token), actorId, expiresAt);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, "CREATE", "USER_INVITE", Number(result.lastInsertRowid));
    })();
    return { token, expiresAt };
  }

  inviteIsValid(rawToken: string, now = Date.now()): boolean {
    if (!rawToken || rawToken.length > 512) return false;
    return Boolean(this.db.prepare("SELECT 1 FROM user_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?").get(hashToken(rawToken), new Date(now).toISOString()));
  }

  /** יוצר חשבון ממתין, מנצל את ההזמנה, מנפיק אסימון אימות דוא״ל ומתריע למנהלים. */
  async register(rawToken: string, input: SignupInput, now = Date.now()): Promise<{ userId: number; verificationToken: string; push: PushItem[] }> {
    if (!this.inviteIsValid(rawToken, now)) throw new Error("קישור ההזמנה אינו תקין, כבר נוצל או שפג תוקפו");
    const hash = await hashPassword(input.password);
    const verificationToken = createSessionToken();
    const nowIso = new Date(now).toISOString();
    const push: PushItem[] = [];
    let userId = 0;
    try {
      this.db.transaction(() => {
        const invite = this.db.prepare("SELECT id,created_by FROM user_invites WHERE token_hash=? AND used_at IS NULL AND expires_at>?").get(hashToken(rawToken), nowIso) as { id: number; created_by: number } | undefined;
        if (!invite) throw new Error("קישור ההזמנה אינו תקין, כבר נוצל או שפג תוקפו");
        const result = this.db.prepare("INSERT INTO users(name,email,phone,national_id,notes,role,password_hash,active,must_change_password,signup_pending) VALUES(?,?,?,?,'','PICKER',?,0,0,1)")
          .run(input.name, normalizeEmail(input.email), input.phone, input.nationalId, hash);
        userId = Number(result.lastInsertRowid);
        const consumed = this.db.prepare("UPDATE user_invites SET used_at=?,used_by_user_id=? WHERE id=? AND used_at IS NULL").run(nowIso, userId, invite.id);
        if (consumed.changes !== 1) throw new Error("קישור ההזמנה כבר נוצל");
        this.db.prepare("INSERT INTO email_verification_tokens(user_id,token_hash,expires_at) VALUES(?,?,?)").run(userId, hashToken(verificationToken), new Date(now + VERIFICATION_TTL_MS).toISOString());
        // ההרשמה נרשמת ביומן בשם המנהל שהזמין, כדי שמחיקת בקשה שנדחתה לא תיחסם ע״י היסטוריה
        this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id,metadata) VALUES(?,?,?,?,?)").run(invite.created_by, "SELF_SIGNUP", "USER", userId, JSON.stringify({ inviteId: invite.id }));
        const body = `${input.name} נרשם/ה למערכת וממתין/ה לאישורך. ניתן לאשר בעמוד ניהול העובדים.`;
        const notify = this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
        for (const admin of this.db.prepare("SELECT id FROM users WHERE role='ADMIN' AND active=1").all() as Array<{ id: number }>) {
          notify.run(admin.id, NEW_SIGNUP_TITLE, body);
          push.push({ userId: admin.id, title: NEW_SIGNUP_TITLE, body, url: "/admin/users" });
        }
      }).immediate();
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) throw new Error("הדוא״ל או תעודת הזהות כבר רשומים במערכת");
      throw error;
    }
    return { userId, verificationToken, push };
  }

  /** אסימון אימות חדש לשליחה חוזרת; מוגבל לפעם בדקה. */
  issueVerificationToken(userId: number, now = Date.now()): string {
    const user = this.db.prepare("SELECT signup_pending,email_verified_at FROM users WHERE id=?").get(userId) as { signup_pending: number; email_verified_at: string | null } | undefined;
    if (!user?.signup_pending) throw new Error("החשבון אינו ממתין לאימות");
    if (user.email_verified_at) throw new Error("כתובת הדוא״ל כבר אומתה");
    const last = this.db.prepare("SELECT MAX(created_at) created_at FROM email_verification_tokens WHERE user_id=?").get(userId) as { created_at: string | null };
    if (last.created_at && now - Date.parse(last.created_at) < RESEND_COOLDOWN_MS) throw new Error("נשלח קישור לפני רגע, נסו שוב בעוד דקה");
    const token = createSessionToken();
    this.db.transaction(() => {
      this.db.prepare("DELETE FROM email_verification_tokens WHERE user_id=?").run(userId);
      this.db.prepare("INSERT INTO email_verification_tokens(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?)").run(userId, hashToken(token), new Date(now + VERIFICATION_TTL_MS).toISOString(), new Date(now).toISOString());
    })();
    return token;
  }

  /** מסמן את הדוא״ל כמאומת; אם המנהל כבר אישר, החשבון נפתח. */
  verifyEmail(rawToken: string, now = Date.now()): { userId: number; activated: boolean; push: PushItem[] } {
    if (!rawToken || rawToken.length > 512) throw new Error("קישור האימות אינו תקין או שפג תוקפו");
    const nowIso = new Date(now).toISOString();
    return this.db.transaction(() => {
      const row = this.db.prepare("SELECT t.id,t.user_id,t.used_at,t.expires_at,u.email_verified_at FROM email_verification_tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=?").get(hashToken(rawToken)) as { id: number; user_id: number; used_at: string | null; expires_at: string; email_verified_at: string | null } | undefined;
      if (!row) throw new Error("קישור האימות אינו תקין או שפג תוקפו");
      // לחיצה חוזרת על אותו קישור (או סריקה מוקדמת של תוכנת דוא״ל) אינה שגיאה
      if (row.email_verified_at) return { userId: row.user_id, activated: false, push: [] };
      if (row.used_at || row.expires_at <= nowIso) throw new Error("קישור האימות אינו תקין או שפג תוקפו");
      this.db.prepare("UPDATE email_verification_tokens SET used_at=? WHERE id=?").run(nowIso, row.id);
      this.db.prepare("UPDATE users SET email_verified_at=? WHERE id=? AND email_verified_at IS NULL").run(nowIso, row.user_id);
      const activated = this.activateIfReady(row.user_id);
      return { userId: row.user_id, activated, push: activated ? [{ userId: row.user_id, title: APPROVED_TITLE, body: APPROVED_BODY, url: "/" }] : [] };
    }).immediate();
  }

  /** אישור מנהל; אם הדוא״ל כבר אומת, החשבון נפתח. */
  approve(actorId: number, userId: number, now = Date.now()): { activated: boolean; name: string; email: string; push: PushItem[] } {
    this.assertAdmin(actorId);
    return this.db.transaction(() => {
      const user = this.db.prepare("SELECT name,email,signup_pending,approved_at FROM users WHERE id=?").get(userId) as { name: string; email: string; signup_pending: number; approved_at: string | null } | undefined;
      if (!user) throw new Error("המשתמש לא נמצא");
      if (!user.signup_pending) throw new Error("המשתמש אינו ממתין לאישור");
      if (!user.approved_at) this.db.prepare("UPDATE users SET approved_at=?,approved_by=? WHERE id=?").run(new Date(now).toISOString(), actorId, userId);
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, "APPROVE_SIGNUP", "USER", userId);
      const activated = this.activateIfReady(userId);
      return { activated, name: user.name, email: user.email, push: activated ? [{ userId, title: APPROVED_TITLE, body: APPROVED_BODY, url: "/" }] : [] };
    }).immediate();
  }

  pendingStatus(userId: number): PendingStatus | undefined {
    const row = this.db.prepare("SELECT id,name,email,email_verified_at,approved_at FROM users WHERE id=? AND signup_pending=1").get(userId) as { id: number; name: string; email: string; email_verified_at: string | null; approved_at: string | null } | undefined;
    return row ? { id: row.id, name: row.name, email: row.email, emailVerified: Boolean(row.email_verified_at), approved: Boolean(row.approved_at) } : undefined;
  }

  pendingCount(): number {
    return (this.db.prepare("SELECT COUNT(*) n FROM users WHERE signup_pending=1").get() as { n: number }).n;
  }

  private activateIfReady(userId: number): boolean {
    const result = this.db.prepare("UPDATE users SET active=1,signup_pending=0 WHERE id=? AND signup_pending=1 AND email_verified_at IS NOT NULL AND approved_at IS NOT NULL").run(userId);
    if (result.changes !== 1) return false;
    this.db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)").run(userId, APPROVED_TITLE, APPROVED_BODY);
    return true;
  }
}
