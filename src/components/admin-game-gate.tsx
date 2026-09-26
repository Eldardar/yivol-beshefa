"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";

// Playful gate that keeps admins out of the snake game unless they know the password.
const PASSWORD = "kingeldar";

function PasswordModal({ onSuccess, onClose }: { onSuccess: () => void; onClose: () => void }) {
  const [value, setValue] = useState("");
  const [wrong, setWrong] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (value.trim().toLowerCase() !== PASSWORD) { setWrong(true); return; }
    onSuccess();
  }

  return (
    <Modal title="מה הסיסמה?" onClose={onClose}>
      <form className="stack" onSubmit={handleSubmit}>
        <input
          className="input"
          // A masked text field instead of type="password", so browsers and password managers don't offer to save it.
          type="text"
          name="game-gate"
          dir="ltr"
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          data-bwignore
          style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
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

// Wraps the game page for admins. The password is asked on every visit and never remembered.
export function AdminGameGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  if (unlocked) return <>{children}</>;
  return <PasswordModal onSuccess={() => setUnlocked(true)} onClose={() => router.push("/")} />;
}
