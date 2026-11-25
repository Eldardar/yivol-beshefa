"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { GameHighScore, GameId, GameLeaderboards } from "@/lib/game-scores";

// Personal best per game lives in localStorage; the shared leaderboard lives on the server.
const bestListeners = new Set<() => void>();

function subscribeBest(listener: () => void) {
  bestListeners.add(listener);
  return () => { bestListeners.delete(listener); };
}

function readBest(key: string) {
  try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
}

function writeBest(key: string, score: number) {
  try { localStorage.setItem(key, String(score)); } catch { /* storage unavailable */ }
  bestListeners.forEach(l => l());
}

// Props every game-of-the-month component takes.
export type GameProps = {
  initialLeaderboards: GameLeaderboards;
  userId: number;
  csrf: string;
  onScoresSaved?: (game: GameId, scores: GameHighScore[]) => void;
};

// Score bookkeeping shared by every game of the month: personal best, leaderboard state and the high-scores modal.
export function useGameRecords({ game, bestKey, initialLeaderboards, csrf, onScoresSaved }: Omit<GameProps, "userId"> & { game: GameId; bestKey: string }) {
  const best = useSyncExternalStore(subscribeBest, () => readBest(bestKey), () => 0);
  const [leaderboards, setLeaderboards] = useState(initialLeaderboards);
  const [lastScoreId, setLastScoreId] = useState<number | null>(null);
  const [showHighScores, setShowHighScores] = useState(false);

  // Records the finished game; if it made the top 10, opens the table with the new row highlighted.
  const finishGame = useCallback(async (finalScore: number) => {
    if (finalScore > readBest(bestKey)) writeBest(bestKey, finalScore);
    if (finalScore <= 0) return;
    try {
      const res = await fetch("/api/game/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, score: finalScore, csrf })
      });
      if (!res.ok) return;
      const data = await res.json() as { id: number; scores: GameHighScore[] };
      setLeaderboards(boards => ({ ...boards, [game]: data.scores }));
      onScoresSaved?.(game, data.scores);
      setLastScoreId(data.id);
      if (data.scores.some(s => s.id === data.id)) setShowHighScores(true);
    } catch { /* offline — the game still works without the leaderboard */ }
  }, [bestKey, csrf, game, onScoresSaved]);

  return { best, leaderboards, lastScoreId, showHighScores, setShowHighScores, finishGame };
}
