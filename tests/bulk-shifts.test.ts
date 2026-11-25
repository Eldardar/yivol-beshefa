import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { MAX_BULK_DATES, NO_LEADER_WARNING, SchedulingService } from "@/lib/services/scheduling";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,1)");
  const admin = Number(insert.run("מנהל", "a@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "p@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const farm = db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid;
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "").lastInsertRowid);
  return { admin, picker, field };
}

const base = (field: number) => ({ startTime: "06:00", endTime: "12:00", plantationFieldId: field, pickerIds: [] as number[], leaderId: "none", vehicleIds: [] as number[], goals: [{ unit: "KG" as const, goal: 5 }], personalGoalUnits: ["KG" as const], notes: "הערה" });
const count = () => (db.prepare("SELECT COUNT(*) n FROM shifts").get() as { n: number }).n;

describe("יצירת משמרות מרובה", () => {
  it("יוצרת משמרת זהה לכל תאריך ייחודי", () => {
    const x = setup();
    const { shiftIds, warnings } = new SchedulingService(db).createShifts(x.admin, base(x.field), ["2099-08-12", "2099-08-10", "2099-08-12"]);
    expect(shiftIds).toHaveLength(2);
    const rows = db.prepare("SELECT date,start_time,notes FROM shifts ORDER BY date").all();
    expect(rows).toEqual([{ date: "2099-08-10", start_time: "06:00", notes: "הערה" }, { date: "2099-08-12", start_time: "06:00", notes: "הערה" }]);
    expect((db.prepare("SELECT COUNT(*) n FROM shift_goals").get() as { n: number }).n).toBe(2);
    expect((db.prepare("SELECT COUNT(*) n FROM shift_goal_units").get() as { n: number }).n).toBe(2);
    expect(warnings).toEqual([NO_LEADER_WARNING]);
  });
  it("הכל או כלום — שגיאה בתאריך אחד מבטלת את כל המשמרות, עם התאריך בהודעה", () => {
    const x = setup();
    db.prepare("INSERT INTO availability(user_id,date,status) VALUES(?,?,?)").run(x.picker, "2099-08-10", "AVAILABLE");
    const input = { ...base(x.field), pickerIds: [x.picker], leaderId: x.picker };
    expect(() => new SchedulingService(db).createShifts(x.admin, input, ["2099-08-10", "2099-08-11"])).toThrow("11/08/2099: קוטף אינו זמין");
    expect(count()).toBe(0);
  });
  it("דוחה רשימה ריקה או ארוכה מדי", () => {
    const x = setup();
    const s = new SchedulingService(db);
    expect(() => s.createShifts(x.admin, base(x.field), [])).toThrow("לפחות תאריך אחד");
    const many = Array.from({ length: MAX_BULK_DATES + 1 }, (_, i) => new Date(Date.UTC(2099, 0, 1 + i)).toISOString().slice(0, 10));
    expect(() => s.createShifts(x.admin, base(x.field), many)).toThrow(String(MAX_BULK_DATES));
    expect(count()).toBe(0);
  });
});
