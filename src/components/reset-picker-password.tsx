"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { KeyIcon } from "./icons";

export function ResetPickerPassword({ csrf, userId }: { csrf: string; userId: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/users/reset-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      setPassword(data.temporaryPassword);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <button type="button" className="icon-btn" title="איפוס סיסמה" aria-label="איפוס סיסמה" onClick={() => setOpen(true)}><KeyIcon size={18} /></button>
      {open && (
        <Modal title="אישור איפוס סיסמה" onClose={() => setOpen(false)}>
          <div className="stack">
            <p>האם לאפס את הסיסמה של המשתמש? הסיסמה הנוכחית תפסיק לעבוד ותוצג סיסמה זמנית חדשה.</p>
            {error && <p className="alert" role="alert">{error}</p>}
            <div className="actions">
              <button type="button" className="btn" onClick={submit} disabled={busy}>{busy ? "מאפס…" : "איפוס סיסמה"}</button>
              <button type="button" className="btn secondary" onClick={() => setOpen(false)} disabled={busy}>ביטול</button>
            </div>
          </div>
        </Modal>
      )}
      {password && (
        <div className="alert" role="status">
          <strong>הסיסמה החדשה מוצגת פעם אחת בלבד:</strong>
          <p><code>{password}</code></p>
        </div>
      )}
    </div>
  );
}
