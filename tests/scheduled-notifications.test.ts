import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AdminService } from "@/lib/services/admin";
import { sendDueScheduledNotifications } from "@/lib/services/scheduled-notifications";
import { jerusalemInstant } from "@/lib/dates";

vi.mock("@/lib/push", () => ({ pushToUsers: vi.fn().mockResolvedValue(undefined) }));
import { pushToUsers } from "@/lib/push";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); vi.clearAllMocks(); });
afterEach(() => db.close());

function setup() {
  const admin = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const p1 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף א", "p1@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const p2 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף ב", "p2@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  return { admin, p1, p2 };
}

describe("הודעות מתוזמנות", () => {
  it("אינו שולח לפני המועד המתוזמן", async () => {
    const x = setup();
    await new AdminService(db).sendOrScheduleNotification(x.admin, { title: "כותרת", body: "תוכן", userIds: [x.p1], sendAt: "2099-08-10T14:00" });
    const before = jerusalemInstant("2099-08-10", "13:30");
    const count = await sendDueScheduledNotifications(db, before);
    expect(count).toBe(0);
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 0 });
  });

  it("שולח לנמענים שנבחרו במועד ומסמן כנשלחה כדי שלא תישלח שוב", async () => {
    const x = setup();
    await new AdminService(db).sendOrScheduleNotification(x.admin, { title: "כותרת", body: "תוכן", userIds: [x.p1, x.p2], sendAt: "2099-08-10T14:00" });
    const due = jerusalemInstant("2099-08-10", "14:00");
    const count = await sendDueScheduledNotifications(db, due);
    expect(count).toBe(1);
    const notified = (db.prepare("SELECT user_id FROM notifications ORDER BY user_id").all() as Array<{ user_id: number }>).map(r => r.user_id);
    expect(notified).toEqual([x.p1, x.p2].sort((a, b) => a - b));
    expect(pushToUsers).toHaveBeenCalledTimes(1);
    expect(new AdminService(db).listScheduledNotifications()).toEqual([]);
    const again = await sendDueScheduledNotifications(db, due);
    expect(again).toBe(0);
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 2 });
  });

  it("מדלג על נמען שהועבר לארכיון בין התזמון לשליחה", async () => {
    const x = setup();
    await new AdminService(db).sendOrScheduleNotification(x.admin, { title: "כותרת", body: "תוכן", userIds: [x.p1, x.p2], sendAt: "2099-08-10T14:00" });
    new AdminService(db).setActive(x.admin, "USER", x.p2, false);
    const due = jerusalemInstant("2099-08-10", "14:00");
    const count = await sendDueScheduledNotifications(db, due);
    expect(count).toBe(1);
    expect(db.prepare("SELECT user_id FROM notifications").all()).toEqual([{ user_id: x.p1 }]);
  });

  it("אינו שולח הודעה שבוטלה", async () => {
    const x = setup();
    await new AdminService(db).sendOrScheduleNotification(x.admin, { title: "כותרת", body: "תוכן", userIds: [x.p1], sendAt: "2099-08-10T14:00" });
    const [scheduled] = new AdminService(db).listScheduledNotifications();
    new AdminService(db).cancelScheduledNotification(x.admin, scheduled!.id);
    const due = jerusalemInstant("2099-08-10", "14:00");
    const count = await sendDueScheduledNotifications(db, due);
    expect(count).toBe(0);
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 0 });
  });
});
