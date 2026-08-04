"use client";
import { useState } from "react";

type Status = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";
export type AvailabilityDay = { date: string; day: number; weekday: number; status: Status; locked: boolean };

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function AvailabilityPicker({ csrf, days, monthLabel, monthKey }: { csrf: string; days: AvailabilityDay[]; monthLabel: string; monthKey: string }) {
  const editableDays = days.filter(d => !d.locked);
  const [statuses, setStatuses] = useState<Record<string, Status>>(() => Object.fromEntries(editableDays.map(d => [d.date, d.status])));
  const leading = days.length ? days[0]!.weekday : 0;

  function setAll(status: Status) {
    setStatuses(Object.fromEntries(editableDays.map(d => [d.date, status])));
  }

  return (
    <form className="stack" method="post" action="/api/actions">
      <input type="hidden" name="action" value="availability" />
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="month" value={monthKey} />
      <div className="row">
        <button type="button" className="btn secondary" onClick={() => setAll("AVAILABLE")}>בחירת הכל כפנוי</button>
        <button type="button" className="btn secondary" onClick={() => setAll("UNAVAILABLE")}>ניקוי הכל</button>
      </div>
      <div className="calendar" role="grid" aria-label={`זמינות ל${monthLabel}`}>
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
          const status = statuses[d.date];
          const statusClass = status === "AVAILABLE" ? " calendar-day--available" : status === "MAYBE" ? " calendar-day--maybe" : "";
          return (
            <div className={`calendar-day${statusClass}`} key={d.date} role="gridcell">
              <span className="calendar-day-number">{d.day}</span>
              <label className="calendar-check">
                <input
                  type="checkbox"
                  name={`available_${d.date}`}
                  checked={status === "AVAILABLE"}
                  onChange={e => setStatuses(s => ({ ...s, [d.date]: e.target.checked ? "AVAILABLE" : "UNAVAILABLE" }))}
                />
                פנוי
              </label>
              <label className="calendar-check">
                <input
                  type="checkbox"
                  name={`maybe_${d.date}`}
                  checked={status === "MAYBE"}
                  onChange={e => setStatuses(s => ({ ...s, [d.date]: e.target.checked ? "MAYBE" : "UNAVAILABLE" }))}
                />
                אולי
              </label>
            </div>
          );
        })}
      </div>
      <button className="btn">שמירת זמינות ל{monthLabel}</button>
    </form>
  );
}
