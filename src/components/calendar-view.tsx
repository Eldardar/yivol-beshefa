"use client";
import { useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { MapPinIcon, TruckIcon } from "./icons";
import { Modal } from "./modal";
import { CalendarMonthNav } from "./calendar-month-nav";
import type { UnitRatesByField } from "./shifts-table";

export type CalendarPicker = { name: string; startTime: string | null; endTime: string | null; quantities: Array<{ unit: Unit; quantity: number }> };
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
  plantationFieldId: number;
  pickers: CalendarPicker[];
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

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function hoursBetween(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null;
  let minutes = toMinutes(endTime) - toMinutes(startTime);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

function pickerEarnings(quantities: Array<{ unit: Unit; quantity: number }>, rates: Partial<Record<Unit, number>>): number | null {
  let total = 0;
  let rated = false;
  for (const q of quantities) {
    const rate = rates[q.unit];
    if (rate != null) { total += q.quantity * rate; rated = true; }
  }
  return rated ? total : null;
}

function totalEarnings(pickers: CalendarPicker[], rates: Partial<Record<Unit, number>>): number {
  let total = 0;
  for (const p of pickers) {
    for (const q of p.quantities) {
      const rate = rates[q.unit];
      if (rate != null) total += q.quantity * rate;
    }
  }
  return total;
}

function totalsByUnit(pickers: CalendarPicker[]): Array<{ unit: Unit; quantity: number }> {
  const totals = new Map<Unit, number>();
  for (const p of pickers) {
    for (const q of p.quantities) totals.set(q.unit, (totals.get(q.unit) ?? 0) + q.quantity);
  }
  return Array.from(totals, ([unit, quantity]) => ({ unit, quantity }));
}

export function CalendarView({ year, month, label, days, unitRatesByField }: { year: number; month: number; label: string; days: CalendarDay[]; unitRatesByField: UnitRatesByField }) {
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
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr><th>#</th><th>שם</th><th>כמות תוצרת</th><th>ש&quot;ח לשעה</th><th>סה&quot;כ הכנסה</th></tr>
                    </thead>
                    <tbody>
                      {selected.shift.pickers.map((p, i) => {
                        const rates = unitRatesByField[selected.shift.plantationFieldId] ?? {};
                        const hours = hoursBetween(p.startTime, p.endTime);
                        const earnings = pickerEarnings(p.quantities, rates);
                        const perHour = earnings != null && hours ? earnings / hours : null;
                        return (
                          <tr key={`${p.name}-${i}`}>
                            <td>{i + 1}</td>
                            <td>{p.name}</td>
                            <td>
                              {p.quantities.length === 0 ? "—" : p.quantities.map((q, qi) => (
                                <span key={q.unit}>
                                  {qi > 0 && " · "}
                                  <span dir="ltr" className="ltr-field">{q.quantity}</span> {UNIT_LABEL[q.unit]}
                                </span>
                              ))}
                            </td>
                            <td>{perHour != null ? formatMoney(perHour) : "—"}</td>
                            <td>{earnings != null ? formatMoney(earnings) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="totals-row">
                        <td colSpan={2}>סה&quot;כ</td>
                        <td>
                          {totalsByUnit(selected.shift.pickers).length === 0 ? "—" : totalsByUnit(selected.shift.pickers).map((t, i) => (
                            <span key={t.unit}>
                              {i > 0 && " · "}
                              <span dir="ltr" className="ltr-field">{t.quantity}</span> {UNIT_LABEL[t.unit]}
                            </span>
                          ))}
                        </td>
                        <td></td>
                        <td>{formatMoney(totalEarnings(selected.shift.pickers, unitRatesByField[selected.shift.plantationFieldId] ?? {}))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
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
