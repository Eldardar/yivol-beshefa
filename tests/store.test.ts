import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { StoreService } from "@/lib/services/store";

let db: Database.Database;
let dir: string;
beforeEach(() => { db = createTestDb(); dir = fs.mkdtempSync(path.join(os.tmpdir(), "store-")); });
afterEach(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(insert.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  return { admin, picker, service: new StoreService(db, dir) };
}
const base = { name: " כובע ", description: "  כובע שמש  ", price: "25.5" };
const png = { bytes: Buffer.from("png-bytes"), mime: "image/png" as const };

describe("חנות", () => {
  it("יוצר מוצר עם תמונה ומתעד ביומן הביקורת", () => {
    const x = setup();
    const id = x.service.save(x.admin, null, base, png);
    expect(x.service.list()).toEqual([expect.objectContaining({ id, name: "כובע", description: "כובע שמש", price: 25.5, has_image: 1 })]);
    expect(fs.readFileSync(x.service.getImage(id)!.path)).toEqual(png.bytes);
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='STORE_PRODUCT' AND entity_id=?").get(id)).toEqual({ action: "CREATE" });
  });

  it("רק מנהל יכול לנהל מוצרים, ודוחה מחיר שלילי ושם ריק", () => {
    const x = setup();
    expect(() => x.service.save(x.picker, null, base)).toThrow("אין הרשאה");
    expect(() => x.service.save(x.admin, null, { ...base, price: "-1" })).toThrow();
    expect(() => x.service.save(x.admin, null, { ...base, name: " " })).toThrow();
    const id = x.service.save(x.admin, null, base);
    expect(() => x.service.delete(x.picker, id)).toThrow("אין הרשאה");
  });

  it("עדכון מחליף תמונה ומוחק את הקודמת, ובלי תמונה חדשה שומר את הקיימת", () => {
    const x = setup();
    const id = x.service.save(x.admin, null, base, png);
    const first = x.service.getImage(id)!.path;
    x.service.save(x.admin, id, { ...base, price: "30" });
    expect(x.service.getImage(id)!.path).toBe(first);
    x.service.save(x.admin, id, base, { bytes: Buffer.from("webp"), mime: "image/webp" });
    const second = x.service.getImage(id)!;
    expect(second.mime).toBe("image/webp");
    expect(fs.existsSync(first)).toBe(false);
    x.service.save(x.admin, id, base, null);
    expect(x.service.getImage(id)).toBeUndefined();
    expect(fs.existsSync(second.path)).toBe(false);
  });

  it("מחיקה מסירה את המוצר ואת התמונה", () => {
    const x = setup();
    const id = x.service.save(x.admin, null, base, png);
    const image = x.service.getImage(id)!.path;
    x.service.delete(x.admin, id);
    expect(x.service.list()).toEqual([]);
    expect(fs.existsSync(image)).toBe(false);
    expect(() => x.service.delete(x.admin, id)).toThrow("המוצר לא נמצא");
  });
});
