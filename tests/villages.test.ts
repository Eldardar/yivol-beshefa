import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AdminService } from "@/lib/services/admin";
import { VillageService } from "@/lib/services/villages";
import { PickerService } from "@/lib/services/picker";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const admin = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  return { admin, picker };
}
const base = { name: "כפר א", description: "תיאור", location: "גליל", sleepingOptions: [{ name: "אוהל", description: "", costPerDay: "50" }, { name: "קרוואן", description: "מזגן", costPerDay: "120" }], availableMonths: ["10", "3", "3"] };

describe("כפרים", () => {
  it("יוצר כפר עם אפשרויות לינה וחודשים זמינים", () => {
    const x = setup();
    const id = new VillageService(db).save(x.admin, null, base);
    expect(db.prepare("SELECT name,description,location,active FROM villages WHERE id=?").get(id)).toEqual({ name: "כפר א", description: "תיאור", location: "גליל", active: 1 });
    expect(db.prepare("SELECT name,cost_per_day FROM village_sleeping_options WHERE village_id=? ORDER BY id").all(id)).toEqual([{ name: "אוהל", cost_per_day: 50 }, { name: "קרוואן", cost_per_day: 120 }]);
    expect(db.prepare("SELECT month FROM village_available_months WHERE village_id=? ORDER BY month").all(id)).toEqual([{ month: 3 }, { month: 10 }]);
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='VILLAGE' AND entity_id=?").get(id)).toEqual({ action: "CREATE" });
  });

  it("עדכון מסנכרן אפשרויות לינה: מעדכן, מוסיף ומסיר", () => {
    const x = setup();
    const service = new VillageService(db);
    const id = service.save(x.admin, null, base);
    const [tent] = db.prepare("SELECT id FROM village_sleeping_options WHERE village_id=? ORDER BY id").all(id) as Array<{ id: number }>;
    service.save(x.admin, id, { ...base, sleepingOptions: [{ id: String(tent!.id), name: "אוהל גדול", description: "", costPerDay: "60" }, { name: "חדר", description: "", costPerDay: "200" }], availableMonths: [] });
    expect(db.prepare("SELECT id,name,cost_per_day FROM village_sleeping_options WHERE village_id=? ORDER BY id").all(id)).toEqual([{ id: tent!.id, name: "אוהל גדול", cost_per_day: 60 }, expect.objectContaining({ name: "חדר", cost_per_day: 200 })]);
    expect(db.prepare("SELECT count(*) count FROM village_available_months WHERE village_id=?").get(id)).toEqual({ count: 0 });
  });

  it("דוחה אפשרות לינה של כפר אחר, עלות שלילית, חודש לא תקין ומשתמש שאינו מנהל", () => {
    const x = setup();
    const service = new VillageService(db);
    const a = service.save(x.admin, null, base);
    const b = service.save(x.admin, null, { ...base, name: "כפר ב" });
    const [foreign] = db.prepare("SELECT id FROM village_sleeping_options WHERE village_id=?").all(a) as Array<{ id: number }>;
    expect(() => service.save(x.admin, b, { ...base, sleepingOptions: [{ id: String(foreign!.id), name: "גניבה", description: "", costPerDay: "1" }] })).toThrow("לא נמצאה");
    expect(() => service.save(x.admin, null, { ...base, sleepingOptions: [{ name: "אוהל", description: "", costPerDay: "-1" }] })).toThrow();
    expect(() => service.save(x.admin, null, { ...base, availableMonths: ["13"] })).toThrow();
    expect(() => service.save(x.picker, null, base)).toThrow("אין הרשאה");
  });

  it("ארכוב ומחיקה של כפר מוחקים גם את אפשרויות הלינה והחודשים", () => {
    const x = setup();
    const id = new VillageService(db).save(x.admin, null, base);
    const admin = new AdminService(db);
    admin.setActive(x.admin, "VILLAGE", id, false);
    admin.deleteEntity(x.admin, "VILLAGE", id);
    expect(db.prepare("SELECT count(*) count FROM village_sleeping_options").get()).toEqual({ count: 0 });
    expect(db.prepare("SELECT count(*) count FROM village_available_months").get()).toEqual({ count: 0 });
  });
});

describe("שמירת לינה בכפר ע\"י עובד", () => {
  const now = new Date("2026-10-01T08:00:00Z");
  function booked() {
    const x = setup();
    const village = new VillageService(db).save(x.admin, null, base);
    const [tent, caravan] = db.prepare("SELECT id FROM village_sleeping_options WHERE village_id=? ORDER BY id").all(village) as Array<{ id: number }>;
    return { ...x, village, tent: tent!.id, caravan: caravan!.id };
  }
  const saved = (userId: number) => db.prepare("SELECT date,status,sleeping_option_id FROM housing_status WHERE user_id=? ORDER BY date").all(userId);

  it("שומר את אפשרות הלינה עם 'ישן בכפר' ו'אולי', ומנקה אותה ב'במקום אחר'", () => {
    const x = booked();
    const service = new PickerService(db);
    service.setHousingStatus(x.picker, { entries: [{ date: "2026-10-05", status: "IN_VILLAGE", sleepingOptionId: x.tent }, { date: "2026-10-06", status: "MAYBE", sleepingOptionId: x.caravan }] }, now);
    expect(saved(x.picker)).toEqual([{ date: "2026-10-05", status: "IN_VILLAGE", sleeping_option_id: x.tent }, { date: "2026-10-06", status: "MAYBE", sleeping_option_id: x.caravan }]);
    service.setHousingStatus(x.picker, { entries: [{ date: "2026-10-05", status: "AWAY", sleepingOptionId: x.tent }] }, now);
    expect(saved(x.picker)[0]).toEqual({ date: "2026-10-05", status: "AWAY", sleeping_option_id: null });
  });

  it("דוחה אפשרות לינה בחודש סגור או בכפר בארכיון", () => {
    const x = booked();
    const service = new PickerService(db);
    expect(() => service.setHousingStatus(x.picker, { entries: [{ date: "2026-11-05", status: "IN_VILLAGE", sleepingOptionId: x.tent }] }, now)).toThrow("אינה זמינה");
    new AdminService(db).setActive(x.admin, "VILLAGE", x.village, false);
    expect(() => service.setHousingStatus(x.picker, { entries: [{ date: "2026-10-05", status: "IN_VILLAGE", sleepingOptionId: x.tent }] }, now)).toThrow("אינה זמינה");
    expect(saved(x.picker)).toEqual([]);
  });

  it("מחיקת אפשרות לינה משאירה את היום עם סטטוס בלי אפשרות", () => {
    const x = booked();
    new PickerService(db).setHousingStatus(x.picker, { entries: [{ date: "2026-10-05", status: "IN_VILLAGE", sleepingOptionId: x.tent }] }, now);
    new VillageService(db).save(x.admin, x.village, { ...base, sleepingOptions: [{ id: String(x.caravan), name: "קרוואן", description: "", costPerDay: "120" }] });
    expect(saved(x.picker)).toEqual([{ date: "2026-10-05", status: "IN_VILLAGE", sleeping_option_id: null }]);
  });
});

describe("דוח מגורים", () => {
  it("סופר לילות ועלות לכל עובד/ת בטווח הנבחר", async () => {
    const { getHousingReport } = await import("@/lib/housing-report");
    const x = setup();
    const other = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטפת", "picker2@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
    const id = new VillageService(db).save(x.admin, null, base);
    const [tent, caravan] = db.prepare("SELECT id FROM village_sleeping_options WHERE village_id=? ORDER BY id").all(id) as Array<{ id: number }>;
    const insert = db.prepare("INSERT INTO housing_status(user_id,date,status,sleeping_option_id) VALUES(?,?,?,?)");
    insert.run(x.picker, "2026-10-01", "IN_VILLAGE", tent!.id);
    insert.run(x.picker, "2026-10-02", "IN_VILLAGE", caravan!.id);
    insert.run(x.picker, "2026-10-03", "IN_VILLAGE", null);
    insert.run(x.picker, "2026-10-04", "MAYBE", tent!.id);
    insert.run(x.picker, "2026-11-01", "IN_VILLAGE", caravan!.id);
    insert.run(other, "2026-10-05", "AWAY", null);

    expect(getHousingReport(db, { start: "2026-10-01", end: "2026-11-01" })).toEqual([
      { user_id: x.picker, name: "קוטף", active: 1, nights: 3, cost: 170, unpriced_nights: 1 }
    ]);
    expect(getHousingReport(db, {})).toEqual([
      { user_id: x.picker, name: "קוטף", active: 1, nights: 4, cost: 290, unpriced_nights: 1 }
    ]);
  });

  it("מפענח את תקופת הדוח מפרמטרי ה-URL", async () => {
    const { resolveHousingReportPeriod } = await import("@/lib/housing-report");
    expect(resolveHousingReportPeriod({}, "2026-10-01")).toMatchObject({ view: "all", range: {} });
    expect(resolveHousingReportPeriod({ view: "monthly", y: "2026", m: "2" }, "2026-10-01")).toMatchObject({ range: { start: "2026-02-01", end: "2026-03-01" }, label: "פברואר 2026" });
    expect(resolveHousingReportPeriod({ view: "yearly", y: "2025" }, "2026-10-01")).toMatchObject({ range: { start: "2025-01-01", end: "2026-01-01" }, label: "2025" });
    expect(resolveHousingReportPeriod({ view: "yearly", y: "bad" }, "2026-10-01")).toMatchObject({ year: 2026 });
  });
});

describe("פירוט לילות בדוח מגורים", () => {
  it("מחזיר את הלילות של כל עובד/ת בטווח עם מיקום, אפשרות לינה ועלות", async () => {
    const { getHousingNights } = await import("@/lib/housing-report");
    const x = setup();
    const id = new VillageService(db).save(x.admin, null, base);
    const [tent] = db.prepare("SELECT id FROM village_sleeping_options WHERE village_id=? ORDER BY id").all(id) as Array<{ id: number }>;
    const insert = db.prepare("INSERT INTO housing_status(user_id,date,status,sleeping_option_id) VALUES(?,?,?,?)");
    insert.run(x.picker, "2026-10-02", "IN_VILLAGE", null);
    insert.run(x.picker, "2026-10-01", "IN_VILLAGE", tent!.id);
    insert.run(x.picker, "2026-10-03", "MAYBE", tent!.id);
    insert.run(x.picker, "2026-11-01", "IN_VILLAGE", tent!.id);

    expect(getHousingNights(db, { start: "2026-10-01", end: "2026-11-01" })).toEqual({
      [x.picker]: [
        { date: "2026-10-01", village: "כפר א", sleeping_option: "אוהל", cost: 50 },
        { date: "2026-10-02", village: null, sleeping_option: null, cost: null }
      ]
    });
  });
});
