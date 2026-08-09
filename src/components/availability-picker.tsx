"use client";
import { useState } from "react";

type Status = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";
export type AvailabilityDay = { date: string; day: number; weekday: number; status: Status | null; locked: boolean };
export type AvailabilityMonth = { key: string; label: string; days: AvailabilityDay[] };

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];
const OPTIONS: { status: Status; label: string; className: string }[] = [
  { status: "AVAILABLE", label: "רוצה לעבוד", className: "status-option--available" },
  { status: "MAYBE", label: "אולי יש לי תוכניות אחרות", className: "status-option--maybe" },
  { status: "UNAVAILABLE", label: "מנוחה", className: "status-option--unavailable" }
];

async function saveDay(csrf: string, date: string, status: Status | null): Promise<void> {
  const res = await fetch("/api/availability", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csrf, date, status })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "שמירת הזמינות נכשלה");
  }
}

export function AvailabilityPicker({ csrf, months }: { csrf: string; months: AvailabilityMonth[] }) {
  const editableDays = months.flatMap(m => m.days.filter(d => d.weekday !== 6 && !d.locked));
  const [statuses, setStatuses] = useState<Record<string, Status | null>>(() => Object.fromEntries(editableDays.map(d => [d.date, d.status])));
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  function apply(date: string, status: Status | null) {
    const previous = statuses[date] ?? null;
    if (previous === status) return;
    setStatuses(s => ({ ...s, [date]: status }));
    setPending(p => ({ ...p, [date]: true }));
    setError("");
    saveDay(csrf, date, status)
      .catch(e => {
        setStatuses(s => ({ ...s, [date]: previous }));
        setError(e instanceof Error ? e.message : "שמירת הזמינות נכשלה");
      })
      .finally(() => setPending(p => ({ ...p, [date]: false })));
  }

  function setAll(status: Status | null) {
    for (const d of editableDays) apply(d.date, status);
  }

  function toggle(date: string, status: Status) {
    apply(date, statuses[date] === status ? null : status);
  }

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn secondary" onClick={() => setAll("AVAILABLE")}>סימון הכל כ&quot;רוצה לעבוד&quot;</button>
        <button type="button" className="btn secondary" onClick={() => setAll(null)}>ניקוי הכל</button>
      </div>
      {error && <p className="alert" role="alert">{error}</p>}
      {months.map(month => {
        const days = month.days.filter(d => d.weekday !== 6);
        const leading = days.length ? days[0]!.weekday : 0;
        return (
          <section className="calendar-month" key={month.key}>
            <strong className="calendar-month-label">{month.label}</strong>
            <div className="calendar" role="grid" aria-label={`זמינות ל${month.label}`}>
              {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
              {Array.from({ length: leading }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
              {days.map(d => {
                if (d.locked) {
                  return (
                    <div className="calendar-day calendar-day--locked" key={d.date} role="gridcell" aria-disabled="true">
                      <span className="calendar-day-number">{d.day}</span>
                    </div>
                  );
                }
                const status = statuses[d.date] ?? null;
                const statusClass = status ? ` calendar-day--${status.toLowerCase()}` : "";
                return (
                  <div className={`calendar-day${statusClass}${pending[d.date] ? " calendar-day--saving" : ""}`} key={d.date} role="gridcell">
                    <span className="calendar-day-number">{d.day}</span>
                    <div className="status-options" role="radiogroup" aria-label={`זמינות ל-${d.day} ב${month.label}`}>
                      {OPTIONS.map(opt => (
                        <button
                          type="button"
                          key={opt.status}
                          className={`status-option ${opt.className}${status === opt.status ? " is-selected" : ""}`}
                          role="radio"
                          aria-checked={status === opt.status}
                          onClick={() => toggle(d.date, opt.status)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
