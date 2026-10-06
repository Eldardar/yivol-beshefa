import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { workerShiftsBetween, workerVillageNightsBetween } from "@/lib/worker-calendar";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(insert.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const leader = Number(insert.run("מוביל", "leader@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "").lastInsertRowid);
  const shift = (date: string, status: string, pickers: number[]) => {
    const id = Number(db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,notes,created_by,status) VALUES(?,?,?,?,?,?,?,?)").run(date, "06:00", "12:00", field, leader, "", admin, status).lastInsertRowid);
    for (const p of pickers) db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)").run(id, p);
    return id;
  };
  return { admin, picker, leader, shift };
}

describe("לוח חודשי לעובד", () => {
  it("מציג רק משמרות שפורסמו או הושלמו שהעובד משובץ אליהן או מוביל", () => {
    const x = setup();
    const past = x.shift("2026-10-01", "COMPLETED", [x.picker]);
    const future = x.shift("2026-10-20", "PUBLISHED", [x.picker]);
    x.shift("2026-10-21", "DRAFT", [x.picker]);
    x.shift("2026-10-22", "CANCELLED", [x.picker]);
    const notMine = x.shift("2026-10-23", "PUBLISHED", []);
    x.shift("2026-11-02", "PUBLISHED", [x.picker]);
    expect(workerShiftsBetween(db, x.picker, "2026-10-01", "2026-11-01").map(s => s.id)).toEqual([past, future]);
    expect(workerShiftsBetween(db, x.leader, "2026-10-01", "2026-11-01").map(s => s.id)).toEqual([past, future, notMine]);
  });

  it("מציג לינות בכפר עם הכפר ואפשרות הלינה, בלי ימי היעדרות", () => {
    const x = setup();
    const village = Number(db.prepare("INSERT INTO villages(name,description,location) VALUES(?,?,?)").run("כפר", "", "").lastInsertRowid);
    const option = Number(db.prepare("INSERT INTO village_sleeping_options(village_id,name,description,cost_per_day) VALUES(?,?,?,?)").run(village, "אוהל", "", 40).lastInsertRowid);
    const status = db.prepare("INSERT INTO housing_status(user_id,date,status,sleeping_option_id) VALUES(?,?,?,?)");
    status.run(x.picker, "2026-10-05", "IN_VILLAGE", option);
    status.run(x.picker, "2026-10-06", "MAYBE", null);
    status.run(x.picker, "2026-10-07", "AWAY", null);
    status.run(x.leader, "2026-10-05", "IN_VILLAGE", option);
    expect(workerVillageNightsBetween(db, x.picker, "2026-10-01", "2026-11-01")).toEqual([
      { date: "2026-10-05", status: "IN_VILLAGE", village: "כפר", option: "אוהל" },
      { date: "2026-10-06", status: "MAYBE", village: null, option: null }
    ]);
  });
});
