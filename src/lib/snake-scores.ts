import type { AppDb } from "@/lib/db";

export type SnakeHighScore = { id: number; userId: number; name: string; avatarVersion: string | null; score: number; createdAt: string };

// Longest possible snake fills the 15x15 board, starting from 3 pickers.
export const MAX_SNAKE_SCORE = 15 * 15 - 3;

export function topSnakeScores(database: AppDb, limit = 10): SnakeHighScore[] {
  return database
    .prepare(
      `SELECT s.id,s.user_id userId,u.name,u.avatar_version avatarVersion,s.score,s.created_at createdAt
       FROM snake_scores s JOIN users u ON u.id=s.user_id
       ORDER BY s.score DESC,s.created_at,s.id LIMIT ?`
    )
    .all(limit) as SnakeHighScore[];
}

export function recordSnakeScore(database: AppDb, userId: number, score: number): number {
  return Number(database.prepare("INSERT INTO snake_scores(user_id,score) VALUES(?,?)").run(userId, score).lastInsertRowid);
}
