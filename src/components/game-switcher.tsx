"use client";

import { useCallback, useState } from "react";
import { CURRENT_GAME, GAMES, GAME_IDS, type GameHighScore, type GameId, type GameLeaderboards } from "@/lib/game-scores";
import { CrateCatcher } from "./crate-catcher";
import { PickerSnake } from "./picker-snake";

const GAME_COMPONENTS = { snake: PickerSnake, catcher: CrateCatcher } satisfies Record<GameId, unknown>;

// The game of the month comes first and opens by default; earlier games stay playable.
const ORDER: GameId[] = [CURRENT_GAME, ...GAME_IDS.filter(id => id !== CURRENT_GAME)];

export function GameSwitcher({ initialLeaderboards, userId, csrf }: { initialLeaderboards: GameLeaderboards; userId: number; csrf: string }) {
  const [game, setGame] = useState<GameId>(CURRENT_GAME);
  // Latest top-10s, so a score saved in one game still shows after switching away and back.
  const [leaderboards, setLeaderboards] = useState(initialLeaderboards);
  const onScoresSaved = useCallback((id: GameId, scores: GameHighScore[]) => setLeaderboards(b => ({ ...b, [id]: scores })), []);
  const Game = GAME_COMPONENTS[game];
  return (
    <div className="stack">
      <div className="tabs game-tabs" role="tablist" aria-label="בחירת משחק">
        {ORDER.map(id => (
          <button key={id} type="button" role="tab" aria-selected={id === game} className={`tab${id === game ? " is-active" : ""}`} onClick={() => setGame(id)}>
            {GAMES[id].title}{id === CURRENT_GAME && " ⭐ משחק החודש"}
          </button>
        ))}
      </div>
      {/* key: each game starts on a fresh board */}
      <Game key={game} initialLeaderboards={leaderboards} userId={userId} csrf={csrf} onScoresSaved={onScoresSaved} />
    </div>
  );
}
