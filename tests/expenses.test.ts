import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { ExpenseService } from "@/lib/services/expenses";
import { resolveExpensePeriod } from "@/lib/expenses";

let db: Database.Database;
let dir: string;
let admin: number;
beforeEach(() => {
  db = createTestDb();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "expenses-"));
  admin = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
});
afterEach(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

describe("הוצאות", () => {
  it("שומר הוצאה ידנית, משלים שנת מס ומציג אותה בחודש העסקה בלבד", () => {
    const service = new ExpenseService(db, dir);
    const id = service.create(admin, "MANUAL", { invoice_date: "2026-08-14", supplier_name: " משתלה ", total_ils: "117.5", vat: "" });
    const row = db.prepare("SELECT supplier_name,total_ils,vat,tax_year,processing_date FROM expenses WHERE id=?").get(id) as Record<string, unknown>;
    expect(row).toMatchObject({ supplier_name: "משתלה", total_ils: 117.5, vat: null, tax_year: 2026 });
    expect(row.processing_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(service.listForMonth(2026, 8).map(r => r.id)).toEqual([id]);
    expect(service.listForMonth(2026, 9)).toEqual([]);
  });

  it("דוחה תאריך או סכום לא תקינים", () => {
    const service = new ExpenseService(db, dir);
    expect(() => service.create(admin, "MANUAL", { invoice_date: "14/08/2026" })).toThrow();
    expect(() => service.create(admin, "MANUAL", { total_ils: "abc" })).toThrow();
  });

  it("שומר את קובץ המקור וקושר אותו להוצאה", () => {
    const service = new ExpenseService(db, dir);
    const id = service.create(admin, "CAMERA", { invoice_date: "2026-08-01" }, { bytes: Buffer.from("pdf"), mime: "application/pdf" });
    const file = service.getFile(id)!;
    expect(fs.readFileSync(file.path, "utf8")).toBe("pdf");
    expect(file.mime).toBe("application/pdf");
    expect(db.prepare("SELECT new_file_name,file_link FROM expenses WHERE id=?").get(id)).toEqual({ new_file_name: `expense-${id}.pdf`, file_link: `/api/admin/expenses/${id}/file` });
    expect(service.listForMonth(2026, 8)[0]).toMatchObject({ source: "CAMERA", has_file: 1 });
  });
});

describe("ייצוא הוצאות", () => {
  it("מחזיר את כל השדות של הוצאות החודש בלבד", () => {
    const service = new ExpenseService(db, dir);
    service.create(admin, "MANUAL", { invoice_date: "2026-08-03", supplier_name: "ספק", total_ils: 100, trip: "גליל" });
    service.create(admin, "UPLOAD", { invoice_date: "2026-09-01" });
    const rows = service.listForMonth(2026, 8);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ has_file: 0, source: "MANUAL", supplier_name: "ספק", total_ils: 100, trip: "גליל", tax_year: 2026, review_notes: null });
  });
});

describe("הוצאות שנכשלו בחילוץ", () => {
  it("ממתינות ברשימה נפרדת עם הערכים שחולצו, ועוברות לטבלה אחרי השלמה ידנית", () => {
    const service = new ExpenseService(db, dir);
    const id = service.create(admin, "UPLOAD", { supplier_name: "ספק חלקי", review_notes: "לא זוהו: תאריך עסקה" }, { bytes: Buffer.from("x"), mime: "image/png" }, { extractionFailed: true });
    expect(service.listFailed().map(r => r.id)).toEqual([id]);
    expect(service.listFailed()[0]).toMatchObject({ supplier_name: "ספק חלקי", file_mime: "image/png", has_file: 1 });
    const month = Number(new Date().toISOString().slice(5, 7)), year = Number(new Date().toISOString().slice(0, 4));
    expect(service.listForMonth(year, month)).toEqual([]);

    service.update(admin, id, { invoice_date: "2026-07-20", supplier_name: "ספק מלא", total_ils: "50" });
    expect(service.listFailed()).toEqual([]);
    expect(service.listForMonth(2026, 7)[0]).toMatchObject({ id, supplier_name: "ספק מלא", total_ils: 50, tax_year: 2026, file_link: `/api/admin/expenses/${id}/file` });
  });

  it("שומרת מועד יצירה ומעדכנת את מועד העדכון האחרון", () => {
    const service = new ExpenseService(db, dir);
    const id = service.create(admin, "MANUAL", { invoice_date: "2026-07-20" });
    db.prepare("UPDATE expenses SET created_at='2026-01-01 08:00:00',updated_at='2026-01-01 08:00:00' WHERE id=?").run(id);
    service.update(admin, id, { invoice_date: "2026-07-20", supplier_name: "ספק" });
    const row = service.list().find(r => r.id === id)!;
    expect(row.created_at).toBe("2026-01-01 08:00:00");
    expect(row.updated_at! > row.created_at).toBe(true);
  });

  it("עדכון הוצאה שאינה קיימת נכשל", () => {
    expect(() => new ExpenseService(db, dir).update(admin, 999, { invoice_date: "2026-07-20" })).toThrow("ההוצאה לא נמצאה");
  });
});

describe("מחיקת הוצאות", () => {
  it("מוחקת את ההוצאה ואת קובץ המקור", () => {
    const service = new ExpenseService(db, dir);
    const id = service.create(admin, "UPLOAD", { invoice_date: "2026-08-01" }, { bytes: Buffer.from("x"), mime: "application/pdf" }, { extractionFailed: true });
    const filePath = service.getFile(id)!.path;
    service.delete(admin, id);
    expect(fs.existsSync(filePath)).toBe(false);
    expect(service.listFailed()).toEqual([]);
    expect(() => service.delete(admin, id)).toThrow("ההוצאה לא נמצאה");
  });

  it("מסנן לפי טווח תאריכים, וללא טווח מחזיר את כל ההוצאות", () => {
    const service = new ExpenseService(db, dir);
    const a = service.create(admin, "MANUAL", { invoice_date: "2025-12-31" });
    const b = service.create(admin, "MANUAL", { invoice_date: "2026-03-10" });
    const c = service.create(admin, "MANUAL", { invoice_date: "2026-03-11" });
    expect(service.list().map(r => r.id)).toEqual([a, b, c]);
    expect(service.list(resolveExpensePeriod({ view: "year", y: "2026" }, "2026-10-01").range).map(r => r.id)).toEqual([b, c]);
    expect(service.list(resolveExpensePeriod({ view: "custom", from: "2025-12-31", to: "2026-03-10" }, "2026-10-01").range).map(r => r.id)).toEqual([a, b]);
  });
});

describe("תקופת תצוגת ההוצאות", () => {
  const today = "2026-10-01";
  it("ברירת המחדל היא כל הזמנים", () => {
    expect(resolveExpensePeriod({}, today)).toMatchObject({ view: "all", range: {}, label: "כל הזמנים" });
    expect(resolveExpensePeriod({ view: "bogus" }, today).view).toBe("all");
  });
  it("חודשי ושנתי", () => {
    expect(resolveExpensePeriod({ view: "month", y: "2026", m: "12" }, today)).toMatchObject({ range: { start: "2026-12-01", end: "2027-01-01" }, label: "דצמבר 2026", fileLabel: "12-2026" });
    expect(resolveExpensePeriod({ view: "year" }, today)).toMatchObject({ year: 2026, range: { start: "2026-01-01", end: "2027-01-01" } });
  });
  it("טווח מותאם כולל את יום הסיום, מחליף סדר הפוך ומתעלם מתאריכים לא תקינים", () => {
    expect(resolveExpensePeriod({ view: "custom", from: "2026-02-28", to: "2026-01-15" }, today)).toMatchObject({ from: "2026-01-15", to: "2026-02-28", range: { start: "2026-01-15", end: "2026-03-01" }, label: "15-01-2026 עד 28-02-2026" });
    expect(resolveExpensePeriod({ view: "custom", from: "2026-02-30", to: "x" }, today)).toMatchObject({ from: "2026-10-01", to: "2026-10-01" });
  });
});
