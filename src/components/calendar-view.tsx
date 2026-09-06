"use client";
import { useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { MapPinIcon, TruckIcon } from "./icons";
import { Modal } from "./modal";
import { CalendarMonthNav } from "./calendar-month-nav";

export type CalendarShift = {
  id: number;
  startTime: string;
  endTime: string;
  farm: string;
  address: string;
  navigationLink: string | null;
  fruitType: string;
  fruitSubtype: string;
  leader: string;
  notes: string;
  pickers: string[];
  vehicles: { number: string; name: string }[];
};
export type CalendarHoliday = { name: string; religion: "jewish" | "christian" | "muslim" };
export type CalendarDay = { date: string; day: number; weekday: number; isToday: boolean; shifts: CalendarShift[]; birthdays: string[]; holidays: CalendarHoliday[] };

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const HOLIDAY_EMOJI: Record<CalendarHoliday["religion"], string> = { jewish: "✡️", christian: "✝️", muslim: "☪️" };
function timeTag(startTime: string): string {
  const hour = Number(startTime.slice(0, 2));
  if (hour < 6) return "dim";
  if (hour < 14) return "info";
  return "warn";
}

export function CalendarView({ year, month, label, days }: { year: number; month: number; label: string; days: CalendarDay[] }) {
  const [selected, setSelected] = useState<{ date: string; shift: CalendarShift } | null>(null);
  const leading = days.length ? days[0]!.weekday : 0;

  return (
    <>
      <section className="calendar-month">
        <CalendarMonthNav year={year} month={month} />
        <div className="calendar calendar--full" role="grid" aria-label={`לוח שנה ל${label}`}>
          {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
          {Array.from({ length: leading }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
          {days.map(d => (
            <div className={`calendar-day${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell" aria-current={d.isToday ? "date" : undefined}>
              <span className="calendar-day-number">{d.day}</span>
              {(d.shifts.length > 0 || d.birthdays.length > 0 || d.holidays.length > 0) && (
                <div className="calendar-shift-list">
                  {d.holidays.map(holiday => (
                    <span key={holiday.name} className={`tag holiday-${holiday.religion}`}>{HOLIDAY_EMOJI[holiday.religion]} {holiday.name}</span>
                  ))}
                  {d.birthdays.map(name => (
                    <span key={name} className="tag">🎂 {name}</span>
                  ))}
                  {d.shifts.map(shift => {
                    const isSelected = selected?.shift.id === shift.id;
                    return (
                      <button
                        type="button"
                        key={shift.id}
                        className={`tag calendar-shift-btn ${timeTag(shift.startTime)}${isSelected ? " is-selected" : ""}`}
                        aria-pressed={isSelected}
                        onClick={() => setSelected({ date: d.date, shift })}
                      >
                        <span dir="ltr">{shift.startTime}–{shift.endTime}</span> · {shift.farm}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      {selected && (
        <Modal title={`${formatHebrewDate(selected.date)} · ${selected.shift.startTime}–${selected.shift.endTime}`} onClose={() => setSelected(null)}>
          <div className="stack">
            <p className="muted inline-icon-text">
              <MapPinIcon size={16} />
              <span>{selected.shift.farm} · {selected.shift.fruitType}{selected.shift.fruitSubtype ? ` (${selected.shift.fruitSubtype})` : ""}</span>
            </p>
            {selected.shift.address && <p className="muted">{selected.shift.address}</p>}
            <p>מוביל משמרת: {selected.shift.leader}</p>
            <div>
              <p>קוטפים:</p>
              {selected.shift.pickers.length > 0 ? (
                <ol className="numbered-list">{selected.shift.pickers.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}</ol>
              ) : (
                <p className="muted">טרם שובצו קוטפים</p>
              )}
            </div>
            {selected.shift.vehicles.length > 0 && (
              <p className="inline-icon-text">
                <TruckIcon size={16} />
                <span>{selected.shift.vehicles.map(v => `${v.number} ${v.name}`).join(", ")}</span>
              </p>
            )}
            {selected.shift.notes && <p className="muted">{selected.shift.notes}</p>}
            {selected.shift.navigationLink && (
              <a className="btn secondary" target="_blank" rel="noreferrer" href={selected.shift.navigationLink}>ניווט</a>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
