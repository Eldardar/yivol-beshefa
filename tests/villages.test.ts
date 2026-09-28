import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AdminService } from "@/lib/services/admin";
import { VillageService } from "@/lib/services/villages";

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
