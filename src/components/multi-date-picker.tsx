"use client";
import { useMemo, useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

const WEEKDAYS = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const formatDate = (value: string) => { const [y, m, d] = value.split("-"); return `${d}/${m}/${y}`; };

function todayIso() {
  const now = new Date();
  return iso(now.getFullYear(), now.getMonth(), now.getDate());
}

/** לוח שנה לבחירת מספר תאריכים; כל תאריך שנבחר נשלח כשדה `name` נסתר. */
export function MultiDatePicker({ name, value, onChange, max }: { name: string; value: string[]; onChange: (dates: string[]) => void; max: number }) {
  const today = todayIso();
  const [view, setView] = useState(() => {
    const [y, m] = (value[0] ?? today).split("-").map(Number);
    return { year: y!, month: m! - 1 };
  });
  const selected = useMemo(() => new Set(value), [value]);

  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const leading = new Date(view.year, view.month, 1).getDay();
  const monthDates = Array.from({ length: daysInMonth }, (_, i) => iso(view.year, view.month, i + 1));
  const sorted = [...value].sort();
  const atMax = value.length >= max;

  function shift(delta: number) {
    setView(v => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  function toggle(date: string) {
    if (selected.has(date)) onChange(value.filter(d => d !== date));
    else if (!atMax) onChange([...value, date].sort());
  }

  return (
    <div className="multi-date">
      {sorted.map(d => <input type="hidden" name={name} value={d} key={d} />)}
      <div className="calendar-nav">
        <button type="button" className="calendar-nav-arrow" aria-label="חודש קודם" onClick={() => shift(-1)}><ArrowRightIcon size={18} /></button>
        <strong className="calendar-month-label" aria-live="polite">{MONTHS[view.month]} {view.year}</strong>
        <button type="button" className="calendar-nav-arrow" aria-label="חודש הבא" onClick={() => shift(1)}><ArrowLeftIcon size={18} /></button>
      </div>
      <div className="multi-date-grid" role="grid" aria-label={`בחירת תאריכים ל${MONTHS[view.month]} ${view.year}`} aria-multiselectable="true">
        {WEEKDAYS.map(w => <div className="calendar-head" key={w} role="columnheader">{w}</div>)}
        {Array.from({ length: leading }, (_, i) => <div key={`pad-${i}`} aria-hidden="true" />)}
        {monthDates.map((date, i) => {
          const isSelected = selected.has(date);
          return (
            <button
              type="button"
              role="gridcell"
              key={date}
              aria-selected={isSelected}
              aria-label={formatDate(date)}
              disabled={!isSelected && atMax}
              className={`multi-date-day${isSelected ? " is-selected" : ""}${date === today ? " is-today" : ""}${date < today ? " is-past" : ""}`}
              onClick={() => toggle(date)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="multi-date-summary">
        <span className="muted">{value.length ? `נבחרו ${value.length} תאריכים${atMax ? ` (מקסימום ${max})` : ""}` : "לא נבחרו תאריכים — לחצו על ימים בלוח"}</span>
        {value.length > 0 && <button type="button" className="btn secondary btn-sm" onClick={() => onChange([])}>ניקוי</button>}
      </div>
      {sorted.length > 0 && (
        <div className="multi-date-chips">
          {sorted.map(d => (
            <button type="button" className="tag multi-date-chip" key={d} onClick={() => toggle(d)} aria-label={`הסרת ${formatDate(d)}`}>
              <span dir="ltr">{formatDate(d)}</span><span aria-hidden="true">×</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
