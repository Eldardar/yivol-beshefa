"use client";
import { useState } from "react";
import { CalendarMonthNav } from "./calendar-month-nav";
import { formatMoney } from "@/lib/format";

export type Status = "IN_VILLAGE" | "MAYBE" | "AWAY";
export type BookedOption = { id: number; name: string; villageName: string; costPerDay: number };
export type BookableVillage = { id: number; name: string; location: string; description: string; options: { id: number; name: string; description: string; costPerDay: number }[] };
export type HousingDay = { date: string; day: number; weekday: number; isToday: boolean; locked: boolean; status: Status | null; option: BookedOption | null };
export type HousingEntry = { status: Status | null; option: BookedOption | null };

// Nightly cost for days saved before workers picked a village + sleeping option.
const LEGACY_NIGHT_COST = 25;
const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const OPTIONS: { status: Status; cssKey: "available" | "maybe" | "unavailable" }[] = [
  { status: "IN_VILLAGE", cssKey: "available" },
  { status: "MAYBE", cssKey: "maybe" },
  { status: "AWAY", cssKey: "unavailable" }
];
const STATUS_CSS_KEY = Object.fromEntries(OPTIONS.map(o => [o.status, o.cssKey])) as Record<Status, "available" | "maybe" | "unavailable">;
export const sleepsInVillage = (status: Status | null) => status === "IN_VILLAGE" || status === "MAYBE";
export const nightCost = (entry: HousingEntry) => entry.option?.costPerDay ?? LEGACY_NIGHT_COST;

export function statusLabel(status: Status, cost: number | null) {
  if (status === "IN_VILLAGE") return cost === null ? "ישן בכפר" : `ישן בכפר ${cost} 🪙`;
  if (status === "MAYBE") return "אולי";
  return "חוגג את החיים במקום אחר";
}

async function saveDay(csrf: string, date: string, status: Status | null, sleepingOptionId: number | null): Promise<void> {
  const res = await fetch("/api/housing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ csrf, date, status, sleepingOptionId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "שמירת סידור השינה נכשלה");
  }
}

export function initialOptionId(days: HousingDay[], villages: BookableVillage[]): number | null {
  const bookable = new Set(villages.flatMap(v => v.options.map(o => o.id)));
  const booked = [...days].reverse().find(d => d.option && bookable.has(d.option.id));
  if (booked) return booked.option!.id;
  if (villages.length === 1 && villages[0]!.options.length === 1) return villages[0]!.options[0]!.id;
  return null;
}

export function VillagePicker({ villages, villageId, optionId, onVillage, onOption, title = "היכן ישנים החודש?" }: { villages: BookableVillage[]; villageId: number | null; optionId: number | null; onVillage: (id: number) => void; onOption: (id: number) => void; title?: string }) {
  const village = villages.find(v => v.id === villageId) ?? null;
  return (
    <section className="card stack housing-village-picker">
      <h2>{title}</h2>
      {villages.length === 0 ? (
        <p className="muted">אין כפרים פתוחים להזמנה בחודש זה.</p>
      ) : (
        <>
          <fieldset className="housing-choice-group">
            <legend>כפר</legend>
            {villages.map(v => (
              <label className={`housing-choice${v.id === villageId ? " is-selected" : ""}`} key={v.id}>
                <input type="radio" name="village" value={v.id} checked={v.id === villageId} onChange={() => onVillage(v.id)} />
                <span className="housing-choice-body">
                  <strong>{v.name}</strong>
                  {v.location && <span className="muted">{v.location}</span>}
                  {v.description && <span className="muted">{v.description}</span>}
                </span>
              </label>
            ))}
          </fieldset>
          {village && (
            <fieldset className="housing-choice-group">
              <legend>אפשרות לינה ב{village.name}</legend>
              {village.options.map(o => (
                <label className={`housing-choice${o.id === optionId ? " is-selected" : ""}`} key={o.id}>
                  <input type="radio" name="sleepingOption" value={o.id} checked={o.id === optionId} onChange={() => onOption(o.id)} />
                  <span className="housing-choice-body">
                    <strong>{o.name} · {formatMoney(o.costPerDay)} ללילה</strong>
                    {o.description && <span className="muted">{o.description}</span>}
                  </span>
                </label>
              ))}
            </fieldset>
          )}
        </>
      )}
    </section>
  );
}

export function HousingCalendar({ csrf, year, month, label, days, villages }: { csrf: string; year: number; month: number; label: string; days: HousingDay[]; villages: BookableVillage[] }) {
  const [entries, setEntries] = useState<Record<string, HousingEntry>>(() => Object.fromEntries(days.map(d => [d.date, { status: d.status, option: d.option }])));
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [optionId, setOptionId] = useState<number | null>(() => initialOptionId(days, villages));
  const [villageId, setVillageId] = useState<number | null>(() => villages.find(v => v.options.some(o => o.id === optionId))?.id ?? (villages.length === 1 ? villages[0]!.id : null));
  const leading = days.length ? days[0]!.weekday : 0;

  const selectedVillage = villages.find(v => v.id === villageId) ?? null;
  const selectedOption = selectedVillage?.options.find(o => o.id === optionId) ?? null;
  const selected: BookedOption | null = selectedVillage && selectedOption ? { id: selectedOption.id, name: selectedOption.name, villageName: selectedVillage.name, costPerDay: selectedOption.costPerDay } : null;

  function chooseVillage(id: number) {
    setVillageId(id);
    setError("");
    const options = villages.find(v => v.id === id)?.options ?? [];
    setOptionId(options.length === 1 ? options[0]!.id : null);
  }

  function apply(date: string, next: HousingEntry) {
    const previous = entries[date] ?? { status: null, option: null };
    if (previous.status === next.status && previous.option?.id === next.option?.id) return;
    setEntries(s => ({ ...s, [date]: next }));
    setPending(p => ({ ...p, [date]: true }));
    setError("");
    saveDay(csrf, date, next.status, next.option?.id ?? null)
      .catch(e => {
        setEntries(s => ({ ...s, [date]: previous }));
        setError(e instanceof Error ? e.message : "שמירת סידור השינה נכשלה");
      })
      .finally(() => setPending(p => ({ ...p, [date]: false })));
  }

  function toggle(date: string, status: Status) {
    const current = entries[date] ?? { status: null, option: null };
    if (!sleepsInVillage(status)) return apply(date, current.status === status ? { status: null, option: null } : { status, option: null });
    // Re-clicking the same choice clears it, unless the worker picked a different sleeping option meanwhile.
    if (current.status === status && (!selected || current.option?.id === selected.id)) return apply(date, { status: null, option: null });
    if (!selected && villages.length > 0) return setError("יש לבחור כפר ואפשרות לינה לפני סימון לינה בכפר");
    apply(date, { status, option: selected });
  }

  const inVillage = days.filter(d => entries[d.date]?.status === "IN_VILLAGE").map(d => entries[d.date]!);
  const maybe = days.filter(d => entries[d.date]?.status === "MAYBE").map(d => entries[d.date]!);
  const inVillageCost = inVillage.reduce((sum, e) => sum + nightCost(e), 0);
  const maybeCost = maybe.reduce((sum, e) => sum + nightCost(e), 0);

  return (
    <div className="stack">
      <VillagePicker villages={villages} villageId={villageId} optionId={optionId} onVillage={chooseVillage} onOption={id => { setOptionId(id); setError(""); }} />
      <section className="calendar-month">
        <CalendarMonthNav year={year} month={month} basePath="/availability?tab=housing" />
        {error && <p className="alert" role="alert">{error}</p>}
        <div className="calendar calendar--full" role="grid" aria-label={`מגורים ל${label}`}>
          {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
          {Array.from({ length: leading }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
          {days.map(d => {
            const entry = entries[d.date] ?? { status: null, option: null };
            const status = entry.status;
            const booking = sleepsInVillage(status) && entry.option ? <span className="calendar-day-booking">{entry.option.villageName} · {entry.option.name}</span> : null;
            if (d.locked) {
              const lockedClass = status ? ` calendar-day--locked-${STATUS_CSS_KEY[status]}` : " calendar-day--locked";
              return (
                <div className={`calendar-day calendar-day--past-choice${lockedClass}${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell" aria-disabled="true">
                  <span className="calendar-day-number">{d.day}</span>
                  <span className="calendar-day-status-label">{status ? statusLabel(status, nightCost(entry)) : "לא עודכן"}</span>
                  {booking}
                </div>
              );
            }
            const statusClass = status ? ` calendar-day--${STATUS_CSS_KEY[status]}` : "";
            const cost = sleepsInVillage(status) ? nightCost(entry) : selected?.costPerDay ?? null;
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
                      {statusLabel(opt.status, cost)}
                    </button>
                  ))}
                </div>
                {booking}
              </div>
            );
          })}
        </div>
      </section>
      <section className="card stack housing-cost-summary" aria-live="polite">
        <h2>עלות לינה משוערת ל{label}</h2>
        <dl className="housing-cost-lines">
          <div><dt>לילות בכפר ({inVillage.length})</dt><dd>{formatMoney(inVillageCost)}</dd></div>
          <div><dt>לילות &quot;אולי&quot; ({maybe.length})</dt><dd>{formatMoney(maybeCost)}</dd></div>
          <div className="housing-cost-total"><dt>סה&quot;כ משוער (כולל &quot;אולי&quot;)</dt><dd>{formatMoney(inVillageCost + maybeCost)}</dd></div>
        </dl>
      </section>
    </div>
  );
}
