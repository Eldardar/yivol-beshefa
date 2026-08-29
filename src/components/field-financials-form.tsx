"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UNITS, UNIT_LABEL, type Unit } from "@/lib/units";

export function FieldFinancialsForm({ fieldId, csrf, onClose }: { fieldId: number; csrf: string; onClose: () => void }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Set<Unit>>(new Set());
  const [amounts, setAmounts] = useState<Partial<Record<Unit, string>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/fields/${fieldId}/rates`)
      .then(res => res.json())
      .then(data => {
        if (cancelled) return;
        if (data.error) { setError(data.error); return; }
        const rates = data.rates as Array<{ unit: Unit; rateNis: number }>;
        setEnabled(new Set(rates.map(r => r.unit)));
        setAmounts(Object.fromEntries(rates.map(r => [r.unit, String(r.rateNis)])));
      })
      .catch(() => { if (!cancelled) setError("לא ניתן לטעון תעריפים"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fieldId]);

  function toggle(unit: Unit) {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(unit)) next.delete(unit); else next.add(unit);
      return next;
    });
  }

  async function submit() {
    setBusy(true); setError("");
    try {
      const rates = [...enabled].map(unit => ({ unit, rateNis: Number(amounts[unit]) }));
      if (rates.some(r => !(r.rateNis > 0))) throw new Error("יש להזין סכום תקין בש\"ח עבור כל יחידה מסומנת");
      const res = await fetch(`/api/admin/fields/${fieldId}/rates`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rates, csrf })
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
    <div className="stack">
      {loading && <p className="muted">טוען תעריפים…</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {!loading && (
        <ul className="checkbox-list">
          {UNITS.map(unit => (
            <li key={unit}>
              <label className="checkbox-row">
                <input type="checkbox" checked={enabled.has(unit)} onChange={() => toggle(unit)} />
                <span>{UNIT_LABEL[unit]}</span>
              </label>
              {enabled.has(unit) && (
                <div className="line-row">
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={amounts[unit] ?? ""}
                    onChange={e => setAmounts(prev => ({ ...prev, [unit]: e.target.value }))}
                    placeholder="סכום"
                    aria-label={`סכום בש"ח ליחידת ${UNIT_LABEL[unit]}`}
                  />
                  <span className="muted">₪ ליחידה</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="actions">
        <button type="button" className="btn" onClick={submit} disabled={busy || loading}>{busy ? "שומר…" : "שמירה"}</button>
        <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>ביטול</button>
      </div>
    </div>
  );
}
