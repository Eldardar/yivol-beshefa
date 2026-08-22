"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { id: number; name: string; availability: string | null; conflict: boolean; assigned: boolean };

export function AssignPickersModal({ shiftId, leaderId, date, csrf, onClose }: { shiftId: number; leaderId: number; date: string; csrf: string; onClose: () => void }) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/shifts/${shiftId}/pickers`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) { setError(data.error); return; }
        const list = data.pickers as Candidate[];
        setCandidates(list);
        setSelected(new Set(list.filter(p => p.assigned).map(p => p.id)));
      })
      .catch(() => { if (!cancelled) setError("לא ניתן לטעון קוטפים"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [shiftId]);

  function toggle(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/admin/shifts/${shiftId}/pickers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pickerIds: [...selected], csrf })
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

  const todayJerusalem = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const isPastShift = date < todayJerusalem;
  const eligible = (candidates ?? []).filter(p => p.assigned || (!p.conflict && (isPastShift || ["AVAILABLE", "MAYBE"].includes(p.availability ?? ""))));

  return (
    <div className="stack">
      {loading && <p className="muted">טוען קוטפים זמינים…</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {!loading && eligible.length === 0 && !error && <p className="muted">אין קוטפים זמינים בתאריך זה</p>}
      {!loading && eligible.length > 0 && (
        <ul className="checkbox-list">
          {eligible.map(p => {
            const isLeader = p.id === leaderId;
            return (
              <li key={p.id}>
                <label className="checkbox-row">
                  <input type="checkbox" checked={isLeader || selected.has(p.id)} disabled={isLeader} onChange={() => toggle(p.id)} />
                  <span>{p.name}</span>
                  {isLeader && <span className="tag info">מוביל/ה</span>}
                  {!isLeader && p.availability === "MAYBE" && <span className="tag warn">סימן/ה אולי</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={submit} disabled={busy || loading}>{busy ? "משבץ…" : "הקצאה"}</button>
        <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>ביטול</button>
      </div>
    </div>
  );
}
