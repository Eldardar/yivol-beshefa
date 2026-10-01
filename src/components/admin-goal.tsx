"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UnitLines } from "./unit-lines";
import { UNITS, UNIT_LABEL, type Unit } from "@/lib/units";
import { formatHebrewShortDate } from "@/lib/dates";

export type GoalProgress = { unit: Unit; goal: number; done: number };

const formatQty = (value: number) => value.toLocaleString("he-IL", { maximumFractionDigits: 2 });

export function AdminGoal({ startDate, endDate, today, progress, csrf }: { startDate: string; endDate: string; today: string; progress: GoalProgress[]; csrf: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(progress.length === 0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(payload: { startDate: string; endDate: string; goals: Array<{ unit: string; goal: string }> } | { clear: true }) {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/goal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "השמירה נכשלה");
      setEditing("clear" in payload);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const values = form.getAll("goalQty").map(String);
    const units = form.getAll("goalUnit").map(String);
    save({ startDate: String(form.get("startDate")), endDate: String(form.get("endDate")), goals: values.map((goal, i) => ({ unit: units[i] ?? "", goal })) });
  }

  return (
    <section className="card stack">
      <h2>היעד שלי{progress.length > 0 && ` · ${formatHebrewShortDate(startDate)}–${formatHebrewShortDate(endDate)}`}</h2>
      {editing ? (
        <form className="stack" onSubmit={handleSubmit}>
          <div className="goal-dates">
            <label className="field">
              <span>מתאריך</span>
              <input className="input" type="date" name="startDate" defaultValue={startDate} required />
            </label>
            <label className="field">
              <span>עד תאריך</span>
              <input className="input" type="date" name="endDate" defaultValue={endDate} required />
            </label>
          </div>
          <UnitLines
            valueName="goalQty"
            unitName="goalUnit"
            initial={progress.map(p => ({ value: p.goal, unit: p.unit }))}
            addLabel="הוספת יחידת מידה"
            valueLabel="יעד"
            unitLabel="יחידת מידה"
            units={UNITS}
          />
          {error && <p className="alert" role="alert">{error}</p>}
          <div className="actions">
            <button className="btn" disabled={busy}>שמירה</button>
            {progress.length > 0 && <button type="button" className="btn secondary" onClick={() => { setEditing(false); setError(""); }}>ביטול</button>}
          </div>
        </form>
      ) : (
        <>
          {today < startDate && <p className="muted">{`היעד יתחיל ב־${formatHebrewShortDate(startDate)}`}</p>}
          {today > endDate && <p className="muted">{`תקופת היעד הסתיימה ב־${formatHebrewShortDate(endDate)}`}</p>}
          <ul className="stack goal-progress-list">
            {progress.map(p => {
              const left = Math.max(p.goal - p.done, 0);
              const percent = Math.round((p.done / p.goal) * 100);
              const reached = p.done >= p.goal;
              return (
                <li key={p.unit} className="goal-progress">
                  <strong>
                    {left > 0 ? `נותרו ${formatQty(left)} ${UNIT_LABEL[p.unit]} עד ${formatHebrewShortDate(endDate)}` : `היעד של ${UNIT_LABEL[p.unit]} הושג 🎉`}
                  </strong>
                  <div className="progress-track" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={Math.max(100, percent)}>
                    <div className={reached ? "progress-fill progress-fill--gold" : "progress-fill"} style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                  <span className="muted">{`בוצעו ${formatQty(p.done)} מתוך ${formatQty(p.goal)} (${percent}%)`}</span>
                </li>
              );
            })}
          </ul>
          {error && <p className="alert" role="alert">{error}</p>}
          <div className="actions">
            <button type="button" className="btn secondary" onClick={() => setEditing(true)}>עריכת יעד</button>
            <button type="button" className="btn secondary" disabled={busy} onClick={() => save({ clear: true })}>ניקוי יעד</button>
          </div>
        </>
      )}
    </section>
  );
}
