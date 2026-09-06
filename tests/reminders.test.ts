import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { ShiftService } from "@/lib/services/shifts";
import { sendMissingReportReminders } from "@/lib/services/reminders";
import { jerusalemInstant } from "@/lib/dates";

vi.mock("@/lib/push", () => ({ pushToUsers: vi.fn().mockResolvedValue(undefined) }));
import { pushToUsers } from "@/lib/push";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); vi.clearAllMocks(); });
afterEach(() => db.close());

function setup(endTime = "12:00") {
  const admin = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const p1 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("ראש", "leader@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const p2 = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף", "picker@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "סטרולסה").lastInsertRowid);
  const shift = Number(db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,notes,created_by,status) VALUES(?,?,?,?,?,?,?,?)").run("2026-08-10", "06:00", endTime, field, p1, "", admin, "PUBLISHED").lastInsertRowid);
  db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?),(?,?)").run(shift, p1, shift, p2);
  return { admin, p1, p2, shift, field };
}

describe("תזכורות דיווח חסר", () => {
  it("אינו שולח תזכורת לפני שחלפו שעתיים מסיום המשמרת", async () => {
    const x = setup("12:00");
    const now = jerusalemInstant("2026-08-10", "13:30");
    const count = await sendMissingReportReminders(db, now);
    expect(count).toBe(0);
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 0 });
    void x;
  });

  it("שולח תזכורת ודחיפה לקוטפים שלא דיווחו כשעתיים אחרי סיום המשמרת", async () => {
    const x = setup("12:00");
    const now = jerusalemInstant("2026-08-10", "14:00");
    const count = await sendMissingReportReminders(db, now);
    expect(count).toBe(2);
    const notified = (db.prepare("SELECT user_id FROM notifications ORDER BY user_id").all() as Array<{ user_id: number }>).map(r => r.user_id);
    expect(notified).toEqual([x.p1, x.p2].sort((a, b) => a - b));
    expect(pushToUsers).toHaveBeenCalledTimes(1);
    expect(db.prepare("SELECT count(*) count FROM shift_report_reminders WHERE shift_id=?").get(x.shift)).toEqual({ count: 2 });
  });

  it("אינו שולח תזכורת כפולה ומדלג על קוטף שכבר דיווח", async () => {
    const x = setup("12:00");
    new ShiftService(db).reportOwnQuantities(x.p1, x.shift, [{ quantity: 3, unit: "KG" }]);
    const now = jerusalemInstant("2026-08-10", "14:00");
    const first = await sendMissingReportReminders(db, now);
    expect(first).toBe(1);
    const second = await sendMissingReportReminders(db, now);
    expect(second).toBe(0);
    expect(db.prepare("SELECT count(*) count FROM notifications").get()).toEqual({ count: 1 });
  });
});
