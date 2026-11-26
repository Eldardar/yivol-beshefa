import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { sendAvailabilityReminders } from "@/lib/services/availability-reminders";
import { jerusalemInstant } from "@/lib/dates";

vi.mock("@/lib/push", () => ({ pushToUsers: vi.fn().mockResolvedValue(undefined) }));
import { pushToUsers } from "@/lib/push";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); vi.clearAllMocks(); });
afterEach(() => db.close());

let seq = 0;
function user(role = "PICKER", active = 1): number {
  seq++;
  return Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,?)").run(`u${seq}`, `u${seq}@example.com`, `05000000${String(seq).padStart(2, "0")}`, role, "x", active).lastInsertRowid);
}

// 2026-08-11 הוא יום שלישי; שלושת השבועות הבאים: 2026-08-12 עד 2026-09-01 כולל
function fill(userId: number, from: string, days: number, status = "AVAILABLE") {
  const insert = db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)");
  for (let i = 0; i < days; i++) {
    const d = new Date(`${from}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    insert.run(userId, d.toISOString().slice(0, 10), i % 3 === 0 ? "UNAVAILABLE" : status);
  }
}

const notified = () => (db.prepare("SELECT user_id FROM notifications ORDER BY user_id").all() as Array<{ user_id: number }>).map(r => r.user_id);

describe("תזכורת שבועית למילוי זמינות", () => {
  it("שולח לעובדים פעילים שחסר להם לפחות יום אחד בשלושת השבועות הבאים", async () => {
    user("ADMIN");
    const empty = user(), partial = user(), full = user(), maybes = user();
    user("PICKER", 0);
    fill(partial, "2026-08-12", 20);
    fill(full, "2026-08-12", 21);
    fill(maybes, "2026-08-12", 21, "MAYBE");

    const count = await sendAvailabilityReminders(db, jerusalemInstant("2026-08-11", "16:05"));
    expect(count).toBe(2);
    expect(notified()).toEqual([empty, partial]);
    expect(pushToUsers).toHaveBeenCalledTimes(1);
  });

  it("סימונים מחוץ לחלון השבועות אינם נספרים", async () => {
    const u = user();
    fill(u, "2026-08-11", 21); // מתחיל היום ולכן חסר 2026-09-01
    expect(await sendAvailabilityReminders(db, jerusalemInstant("2026-08-11", "16:00"))).toBe(1);
  });

  it("שולח רק ביום שלישי אחרי 16:00 ופעם אחת בלבד", async () => {
    user();
    expect(await sendAvailabilityReminders(db, jerusalemInstant("2026-08-11", "15:55"))).toBe(0);
    expect(await sendAvailabilityReminders(db, jerusalemInstant("2026-08-12", "16:00"))).toBe(0);
    expect(await sendAvailabilityReminders(db, jerusalemInstant("2026-08-11", "16:00"))).toBe(1);
    expect(await sendAvailabilityReminders(db, jerusalemInstant("2026-08-11", "16:10"))).toBe(0);
    expect(await sendAvailabilityReminders(db, jerusalemInstant("2026-08-18", "16:00"))).toBe(1);
  });
});
