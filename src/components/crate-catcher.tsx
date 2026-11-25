"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { playRandomFunnySound } from "@/lib/funny-sounds";
import { GameHighScoresModal } from "./game-high-scores";
import { useGameRecords, type GameProps } from "./use-game-records";

// Game world in logical units; the canvas scales it to whatever size it is rendered at.
const W = 300;
const H = 400;
const LIVES = 3;
const BASKET_Y = H - 34;
const CATCH_Y = H - 54; // Top rim of the basket: items crossing it near the picker are caught.
const CATCH_HALF_WIDTH = 32;
const PICKER_MIN_X = 26;
const PICKER_MAX_X = W - 26;
const KEY_SPEED = 330; // units/s while an arrow key is held
const DRAG_SPEED = 1100; // units/s chasing the finger / mouse
const FRUITS = ["🍎", "🍊", "🍋", "🍇", "🍓", "🍑", "🍒", "🥑", "🥭", "🍐"];
const PESTS = ["🐝", "🐛"];
const PICKERS = ["👩‍🌾", "👨‍🌾", "🧑‍🌾"];
const BEST_KEY = "crate-catcher-best";
const LEFT_KEYS = new Set(["ArrowLeft", "a", "A"]);
const RIGHT_KEYS = new Set(["ArrowRight", "d", "D"]);

type Kind = "fruit" | "gold" | "pest";
type Item = { x: number; y: number; vy: number; emoji: string; kind: Kind; phase: number };
type Popup = { x: number; y: number; text: string; color: string; age: number };
type Status = "ready" | "playing" | "over";

const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]!;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// Difficulty ramps over roughly two minutes, then holds.
const fallSpeed = (t: number) => 110 + Math.min(t, 120) * 2.2;
const spawnEvery = (t: number) => Math.max(0.38, 1.05 - t * 0.0075);
const pestChance = (t: number) => Math.min(0.3, 0.1 + t * 0.002);
const GOLD_CHANCE = 0.06;

function initialState() {
  return {
    px: W / 2,
    target: null as number | null,
    held: { left: false, right: false },
    picker: random(PICKERS),
    items: [] as Item[],
    popups: [] as Popup[],
    elapsed: 0,
    nextSpawn: 0.6,
    score: 0,
    lives: LIVES,
    hurt: 0, // seconds left on the red flash after losing a life
  };
}

type State = ReturnType<typeof initialState>;

function spawn(g: State) {
  const roll = Math.random();
  const pest = pestChance(g.elapsed);
  const kind: Kind = roll < pest ? "pest" : roll < pest + GOLD_CHANCE ? "gold" : "fruit";
  g.items.push({
    x: 20 + Math.random() * (W - 40),
    y: 40,
    vy: fallSpeed(g.elapsed) * (0.85 + Math.random() * 0.3),
    emoji: kind === "pest" ? random(PESTS) : random(FRUITS),
    kind,
    phase: Math.random() * Math.PI * 2,
  });
}

// Pests weave sideways as they fall, so they are harder to dodge.
const itemX = (item: Item, t: number) =>
  item.kind === "pest" ? clamp(item.x + Math.sin(t * 4 + item.phase) * 18, 14, W - 14) : item.x;

function drawScene(ctx: CanvasRenderingContext2D, g: State) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#cfe8f3");
  sky.addColorStop(1, "#f3f0dc");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Orchard canopy along the top edge.
  ctx.fillStyle = "#5f8f4e";
  for (let x = -10; x <= W + 10; x += 34) {
    ctx.beginPath();
    ctx.arc(x, 10 + ((x / 34) % 2) * 8, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#7aa862";
  for (let x = 7; x <= W; x += 34) {
    ctx.beginPath();
    ctx.arc(x, 6, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // Grass.
  ctx.fillStyle = "#9cc47a";
  ctx.fillRect(0, H - 20, W, 20);
  ctx.fillStyle = "#86b264";
  ctx.fillRect(0, H - 20, W, 3);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const emojiFont = (size: number) => `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;

  ctx.font = emojiFont(28);
  for (const item of g.items) {
    const x = itemX(item, g.elapsed);
    if (item.kind === "gold") {
      ctx.fillStyle = "rgba(255, 205, 60, 0.6)";
      ctx.beginPath();
      ctx.arc(x, item.y, 19 + Math.sin(g.elapsed * 10) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillText(item.emoji, x, item.y + 2);
  }

  // Picker standing behind the basket.
  ctx.font = emojiFont(40);
  ctx.fillText(g.picker, g.px, BASKET_Y - 26);
  ctx.font = emojiFont(44);
  ctx.fillText("🧺", g.px, BASKET_Y);

  ctx.font = `bold 18px system-ui, sans-serif`;
  for (const p of g.popups) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / 0.7);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - p.age * 50);
  }
  ctx.globalAlpha = 1;

  if (g.hurt > 0) {
    ctx.fillStyle = `rgba(200, 40, 40, ${0.35 * (g.hurt / 0.35)})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function CrateCatcher({ initialLeaderboards, userId, csrf, onScoresSaved }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const game = useRef(initialState());
  const [status, setStatus] = useState<Status>("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const { best, leaderboards, lastScoreId, showHighScores, setShowHighScores, finishGame } =
    useGameRecords({ game: "catcher", bestKey: BEST_KEY, initialLeaderboards, csrf, onScoresSaved });

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    drawScene(ctx, game.current);
  }, []);

  // Keep the canvas crisp at its rendered size on high-DPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const width = Math.round(canvas.getBoundingClientRect().width * window.devicePixelRatio);
      canvas.width = width;
      canvas.height = Math.round(width * H / W);
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
    setLives(LIVES);
    setStatus("playing");
    draw();
  }, [draw]);

  useEffect(() => {
    if (status !== "playing") return;
    let frame = 0;
    let last = performance.now();
    const step = (now: number) => {
      // Clamp the step so a backgrounded tab doesn't dump a wall of fruit on return.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const g = game.current;
      g.elapsed += dt;
      g.hurt = Math.max(0, g.hurt - dt);

      const dir = (g.held.right ? 1 : 0) - (g.held.left ? 1 : 0);
      if (dir) {
        g.target = null;
        g.px += dir * KEY_SPEED * dt;
      } else if (g.target !== null) {
        const delta = g.target - g.px;
        g.px += Math.sign(delta) * Math.min(Math.abs(delta), DRAG_SPEED * dt);
      }
      g.px = clamp(g.px, PICKER_MIN_X, PICKER_MAX_X);

      g.nextSpawn -= dt;
      if (g.nextSpawn <= 0) {
        spawn(g);
        g.nextSpawn = spawnEvery(g.elapsed);
      }

      let scored = 0;
      let lost = 0;
      g.items = g.items.filter(item => {
        const prevY = item.y;
        item.y += item.vy * dt;
        const x = itemX(item, g.elapsed);
        if (prevY < CATCH_Y && item.y >= CATCH_Y && Math.abs(x - g.px) <= CATCH_HALF_WIDTH) {
          if (item.kind === "pest") {
            lost++;
            g.popups.push({ x, y: CATCH_Y, text: "💔", color: "#c62828", age: 0 });
          } else {
            const points = item.kind === "gold" ? 5 : 1;
            scored += points;
            g.popups.push({ x, y: CATCH_Y, text: `+${points}`, color: item.kind === "gold" ? "#b8860b" : "#2e7d32", age: 0 });
          }
          return false;
        }
        if (item.y > H + 20) {
          // Dropping regular fruit costs a life; missing a golden one only costs the bonus.
          if (item.kind === "fruit") {
            lost++;
            g.popups.push({ x, y: H - 30, text: "💔", color: "#c62828", age: 0 });
          }
          return false;
        }
        return true;
      });
      g.popups = g.popups.filter(p => (p.age += dt) < 0.7);

      if (scored) {
        g.score += scored;
        setScore(g.score);
      }
      if (lost) {
        g.lives = Math.max(0, g.lives - lost);
        g.hurt = 0.35;
        setLives(g.lives);
      }
      draw();

      if (g.lives === 0) {
        playRandomFunnySound();
        void finishGame(g.score);
        setStatus("over");
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [status, draw, finishGame]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const down = e.type === "keydown";
      const held = game.current.held;
      if (LEFT_KEYS.has(e.key)) { e.preventDefault(); held.left = down; }
      else if (RIGHT_KEYS.has(e.key)) { e.preventDefault(); held.right = down; }
      else if (down && (e.key === " " || e.key === "Enter") && status !== "playing" && !showHighScores) {
        e.preventDefault();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [status, start, showHighScores]);

  // The picker chases the finger (or mouse) horizontally; touching anywhere on the board works.
  const aim = (e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || status !== "playing") return;
    game.current.target = ((e.clientX - rect.left) / rect.width) * W;
  };

  return (
    <div className="game-area">
      <div className="game-stats">
        <span>ניקוד: <strong>{score}</strong></span>
        <span aria-label={`חיים: ${lives}`}>{"❤️".repeat(lives)}{"🤍".repeat(LIVES - lives)}</span>
        <span>שיא: <strong>{best}</strong></span>
        <button type="button" className="btn secondary game-highscores-btn" onClick={() => setShowHighScores(true)}>🏆 טבלת שיאים</button>
      </div>
      <div className="game-board catcher-board" onPointerDown={aim} onPointerMove={aim}>
        <canvas ref={canvasRef} aria-label="לוח משחק הקוטף הזריז" />
        {status !== "playing" && (
          <div className="game-overlay">
            {status === "over" && <p className="game-overlay-title">נגמר! אספתם {score} נקודות</p>}
            {status === "ready" && (
              <>
                <p className="game-overlay-title">תפסו את הפירות בסל!</p>
                <p className="muted">גררו את הסל (או חיצים במקלדת). פרי שנופל לרצפה או דבורה בסל — מורידים לב. פרי זהב שווה 5.</p>
              </>
            )}
            <button type="button" className="btn" onClick={start}>{status === "over" ? "שוב!" : "התחלה"}</button>
          </div>
        )}
      </div>
      {showHighScores && <GameHighScoresModal leaderboards={leaderboards} game="catcher" userId={userId} lastId={lastScoreId} onClose={() => setShowHighScores(false)} />}
    </div>
  );
}
