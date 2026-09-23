"use client";
import { useState } from "react";
import { CalendarMonthNav } from "./calendar-month-nav";

type Status = "IN_VILLAGE" | "MAYBE" | "AWAY";
export type HousingDay = { date: string; day: number; weekday: number; isToday: boolean; locked: boolean; status: Status | null };

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const OPTIONS: { status: Status; label: string; cssKey: "available" | "maybe" | "unavailable" }[] = [
  { status: "IN_VILLAGE", label: "ישן בכפר", cssKey: "available" },
  { status: "MAYBE", label: "אולי", cssKey: "maybe" },
  { status: "AWAY", label: "חוגג את החיים במקום אחר", cssKey: "unavailable" }
];
const STATUS_LABEL = Object.fromEntries(OPTIONS.map(o => [o.status, o.label])) as Record<Status, string>;
const STATUS_CSS_KEY = Object.fromEntries(OPTIONS.map(o => [o.status, o.cssKey])) as Record<Status, "available" | "maybe" | "unavailable">;

async function saveDay(csrf: string, date: string, status: Status | null): Promise<void> {
  const res = await fetch("/api/housing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csrf, date, status })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "שמירת סידור השינה נכשלה");
  }
}

export function HousingCalendar({ csrf, year, month, label, days }: { csrf: string; year: number; month: number; label: string; days: HousingDay[] }) {
  const editableDays = days.filter(d => !d.locked);
  const [statuses, setStatuses] = useState<Record<string, Status | null>>(() => Object.fromEntries(editableDays.map(d => [d.date, d.status])));
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const leading = days.length ? days[0]!.weekday : 0;

  function apply(date: string, status: Status | null) {
    const previous = statuses[date] ?? null;
    if (previous === status) return;
    setStatuses(s => ({ ...s, [date]: status }));
    setPending(p => ({ ...p, [date]: true }));
    setError("");
    saveDay(csrf, date, status)
      .catch(e => {
        setStatuses(s => ({ ...s, [date]: previous }));
        setError(e instanceof Error ? e.message : "שמירת סידור השינה נכשלה");
      })
      .finally(() => setPending(p => ({ ...p, [date]: false })));
  }

  function toggle(date: string, status: Status) {
    apply(date, statuses[date] === status ? null : status);
  }

  return (
    <section className="calendar-month">
      <CalendarMonthNav year={year} month={month} basePath="/housing" />
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="calendar calendar--full" role="grid" aria-label={`מגורים ל${label}`}>
        {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
        {Array.from({ length: leading }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
        {days.map(d => {
          if (d.locked) {
            const lockedClass = d.status ? ` calendar-day--locked-${STATUS_CSS_KEY[d.status]}` : " calendar-day--locked";
            return (
              <div className={`calendar-day calendar-day--past-choice${lockedClass}${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell" aria-disabled="true">
                <span className="calendar-day-number">{d.day}</span>
                <span className="calendar-day-status-label">{d.status ? STATUS_LABEL[d.status] : "לא עודכן"}</span>
              </div>
            );
          }
          const status = statuses[d.date] ?? null;
          const statusClass = status ? ` calendar-day--${STATUS_CSS_KEY[status]}` : "";
          return (
            <div className={`calendar-day${statusClass}${d.isToday ? " calendar-day--today" : ""}${pending[d.date] ? " calendar-day--saving" : ""}`} key={d.date} role="gridcell">
              <span className="calendar-day-number">{d.day}</span>
              <div className="status-options" role="radiogroup" aria-label={`סידור שינה ל-${d.day} ב${label}`}>
                {OPTIONS.map(opt => (
                  <button
                    type="button"
                    key={opt.status}
                    className={`status-option status-option--${opt.cssKey}${status === opt.status ? " is-selected" : ""}`}
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
}
