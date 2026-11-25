"use client";

import { useState } from "react";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import { GAMES, GAME_IDS, type GameId, type GameLeaderboards } from "@/lib/game-scores";
import { Modal } from "./modal";
import { UserAvatar } from "./user-avatar";

function scoreDate(createdAt: string) {
  return formatHebrewDate(jerusalemDate(new Date(`${createdAt.replace(" ", "T")}Z`)));
}

// One tab per game that has ever been played, opening on the game just played.
export function GameHighScoresModal({ leaderboards, game, userId, lastId, onClose }: {
  leaderboards: GameLeaderboards;
  game: GameId;
  userId: number;
  lastId: number | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<GameId>(game);
  const scores = leaderboards[tab];
  return (
    <Modal title="טבלת שיאים" onClose={onClose}>
      <div className="stack">
        <div className="tabs" role="tablist" aria-label="משחק">
          {GAME_IDS.map(id => (
            <button key={id} type="button" role="tab" aria-selected={id === tab} className={`tab${id === tab ? " is-active" : ""}`} onClick={() => setTab(id)}>
              {GAMES[id].title}
            </button>
          ))}
        </div>
        {scores.length === 0 ? (
          <p className="muted">עדיין אין שיאים — היו הראשונים!</p>
        ) : (
          <ol className="game-highscores" role="tabpanel">
            {scores.map((s, i) => (
              <li key={s.id} className={s.id === lastId && tab === game ? "is-new" : s.userId === userId ? "is-mine" : undefined}>
                <span className="game-highscores-rank">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                <span className="game-highscores-name avatar-name"><UserAvatar userId={s.userId} name={s.name} avatarVersion={s.avatarVersion} size="sm" /><span>{s.name}</span></span>
                <span className="muted">{scoreDate(s.createdAt)}</span>
                <strong>{s.score}</strong>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Modal>
  );
}
