import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { ShiftService } from "@/lib/services/shifts";
import { sendAdminReportSummaries } from "@/lib/services/admin-report-summaries";
import { jerusalemInstant } from "@/lib/dates";

vi.mock("@/lib/push", () => ({ pushToUsers: vi.fn().mockResolvedValue(undefined) }));
import { pushToUsers } from "@/lib/push";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); vi.clearAllMocks(); });
afterEach(() => db.close());

function setup(startTime = "06:00", endTime = "12:00") {
  const user = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(user.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const admin2 = Number(user.run("מנהלת", "admin2@example.com", "0500000004", "ADMIN", "x").lastInsertRowid);
  const p1 = Number(user.run("אבי", "leader@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const p2 = Number(user.run("בני", "picker@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "סטרולסה").lastInsertRowid);
  const shift = Number(db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,notes,created_by,status) VALUES(?,?,?,?,?,?,?,?)").run("2026-08-10", startTime, endTime, field, p1, "", admin, "PUBLISHED").lastInsertRowid);
  db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?),(?,?)").run(shift, p1, shift, p2);
  return { admin, admin2, p1, p2, shift };
}

const notifications = () => db.prepare("SELECT user_id,title,body FROM notifications ORDER BY user_id").all() as Array<{ user_id: number; title: string; body: string }>;

describe("סיכום דיווחים למנהלים", () => {
  it("אינו שולח לפני שחלפו ארבע שעות מסיום המשמרת", async () => {
    setup();
    expect(await sendAdminReportSummaries(db, jerusalemInstant("2026-08-10", "15:59"))).toBe(0);
    expect(notifications()).toEqual([]);
  });

  it("שולח לכל המנהלים בלבד את שמות העובדים שלא דיווחו, פעם אחת", async () => {
    const x = setup();
    new ShiftService(db).reportOwnQuantities(x.p1, x.shift, [{ quantity: 3, unit: "KG" }], undefined, jerusalemInstant("2026-08-10", "12:30"));
    const now = jerusalemInstant("2026-08-10", "16:00");
    expect(await sendAdminReportSummaries(db, now)).toBe(1);
    const sent = notifications();
    expect(sent.map(n => n.user_id)).toEqual([x.admin, x.admin2]);
    expect(sent[0]?.title).toBe("עובד אחד לא מילא דיווח");
    expect(sent[0]?.body).toContain("בני");
    expect(sent[0]?.body).not.toContain("אבי");
    expect(pushToUsers).toHaveBeenCalledTimes(1);
    expect(await sendAdminReportSummaries(db, now)).toBe(0);
    expect(notifications()).toHaveLength(2);
  });

  it("מודיע שכולם מילאו כשכל העובדים דיווחו", async () => {
    const x = setup();
    const at = jerusalemInstant("2026-08-10", "12:30");
    new ShiftService(db).reportOwnQuantities(x.p1, x.shift, [{ quantity: 3, unit: "KG" }], undefined, at);
    new ShiftService(db).reportOwnQuantities(x.p2, x.shift, [{ quantity: 4, unit: "KG" }], undefined, at);
    expect(await sendAdminReportSummaries(db, jerusalemInstant("2026-08-10", "16:00"))).toBe(1);
    expect(notifications()[0]?.title).toBe("כל העובדים מילאו דיווח");
  });

  it("מחשב משמרת לילה כמסתיימת למחרת", async () => {
    setup("22:00", "03:00");
    expect(await sendAdminReportSummaries(db, jerusalemInstant("2026-08-10", "23:00"))).toBe(0);
    expect(await sendAdminReportSummaries(db, jerusalemInstant("2026-08-11", "07:00"))).toBe(1);
  });

  it("אינו שולח סיכום רטרואקטיבי למשמרות ישנות", async () => {
    setup();
    expect(await sendAdminReportSummaries(db, jerusalemInstant("2026-08-13", "12:00"))).toBe(0);
  });
});
