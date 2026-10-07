"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { playRandomFunnySound } from "@/lib/funny-sounds";
import { formatHebrewDate, jerusalemDate } from "@/lib/dates";
import type { SnakeHighScore } from "@/lib/snake-scores";
import { Modal } from "./modal";
import { UserAvatar } from "./user-avatar";

const GRID = 15;
const TICK_MS = 150;
const MIN_TICK_MS = 70;
const PICKERS = ["👩‍🌾", "👨‍🌾", "🧑‍🌾"];
const FRUITS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥑", "🥭", "🍐"];
const BEST_KEY = "picker-snake-best";

type Point = { x: number; y: number };
type Dir = "up" | "down" | "left" | "right";
type Status = "ready" | "playing" | "over";

const STEP: Record<Dir, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE: Record<Dir, Dir> = { up: "down", down: "up", left: "right", right: "left" };
const KEYS: Record<string, Dir> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  w: "up", s: "down", a: "left", d: "right",
};

const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]!;

function placeFruit(snake: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    if (!snake.some(s => s.x === p.x && s.y === p.y)) return p;
  }
}

function initialState() {
  const mid = Math.floor(GRID / 2);
  const snake = [{ x: mid, y: mid }, { x: mid + 1, y: mid }, { x: mid + 2, y: mid }];
  return {
    snake,
    faces: snake.map(() => random(PICKERS)),
    dir: "left" as Dir,
    queue: [] as Dir[],
    fruit: placeFruit(snake),
    fruitEmoji: random(FRUITS),
  };
}

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}

const bestListeners = new Set<() => void>();

function subscribeBest(listener: () => void) {
  bestListeners.add(listener);
  return () => bestListeners.delete(listener);
}

function writeBest(score: number) {
  try { localStorage.setItem(BEST_KEY, String(score)); } catch { /* storage unavailable */ }
  bestListeners.forEach(l => l());
}

function scoreDate(createdAt: string) {
  return formatHebrewDate(jerusalemDate(new Date(`${createdAt.replace(" ", "T")}Z`)));
}

function HighScoresModal({ scores, userId, lastId, onClose }: { scores: SnakeHighScore[]; userId: number; lastId: number | null; onClose: () => void }) {
  return (
    <Modal title="טבלת שיאים" onClose={onClose}>
      {scores.length === 0 ? (
        <p className="muted">עדיין אין שיאים — היו הראשונים!</p>
      ) : (
        <ol className="snake-highscores">
          {scores.map((s, i) => (
            <li key={s.id} className={s.id === lastId ? "is-new" : s.userId === userId ? "is-mine" : undefined}>
              <span className="snake-highscores-rank">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
              <span className="snake-highscores-name avatar-name"><UserAvatar userId={s.userId} name={s.name} avatarVersion={s.avatarVersion} size="sm" /><span>{s.name}</span></span>
              <span className="muted">{scoreDate(s.createdAt)}</span>
              <strong>{s.score}</strong>
            </li>
          ))}
        </ol>
      )}
    </Modal>
  );
}

export function PickerSnake({ initialHighScores, userId, csrf }: { initialHighScores: SnakeHighScore[]; userId: number; csrf: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef(initialState());
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const best = useSyncExternalStore(subscribeBest, readBest, () => 0);
  const touchStart = useRef<Point | null>(null);
  const [highScores, setHighScores] = useState(initialHighScores);
  const [lastScoreId, setLastScoreId] = useState<number | null>(null);
  const [showHighScores, setShowHighScores] = useState(false);

  // Records the finished game; if it made the top 10, opens the table with the new row highlighted.
  const submitScore = useCallback(async (finalScore: number) => {
    try {
      const res = await fetch("/api/game/scores", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score: finalScore, csrf })
      });
      if (!res.ok) return;
      const data = await res.json() as { id: number; scores: SnakeHighScore[] };
      setHighScores(data.scores);
      setLastScoreId(data.id);
      if (data.scores.some(s => s.id === data.id)) setShowHighScores(true);
    } catch { /* offline — the game still works without the leaderboard */ }
  }, [csrf]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const cell = canvas.width / GRID;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        ctx.fillStyle = (x + y) % 2 ? "#cfe3b8" : "#dcebc6";
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${cell * 0.85}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    const { snake, faces, fruit, fruitEmoji } = game.current;
    ctx.fillText(fruitEmoji, (fruit.x + 0.5) * cell, (fruit.y + 0.55) * cell);
    snake.forEach((p, i) => {
      if (i === 0) {
        ctx.fillStyle = "rgba(213, 155, 58, 0.55)";
        ctx.beginPath();
        ctx.arc((p.x + 0.5) * cell, (p.y + 0.5) * cell, cell * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillText(faces[i]!, (p.x + 0.5) * cell, (p.y + 0.55) * cell);
    });
  }, []);

  // Keep the canvas crisp at its rendered size on high-DPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.round(canvas.getBoundingClientRect().width * window.devicePixelRatio);
      canvas.width = size;
      canvas.height = size;
      draw();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [draw]);

  const start = useCallback(() => {
    game.current = initialState();
    setScore(0);
    setStatus("playing");
    draw();
  }, [draw]);

  const turn = useCallback((dir: Dir) => {
    const g = game.current;
    const last = g.queue.at(-1) ?? g.dir;
    if (dir !== last && dir !== OPPOSITE[last] && g.queue.length < 3) g.queue.push(dir);
  }, []);

  useEffect(() => {
    if (status !== "playing") return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const g = game.current;
      g.dir = g.queue.shift() ?? g.dir;
      const head = g.snake[0]!;
      const next = { x: head.x + STEP[g.dir].x, y: head.y + STEP[g.dir].y };
      const eats = next.x === g.fruit.x && next.y === g.fruit.y;
      const body = eats ? g.snake : g.snake.slice(0, -1);
      if (next.x < 0 || next.y < 0 || next.x >= GRID || next.y >= GRID || body.some(p => p.x === next.x && p.y === next.y)) {
        playRandomFunnySound();
        const finalScore = g.snake.length - 3;
        if (finalScore > readBest()) writeBest(finalScore);
        if (finalScore > 0) submitScore(finalScore);
        setStatus("over");
        return;
      }
      g.snake = [next, ...body];
      if (eats) {
        g.faces = [g.faces[0]!, random(PICKERS), ...g.faces.slice(1)];
        g.fruit = placeFruit(g.snake);
        g.fruitEmoji = random(FRUITS);
        setScore(s => s + 1);
      }
      draw();
      timer = setTimeout(tick, Math.max(MIN_TICK_MS, TICK_MS - (g.snake.length - 3) * 3));
    };
    timer = setTimeout(tick, TICK_MS);
    return () => clearTimeout(timer);
  }, [status, draw, submitScore]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
      if (dir) {
        e.preventDefault();
        if (status === "playing") turn(dir);
      } else if ((e.key === " " || e.key === "Enter") && status !== "playing" && !showHighScores) {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, start, turn, showHighScores]);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (t) touchStart.current = { x: t.clientX, y: t.clientY };
  };
  // Turn as soon as the finger has travelled far enough, then re-anchor so one drag can chain turns.
  const onTouchMove = (e: React.TouchEvent) => {
    const from = touchStart.current;
    const t = e.touches[0];
    if (!from || !t) return;
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  return (
    <div className="snake-game">
      <div className="snake-scores">
        <span>ניקוד: <strong>{score}</strong></span>
        <span>שיא: <strong>{best}</strong></span>
        <button type="button" className="btn secondary snake-highscores-btn" onClick={() => setShowHighScores(true)}>🏆 טבלת שיאים</button>
      </div>
      <div className="snake-board" onTouchStart={onTouchStart} onTouchMove={onTouchMove}>
        <canvas ref={canvasRef} aria-label="לוח משחק הנחש" />
        {status !== "playing" && (
          <div className="snake-overlay">
            {status === "over" && <p className="snake-overlay-title">נגמר! אספתם {score} פירות</p>}
            {status === "ready" && <p className="snake-overlay-title">אספו פירות והגדילו את צוות הקטיף</p>}
            <button type="button" className="btn" onClick={start}>{status === "over" ? "שוב!" : "התחלה"}</button>
          </div>
        )}
      </div>
      <div className="snake-pad" dir="ltr">
        <button type="button" className="btn secondary" style={{ gridArea: "up" }} onPointerDown={e => { e.preventDefault(); turn("up"); }} aria-label="למעלה">▲</button>
        <button type="button" className="btn secondary" style={{ gridArea: "left" }} onPointerDown={e => { e.preventDefault(); turn("left"); }} aria-label="שמאלה">◀</button>
        <button type="button" className="btn secondary" style={{ gridArea: "right" }} onPointerDown={e => { e.preventDefault(); turn("right"); }} aria-label="ימינה">▶</button>
        <button type="button" className="btn secondary" style={{ gridArea: "down" }} onPointerDown={e => { e.preventDefault(); turn("down"); }} aria-label="למטה">▼</button>
      </div>
      {showHighScores && <HighScoresModal scores={highScores} userId={userId} lastId={lastScoreId} onClose={() => setShowHighScores(false)} />}
    </div>
  );
}
