import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { SiteContentService } from "@/lib/services/site-content";
import { galleryPhotoUrl, quoteDir } from "@/lib/site-content";

let db: Database.Database;
let dir: string;
beforeEach(() => { db = createTestDb(); dir = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-")); });
afterEach(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(insert.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  return { admin, picker, service: new SiteContentService(db, dir) };
}
const png = { bytes: Buffer.from("png-bytes"), mime: "image/png" as const };

describe("תוכן האתר", () => {
  it("מתחיל ללא תמונות וללא ציטוטים", () => {
    const x = setup();
    expect(x.service.listPhotos()).toEqual([]);
    expect(x.service.listQuotes()).toEqual([]);
  });

  it("מעלה ומוחק תמונה, כולל הקובץ מהדיסק, בלי למחזר מזהים", () => {
    const x = setup();
    const id = x.service.addPhoto(x.admin, png);
    const file = x.service.getPhotoImage(id)!.path;
    expect(fs.readFileSync(file)).toEqual(png.bytes);
    expect(galleryPhotoUrl(x.service.listPhotos().at(-1)!)).toBe(`/api/gallery/${id}/image`);
    x.service.deletePhoto(x.admin, id);
    expect(fs.existsSync(file)).toBe(false);
    expect(x.service.addPhoto(x.admin, png)).toBeGreaterThan(id);
    expect(() => x.service.deletePhoto(x.admin, id)).toThrow("התמונה לא נמצאה");
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='GALLERY_PHOTO' AND entity_id=? ORDER BY id").all(id)).toEqual([{ action: "CREATE" }, { action: "DELETE" }]);
  });

  it("מוסיף ומוחק ציטוטים, ודוחה ציטוט ריק", () => {
    const x = setup();
    const id = x.service.addQuote(x.admin, { text: "  קוטפים בשמחה  ", cite: " דנה " });
    expect(x.service.listQuotes()).toEqual([{ id, text: "קוטפים בשמחה", cite: "דנה" }]);
    expect(() => x.service.addQuote(x.admin, { text: " ", cite: "דנה" })).toThrow();
    x.service.deleteQuote(x.admin, id);
    expect(x.service.listQuotes()).toEqual([]);
    expect(() => x.service.deleteQuote(x.admin, id)).toThrow("הציטוט לא נמצא");
  });

  it("רק מנהל יכול לנהל תוכן", () => {
    const x = setup();
    expect(() => x.service.addPhoto(x.picker, png)).toThrow("אין הרשאה");
    expect(() => x.service.deletePhoto(x.picker, 1)).toThrow("אין הרשאה");
    expect(() => x.service.addQuote(x.picker, { text: "x", cite: "y" })).toThrow("אין הרשאה");
    expect(() => x.service.deleteQuote(x.picker, 1)).toThrow("אין הרשאה");
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("מזהה כיוון כתיבה של ציטוט", () => {
    expect(quoteDir("Ooga Booga")).toBe("ltr");
    expect(quoteDir("היידה תפוחים")).toBe("rtl");
  });
});
