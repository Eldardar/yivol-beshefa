"use client";
import { useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

// Playful gate that keeps admins out of the snake game unless they know the password.
const PASSWORD = "kingeldar";
const UNLOCK_KEY = "picker-snake-admin-unlocked";

function readUnlocked() {
  try { return sessionStorage.getItem(UNLOCK_KEY) === "1"; } catch { return false; }
}

function unlock() {
  try { sessionStorage.setItem(UNLOCK_KEY, "1"); } catch { /* storage unavailable */ }
}

const noopSubscribe = () => () => {};

function PasswordModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim().toLowerCase() !== PASSWORD) { setWrong(true); return; }
    unlock();
    onSuccess();
  }

  return (
    <Modal title="מה הסיסמה?" onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <input
          className="input"
          type="password"
          dir="ltr"
          autoFocus
          autoComplete="off"
          aria-label="סיסמה"
          value={value}
          onChange={e => { setValue(e.target.value); setWrong(false); }}
        />
        {wrong && <p className="alert" role="alert">סיסמה שגויה 🙃</p>}
        <div className="actions">
          <button className="btn">כניסה למשחק</button>
        </div>
      </form>
    </Modal>
  );
}

// Admin homepage button: asks for the password before going to the game.
export function AdminGameButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn secondary" onClick={() => readUnlocked() ? router.push("/game") : setOpen(true)}>למשחק</button>
      {open && <PasswordModal onSuccess={() => router.push("/game")} onClose={() => setOpen(false)} />}
    </>
  );
}

// Wraps the game page for admins, so opening /game directly still asks for the password.
export function AdminGameGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const storedUnlock = useSyncExternalStore(noopSubscribe, readUnlocked, () => false);
  const [unlockedNow, setUnlockedNow] = useState(false);
  if (storedUnlock || unlockedNow) return <>{children}</>;
  return <PasswordModal onSuccess={() => setUnlockedNow(true)} onClose={() => router.push("/")} />;
}
