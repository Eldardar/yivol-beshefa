"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type NotifiableUser = { id: number; name: string; role: "ADMIN" | "PICKER" };

export function ScheduleNotificationModal({ users, csrf, onClose }: { users: NotifiableUser[]; csrf: string; onClose: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [scheduled, setScheduled] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allSelected = users.length > 0 && selected.size === users.length;
  const todayLocal = new Date().toISOString().slice(0, 10);

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(users.map(u => u.id)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (selected.size === 0) { setError("יש לבחור לפחות נמען אחד"); return; }
    if (scheduled && (!date || !time)) { setError("יש לבחור תאריך ושעה לתזמון"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, body, userIds: [...selected], sendAt: scheduled ? `${date}T${time}` : "", csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "הפעולה נכשלה");
      router.refresh();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "הפעולה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit}>
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="field"><label>כותרת<input className="input" value={title} onChange={e => setTitle(e.target.value)} required maxLength={100} /></label></div>
      <div className="field"><label>תוכן ההודעה<textarea className="input" value={body} onChange={e => setBody(e.target.value)} required maxLength={1000} rows={4} /></label></div>

      <div className="field">
        <div className="page-header">
          <span>נמענים ({selected.size})</span>
          <button type="button" className="btn secondary btn-sm" onClick={toggleAll}>{allSelected ? "ביטול הכל" : "בחירת הכל"}</button>
        </div>
        {users.length === 0 && <p className="muted">אין משתמשים פעילים</p>}
        {users.length > 0 && (
          <ul className="checkbox-list">
            {users.map(u => (
              <li key={u.id}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} />
                  <span>{u.name}</span>
                  {u.role === "ADMIN" && <span className="tag info">מנהל/ת</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="switch-row">
        <label className="switch">
          <input type="checkbox" checked={scheduled} onChange={e => setScheduled(e.target.checked)} aria-label="תזמון שליחה למועד מאוחר יותר" />
          <span className="switch-track" aria-hidden="true" />
        </label>
        <span>תזמון שליחה למועד מאוחר יותר</span>
      </div>

      {scheduled && (
        <div className="field">
          <label>תאריך ושעה לשליחה</label>
          <div className="page-header-actions">
            <input className="input" type="date" value={date} min={todayLocal} onChange={e => setDate(e.target.value)} required={scheduled} />
            <input className="input" type="time" value={time} onChange={e => setTime(e.target.value)} required={scheduled} />
          </div>
        </div>
      )}

      <div className="actions">
        <button type="submit" className="btn" disabled={busy}>{busy ? "שולח…" : scheduled ? "תזמון שליחה" : "שליחה עכשיו"}</button>
        <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>ביטול</button>
      </div>
    </form>
  );
}
