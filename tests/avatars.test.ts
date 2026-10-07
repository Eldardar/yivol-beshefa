import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { AvatarService } from "@/lib/services/avatars";
import { topSnakeScores } from "@/lib/snake-scores";

let db: Database.Database;
let dir: string;
beforeEach(() => { db = createTestDb(); dir = fs.mkdtempSync(path.join(os.tmpdir(), "avatars-")); });
afterEach(() => { db.close(); fs.rmSync(dir, { recursive: true, force: true }); });

function setup() {
  const insert = db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)");
  const admin = Number(insert.run("מנהל", "admin@example.com", "0500000000", "ADMIN", "x").lastInsertRowid);
  const picker = Number(insert.run("קוטף", "picker@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
  const other = Number(insert.run("קוטפת", "other@example.com", "0500000002", "PICKER", "x").lastInsertRowid);
  return { admin, picker, other, service: new AvatarService(db, dir) };
}
const png = { bytes: Buffer.from("png-bytes"), mime: "image/png" as const };
const jpeg = { bytes: Buffer.from("jpeg-bytes"), mime: "image/jpeg" as const };

describe("תמונות פרופיל", () => {
  it("משתמש מעלה, מחליף ומסיר את התמונה שלו, והקובץ הקודם נמחק", () => {
    const x = setup();
    expect(x.service.version(x.picker)).toBeNull();
    x.service.set(x.picker, x.picker, png);
    const first = x.service.getImage(x.picker)!;
    const firstVersion = x.service.version(x.picker);
    expect(fs.readFileSync(first.path)).toEqual(png.bytes);
    x.service.set(x.picker, x.picker, jpeg);
    expect(x.service.version(x.picker)).not.toBe(firstVersion);
    expect(fs.existsSync(first.path)).toBe(false);
    const second = x.service.getImage(x.picker)!;
    expect(second.mime).toBe("image/jpeg");
    x.service.set(x.picker, x.picker, null);
    expect(x.service.getImage(x.picker)).toBeUndefined();
    expect(x.service.version(x.picker)).toBeNull();
    expect(fs.existsSync(second.path)).toBe(false);
    expect(db.prepare("SELECT action FROM audit_events WHERE entity_type='USER' AND entity_id=? ORDER BY id").all(x.picker)).toEqual([{ action: "AVATAR_UPDATE" }, { action: "AVATAR_UPDATE" }, { action: "AVATAR_DELETE" }]);
  });

  it("עובד לא יכול לשנות תמונה של אחר, ומנהל יכול לשנות של כל משתמש", () => {
    const x = setup();
    expect(() => x.service.set(x.picker, x.other, png)).toThrow("אין הרשאה");
    expect(() => x.service.set(x.picker, x.admin, png)).toThrow("אין הרשאה");
    x.service.set(x.admin, x.other, png);
    expect(x.service.getImage(x.other)).toBeDefined();
    x.service.set(x.admin, x.other, null);
    expect(x.service.getImage(x.other)).toBeUndefined();
    expect(() => x.service.set(x.admin, 9999, png)).toThrow("המשתמש לא נמצא");
    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("טבלת השיאים של הנחש כוללת את גרסת התמונה", () => {
    const x = setup();
    x.service.set(x.picker, x.picker, png);
    db.prepare("INSERT INTO snake_scores(user_id,score) VALUES(?,?),(?,?)").run(x.picker, 10, x.other, 5);
    const scores = topSnakeScores(db);
    expect(scores[0]).toEqual(expect.objectContaining({ userId: x.picker, avatarVersion: x.service.version(x.picker) }));
    expect(scores[1]).toEqual(expect.objectContaining({ userId: x.other, avatarVersion: null }));
  });
});
