import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { sendHousingStatusReminders } from "@/lib/services/housing-reminders";
import { jerusalemInstant } from "@/lib/dates";

vi.mock("@/lib/push", () => ({ pushToUsers: vi.fn().mockResolvedValue(undefined) }));
import { pushToUsers } from "@/lib/push";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); vi.clearAllMocks(); });
afterEach(() => db.close());

let seq = 0;
function user(role = "PICKER"): number {
  seq++;
  return Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run(`u${seq}`, `u${seq}@example.com`, `05000000${String(seq).padStart(2, "0")}`, role, "x").lastInsertRowid);
}

function setup() {
  const admin = user("ADMIN");
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000099", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "סטרולסה").lastInsertRowid);
  const shift = (date: string, pickers: number[], status = "PUBLISHED", leader: number | null = null) => {
    const id = Number(db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,notes,created_by,status) VALUES(?,?,?,?,?,?,?,?)").run(date, "06:00", "12:00", field, leader, "", admin, status).lastInsertRowid);
    for (const p of pickers) db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)").run(id, p);
    return id;
  };
  const housing = (userId: number, date: string, status: string) => db.prepare("INSERT INTO housing_status(user_id,date,status) VALUES(?,?,?)").run(userId, date, status);
  return { shift, housing };
}

const notified = () => (db.prepare("SELECT user_id FROM notifications ORDER BY user_id").all() as Array<{ user_id: number }>).map(r => r.user_id);

describe("תזכורת יומית לסטטוס לינה", () => {
  it("שולח לעובדי היום ומחר שלא סימנו כן/לא, כולל מי שסימן אולי", async () => {
    const { shift, housing } = setup();
    const today = user(), tomorrow = user(), maybe = user(), yes = user(), no = user(), dayAfter = user(), draft = user(), leader = user(), unassigned = user();
    void unassigned;
    shift("2026-08-10", [today, maybe, yes, no]);
    shift("2026-08-11", [tomorrow]);
    shift("2026-08-12", [dayAfter]);
    shift("2026-08-11", [draft], "DRAFT");
    shift("2026-08-11", [], "PUBLISHED", leader);
    housing(maybe, "2026-08-10", "MAYBE");
    housing(yes, "2026-08-10", "IN_VILLAGE");
    housing(no, "2026-08-10", "AWAY");
    housing(tomorrow, "2026-08-11", "AWAY");

    const count = await sendHousingStatusReminders(db, jerusalemInstant("2026-08-10", "16:05"));
    expect(count).toBe(4);
    expect(notified()).toEqual([today, tomorrow, maybe, leader].sort((a, b) => a - b));
    expect(pushToUsers).toHaveBeenCalledTimes(1);
  });

  it("לא שולח לפני 16:00 או אחרי נעילת העריכה ב-18:00", async () => {
    const { shift } = setup();
    shift("2026-08-10", [user()]);
    expect(await sendHousingStatusReminders(db, jerusalemInstant("2026-08-10", "15:55"))).toBe(0);
    expect(await sendHousingStatusReminders(db, jerusalemInstant("2026-08-10", "18:00"))).toBe(0);
    expect(notified()).toEqual([]);
  });

  it("שולח פעם אחת ביום בלבד", async () => {
    const { shift } = setup();
    shift("2026-08-10", [user()]);
    shift("2026-08-11", [user()]);
    expect(await sendHousingStatusReminders(db, jerusalemInstant("2026-08-10", "16:00"))).toBe(2);
    expect(await sendHousingStatusReminders(db, jerusalemInstant("2026-08-10", "16:10"))).toBe(0);
    expect(notified()).toHaveLength(2);
    expect(await sendHousingStatusReminders(db, jerusalemInstant("2026-08-11", "16:00"))).toBe(1);
  });
});
