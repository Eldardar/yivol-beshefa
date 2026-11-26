import { beforeEach, afterEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AuthService } from "@/lib/services/auth";
import { AdminService } from "@/lib/services/admin";
import { SignupService, INVITE_TTL_MS } from "@/lib/services/signup";
import { hashPassword } from "@/lib/security";

let db: Database.Database;
let adminId: number;
const input = { name: "עובד חדש", email: "New@Example.com", phone: "0501234567", nationalId: "000000018", password: "Strong!Pass123" };

beforeEach(async () => {
  db = createTestDb();
  adminId = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES('מנהל','admin@example.com','050','ADMIN',?)").run(await hashPassword("Admin!Pass123")).lastInsertRowid);
});
afterEach(() => db.close());

async function signUp() {
  const signup = new SignupService(db);
  const { token } = signup.createInvite(adminId);
  return { signup, inviteToken: token, ...(await signup.register(token, input)) };
}

describe("הרשמה עצמית של עובדים", () => {
  it("רק מנהל יוצר הזמנה, וההזמנה חד-פעמית ופגה", async () => {
    const signup = new SignupService(db);
    const { inviteToken, userId } = await signUp();
    expect(() => signup.createInvite(userId)).toThrow("אין הרשאה");
    expect(signup.inviteIsValid(inviteToken)).toBe(false);
    await expect(signup.register(inviteToken, { ...input, email: "other@example.com", nationalId: "000000026" })).rejects.toThrow("קישור ההזמנה");
    const { token } = signup.createInvite(adminId, Date.now() - INVITE_TTL_MS - 1);
    expect(signup.inviteIsValid(token)).toBe(false);
  });

  it("יוצר חשבון ממתין ומתריע למנהלים", async () => {
    const { userId, push } = await signUp();
    expect(db.prepare("SELECT email,role,active,signup_pending,must_change_password FROM users WHERE id=?").get(userId)).toEqual({ email: "new@example.com", role: "PICKER", active: 0, signup_pending: 1, must_change_password: 0 });
    expect(db.prepare("SELECT title FROM notifications WHERE user_id=?").all(adminId)).toEqual([{ title: "עובד חדש ממתין לאישור" }]);
    expect(push).toEqual([expect.objectContaining({ userId: adminId, url: "/admin/users" })]);
  });

  it("דוא״ל קיים נדחה ואינו מנצל את ההזמנה", async () => {
    const signup = new SignupService(db);
    const { token } = signup.createInvite(adminId);
    await expect(signup.register(token, { ...input, email: "admin@example.com" })).rejects.toThrow("כבר רשומים");
    expect(signup.inviteIsValid(token)).toBe(true);
  });

  it("חוסם את המערכת עד אימות דוא״ל וגם אישור מנהל", async () => {
    const { signup, userId, verificationToken } = await signUp();
    const auth = new AuthService(db);
    const session = await auth.login(input.email, input.password, "10.1.0.1");
    expect(auth.authenticate(session.token)).toBeUndefined();
    expect(auth.authenticatePending(session.token)?.id).toBe(userId);

    expect(signup.verifyEmail(verificationToken).activated).toBe(false);
    expect(signup.pendingStatus(userId)).toMatchObject({ emailVerified: true, approved: false });
    expect(auth.authenticate(session.token)).toBeUndefined();

    const approved = signup.approve(adminId, userId);
    expect(approved.activated).toBe(true);
    expect(auth.authenticate(session.token)?.id).toBe(userId);
    expect(auth.authenticatePending(session.token)).toBeUndefined();
    expect(db.prepare("SELECT title FROM notifications WHERE user_id=?").all(userId)).toEqual([{ title: "החשבון שלך אושר" }]);
  });

  it("אישור לפני אימות: החשבון נפתח רק בלחיצה על קישור האימות", async () => {
    const { signup, userId, verificationToken } = await signUp();
    expect(signup.approve(adminId, userId).activated).toBe(false);
    expect(() => signup.approve(userId, userId)).toThrow("אין הרשאה");
    expect(signup.verifyEmail(verificationToken).activated).toBe(true);
    expect(signup.verifyEmail(verificationToken).activated).toBe(false);
    expect(() => signup.verifyEmail("bad")).toThrow("קישור האימות");
  });

  it("שליחה חוזרת מחליפה את האסימון ומוגבלת בזמן", async () => {
    const { signup, userId, verificationToken } = await signUp();
    const later = Date.now() + 120_000;
    const fresh = signup.issueVerificationToken(userId, later);
    expect(() => signup.issueVerificationToken(userId, later + 1_000)).toThrow("בעוד דקה");
    expect(() => signup.verifyEmail(verificationToken)).toThrow("קישור האימות");
    signup.verifyEmail(fresh, later);
    expect(() => signup.issueVerificationToken(userId, later + 120_000)).toThrow("כבר אומתה");
  });

  it("לא ניתן להפעיל ידנית חשבון ממתין, ודחייה מוחקת אותו", async () => {
    const { userId } = await signUp();
    const admin = new AdminService(db);
    expect(() => admin.setActive(adminId, "USER", userId, true)).toThrow("ממתין לאישור");
    admin.deleteEntity(adminId, "USER", userId);
    expect(db.prepare("SELECT 1 FROM users WHERE id=?").get(userId)).toBeUndefined();
  });
});
