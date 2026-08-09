"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Candidate = { id: number; number: string; name: string; conflict: boolean; assigned: boolean };

export function AssignVehiclesModal({ shiftId, csrf, onClose }: { shiftId: number; csrf: string; onClose: () => void }) {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/shifts/${shiftId}/vehicles`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) { setError(data.error); return; }
        const list = data.vehicles as Candidate[];
        setCandidates(list);
        setSelected(new Set(list.filter(v => v.assigned).map(v => v.id)));
      })
      .catch(() => { if (!cancelled) setError("לא ניתן לטעון רכבים"); })
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
      const res = await fetch(`/api/admin/shifts/${shiftId}/vehicles`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vehicleIds: [...selected], csrf })
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

  const eligible = (candidates ?? []).filter(v => v.assigned || !v.conflict);

  return (
    <div className="stack">
      {loading && <p className="muted">טוען רכבים זמינים…</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {!loading && eligible.length === 0 && !error && <p className="muted">אין רכבים זמינים בתאריך זה</p>}
      {!loading && eligible.length > 0 && (
        <ul className="checkbox-list">
          {eligible.map(v => (
            <li key={v.id}>
              <label className="checkbox-row">
                <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                <span dir="ltr" className="ltr-field">{v.number}</span>
                <span>{v.name}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={submit} disabled={busy || loading}>{busy ? "משבץ…" : "הקצאה"}</button>
        <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>ביטול</button>
      </div>
    </div>
  );
}
