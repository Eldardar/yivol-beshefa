import type { AppDb } from "@/lib/db";

// Every game that has ever been the game of the month. Keep retired games here so their high-score tab stays.
export const GAMES = {
  // Longest possible snake fills the 15x15 board, starting from 3 pickers.
  snake: { title: "סנייק", maxScore: 15 * 15 - 3 },
  // No natural ceiling — the cap only rejects obviously forged submissions.
  catcher: { title: "הקוטף הזריז", maxScore: 9999 },
} as const satisfies Record<string, { title: string; maxScore: number }>;

export type GameId = keyof typeof GAMES;
export const GAME_IDS = Object.keys(GAMES) as GameId[];

// The game currently on /game.
export const CURRENT_GAME: GameId = "catcher";

export const isGameId = (value: unknown): value is GameId => typeof value === "string" && Object.hasOwn(GAMES, value);

export type GameHighScore = { id: number; userId: number; name: string; avatarVersion: string | null; score: number; createdAt: string };
export type GameLeaderboards = Record<GameId, GameHighScore[]>;

export function topGameScores(database: AppDb, game: GameId, limit = 10): GameHighScore[] {
  return database
    .prepare(
      `SELECT s.id,s.user_id userId,u.name,u.avatar_version avatarVersion,s.score,s.created_at createdAt
       FROM game_scores s JOIN users u ON u.id=s.user_id
       WHERE s.game=?
       ORDER BY s.score DESC,s.created_at,s.id LIMIT ?`
    )
    .all(game, limit) as GameHighScore[];
}

export function allLeaderboards(database: AppDb): GameLeaderboards {
  return Object.fromEntries(GAME_IDS.map(game => [game, topGameScores(database, game)])) as GameLeaderboards;
}

export function recordGameScore(database: AppDb, game: GameId, userId: number, score: number): number {
  return Number(database.prepare("INSERT INTO game_scores(game,user_id,score) VALUES(?,?,?)").run(game, userId, score).lastInsertRowid);
}
