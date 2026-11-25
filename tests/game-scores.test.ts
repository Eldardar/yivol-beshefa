import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { createTestDb } from "@/lib/db";
import { allLeaderboards, isGameId, recordGameScore, topGameScores } from "@/lib/game-scores";

let db: Database.Database;
beforeEach(() => { db = createTestDb(); });
afterEach(() => { db.close(); });

describe("טבלאות שיאים למשחקים", () => {
  it("כל משחק מקבל טבלה משלו, ממוינת מהשיא הגבוה", () => {
    const user = Number(db.prepare("INSERT INTO users(name,email,phone,role,password_hash) VALUES(?,?,?,?,?)").run("קוטף", "p@example.com", "0500000001", "PICKER", "x").lastInsertRowid);
    recordGameScore(db, "snake", user, 4);
    const best = recordGameScore(db, "snake", user, 9);
    db.prepare("INSERT INTO game_scores(game,user_id,score) VALUES('retired',?,50)").run(user);
    expect(topGameScores(db, "snake").map(s => s.id)).toEqual([best, best - 1]);
    expect(allLeaderboards(db)).toEqual({ snake: topGameScores(db, "snake") });
  });

  it("רק משחקים רשומים מתקבלים", () => {
    expect(isGameId("snake")).toBe(true);
    expect(isGameId("toString")).toBe(false);
    expect(isGameId(undefined)).toBe(false);
  });
});
