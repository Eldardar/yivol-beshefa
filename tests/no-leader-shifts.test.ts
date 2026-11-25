import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { getShiftsByFarmer, getShiftsByWorker, getTripsByVehicle, loadShiftsPageData } from "@/lib/shifts-data";
import { workerShiftsBetween } from "@/lib/worker-calendar";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(insert.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const farm = Number(db.prepare("INSERT INTO farms(name,contact_person,phone,address) VALUES(?,?,?,?)").run("משק", "איש", "0500000003", "כתובת").lastInsertRowid);
  const field = Number(db.prepare("INSERT INTO plantation_fields(farm_id,fruit_type,fruit_subtype) VALUES(?,?,?)").run(farm, "תות", "").lastInsertRowid);
  const vehicle = Number(db.prepare("INSERT INTO vehicles(number,name) VALUES(?,?)").run("12", "טנדר").lastInsertRowid);
  const shift = Number(db.prepare("INSERT INTO shifts(date,start_time,end_time,plantation_field_id,leader_id,notes,created_by,status) VALUES(?,?,?,?,NULL,'',?,'COMPLETED')").run("2026-10-01", "06:00", "12:00", field, admin).lastInsertRowid);
  db.prepare("INSERT INTO shift_pickers(shift_id,user_id) VALUES(?,?)").run(shift, picker);
  db.prepare("INSERT INTO shift_vehicles(shift_id,vehicle_id) VALUES(?,?)").run(shift, vehicle);
  return { picker, farm, vehicle, shift };
}

describe("משמרת ללא מוביל", () => {
  it("נכללת בדוחות ובטבלת המשמרות עם 'ללא' כמוביל", () => {
    const x = setup();
    expect(loadShiftsPageData(db).shifts.find(r => r.id === x.shift)?.leader).toBe("ללא");
    expect(getShiftsByWorker(db, "2026-11-01")[x.picker]?.map(r => [r.id, r.leader])).toEqual([[x.shift, "ללא"]]);
    expect(getShiftsByFarmer(db, "2026-11-01")[x.farm]?.map(r => [r.id, r.leader])).toEqual([[x.shift, "ללא"]]);
    expect(getTripsByVehicle(db, "2026-11-01")[x.vehicle]?.map(r => [r.id, r.leader])).toEqual([[x.shift, "ללא"]]);
  });
  it("מופיעה בלוח העובד בלי שדה מוביל", () => {
    const x = setup();
    expect(workerShiftsBetween(db, x.picker, "2026-10-01", "2026-11-01").map(s => [s.id, s.leader])).toEqual([[x.shift, null]]);
  });
});
