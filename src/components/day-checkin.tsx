"use client";
import { useEffect, useRef, useState } from "react";
import { Modal } from "./modal";

const MAX_LENGTH = 365;
const WISH_EMOJIS = ["😊", "🌿", "🍇", "☀️", "🌾", "💪", "🌻", "🙌", "🍃", "🌤️"];

export function DayCheckIn({ wish, csrf }: { wish: string; csrf: string }) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [emoji, setEmoji] = useState(WISH_EMOJIS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  async function handleSend() {
    const message = text.trim();
    if (!message) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "השליחה נכשלה");
      setEmoji(WISH_EMOJIS[Math.floor(Math.random() * WISH_EMOJIS.length)]);
      setOpen(true);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "השליחה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="field">
        <textarea
          ref={textareaRef}
          className="input textarea-autogrow"
          value={text}
          rows={1}
          maxLength={MAX_LENGTH}
          onChange={e => setText(e.target.value)}
        />
        <span className="muted">{text.length}/{MAX_LENGTH}</span>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="actions">
        <button type="button" className="btn" onClick={handleSend} disabled={busy || !text.trim()}>שלח</button>
      </div>
      {open && (
        <Modal title="תודה!" onClose={() => setOpen(false)}>
          <p>{wish} {emoji}</p>
        </Modal>
      )}
    </>
  );
}
