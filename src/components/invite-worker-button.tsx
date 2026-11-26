"use client";
import { useState } from "react";
import { Modal } from "./modal";
import { LinkIcon } from "./icons";
import { formatHebrewDateTime } from "@/lib/dates";

/** יוצר קישור הזמנה חד-פעמי שהמנהל שולח לעובד, כדי שהעובד ייצור את החשבון בעצמו */
export function InviteWorkerButton({ csrf }: { csrf: string }) {
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState<{ url: string; expiresAt: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function create() {
    setBusy(true); setError(""); setCopied(false);
    try {
      const res = await fetch("/api/admin/users/invites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ csrf }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      setInvite(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!invite) return;
    try { await navigator.clipboard.writeText(invite.url); setCopied(true); } catch { setError("לא ניתן להעתיק — יש לסמן ולהעתיק ידנית"); }
  }

  function close() { setOpen(false); setInvite(null); setError(""); setCopied(false); }

  const message = invite ? `הוזמנת להצטרף ליבול בשפע. להרשמה: ${invite.url}` : "";

  return (
    <>
      <button type="button" className="btn secondary btn-icon-leading" onClick={() => { setOpen(true); void create(); }}><LinkIcon size={18} /><span>קישור הרשמה לעובד</span></button>
      {open && (
        <Modal title="קישור הרשמה לעובד" onClose={close}>
          <div className="stack">
            <p className="muted">שלחו את הקישור לעובד. העובד ימלא את פרטיו ויבחר סיסמה, יאמת את כתובת הדוא״ל, והחשבון ייפתח לאחר שתאשרו אותו בטבלת העובדים.</p>
            {busy && <p className="muted">יוצר קישור…</p>}
            {error && <p className="alert" role="alert">{error}</p>}
            {invite && (
              <>
                <div className="invite-link">
                  <input className="input" dir="ltr" readOnly value={invite.url} aria-label="קישור ההרשמה" onFocus={e => e.currentTarget.select()} />
                  <button type="button" className="btn" onClick={copy}>{copied ? "הועתק" : "העתקה"}</button>
                </div>
                <p className="muted">הקישור חד-פעמי ובתוקף עד {formatHebrewDateTime(invite.expiresAt)}. לכל עובד יש ליצור קישור נפרד.</p>
                <div className="actions">
                  <a className="btn secondary" href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">שליחה בוואטסאפ</a>
                  <button type="button" className="btn secondary" onClick={create} disabled={busy}>קישור חדש לעובד נוסף</button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
