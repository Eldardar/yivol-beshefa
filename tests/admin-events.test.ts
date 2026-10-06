import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AdminEventService } from "@/lib/services/admin-events";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => db.close());

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(insert.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const other = Number(insert.run("מנהל ב", "other@example.com", "0500000002", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  return { admin, other, picker };
}
const base = { name: "פגישה", startDate: "2026-10-06", endDate: "2026-10-06", isPublished: false, details: "  פרטים  " };

describe("אירועי מנהל", () => {
  it("יוצר אירוע ומתעד ביומן הביקורת", () => {
    const x = setup();
    const id = new AdminEventService(db).save(x.admin, null, base);
    expect(db.prepare("SELECT created_by,name,start_date,end_date,is_published,details FROM admin_events WHERE id=?").get(id)).toEqual({ created_by: x.admin, name: "פגישה", start_date: "2026-10-06", end_date: "2026-10-06", is_published: 0, details: "פרטים" });
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='ADMIN_EVENT' AND entity_id=?").get(id)).toEqual({ action: "CREATE" });
  });

  it("דוחה קוטף, שם ריק ותאריך סיום מוקדם מההתחלה", () => {
    const x = setup();
    const service = new AdminEventService(db);
    expect(() => service.save(x.picker, null, base)).toThrow("אין הרשאה");
    expect(() => service.save(x.admin, null, { ...base, name: " " })).toThrow();
    expect(() => service.save(x.admin, null, { ...base, endDate: "2026-10-05" })).toThrow();
  });

  it("אירוע פרטי גלוי רק ליוצרו ומפורסם גלוי לכולם", () => {
    const x = setup();
    const service = new AdminEventService(db);
    const priv = service.save(x.admin, null, base);
    const pub = service.save(x.admin, null, { ...base, name: "כנס", isPublished: true });
    expect(service.visibleBetween(x.admin, "2026-10-01", "2026-11-01").map(e => e.id)).toEqual([priv, pub]);
    expect(service.visibleBetween(x.other, "2026-10-01", "2026-11-01").map(e => e.id)).toEqual([pub]);
  });

  it("מחזיר אירועים חוצי חודש לפי חפיפה", () => {
    const x = setup();
    const service = new AdminEventService(db);
    const id = service.save(x.admin, null, { ...base, startDate: "2026-09-28", endDate: "2026-10-02" });
    expect(service.visibleBetween(x.admin, "2026-10-01", "2026-11-01").map(e => e.id)).toEqual([id]);
    expect(service.visibleBetween(x.admin, "2026-11-01", "2026-12-01")).toEqual([]);
  });

  it("רק היוצר יכול לעדכן ולמחוק", () => {
    const x = setup();
    const service = new AdminEventService(db);
    const id = service.save(x.admin, null, base);
    expect(() => service.save(x.other, id, { ...base, name: "שונה" })).toThrow("האירוע לא נמצא");
    expect(() => service.delete(x.other, id)).toThrow("האירוע לא נמצא");
    service.save(x.admin, id, { ...base, name: "שונה", isPublished: true });
    expect(db.prepare("SELECT name,is_published FROM admin_events WHERE id=?").get(id)).toEqual({ name: "שונה", is_published: 1 });
    expect(service.delete(x.admin, id)).toBe("2026-10-06");
    expect(db.prepare("SELECT 1 FROM admin_events WHERE id=?").get(id)).toBeUndefined();
  });
});
