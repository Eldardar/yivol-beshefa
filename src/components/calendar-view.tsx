"use client";
import { useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { unitAmount, type UnitPricing } from "@/lib/pricing";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { EyeIcon, MapPinIcon, PencilIcon, TentIcon, TrashIcon, TruckIcon } from "./icons";
import { Modal } from "./modal";
import { CalendarMonthNav } from "./calendar-month-nav";
import type { UnitRatesByField } from "./shifts-table";
import { AdminEventForm } from "./admin-event-form";

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
export type CalendarEvent = { id: number; name: string; startDate: string; endDate: string; isPublished: boolean; details: string; creator: string; isMine: boolean };
export type CalendarHousing = { status: "IN_VILLAGE" | "MAYBE"; village: string | null; option: string | null };
export type CalendarDay = { date: string; day: number; weekday: number; isToday: boolean; shifts: CalendarShift[]; birthdays: string[]; holidays: CalendarHoliday[]; events: CalendarEvent[]; housing?: CalendarHousing | null };

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

function pickerEarnings(quantities: Array<{ unit: Unit; quantity: number }>, rates: Partial<Record<Unit, UnitPricing>>): number | null {
  let total = 0;
  let rated = false;
  for (const q of quantities) {
    const rate = rates[q.unit];
    if (rate != null) { total += unitAmount(rate, q.quantity); rated = true; }
  }
  return rated ? total : null;
}

function totalEarnings(pickers: CalendarPicker[], rates: Partial<Record<Unit, UnitPricing>>): number {
  let total = 0;
  for (const p of pickers) {
    for (const q of p.quantities) {
      const rate = rates[q.unit];
      if (rate != null) total += unitAmount(rate, q.quantity);
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

function housingLabel(housing: CalendarHousing): string {
  const place = housing.village ? `לינה ב${housing.village}` : "לינה בכפר";
  return housing.status === "MAYBE" ? `${place} (אולי)` : place;
}

function eventDates(event: CalendarEvent): string {
  return event.startDate === event.endDate ? formatHebrewDate(event.startDate) : `${formatHebrewDate(event.startDate)} – ${formatHebrewDate(event.endDate)}`;
}

/** The admin variant lets the viewer create events and shows shift earnings; the worker variant is read-only. */
export function CalendarView({ year, month, label, days, unitRatesByField, csrf, variant = "admin" }: { year: number; month: number; label: string; days: CalendarDay[]; unitRatesByField: UnitRatesByField; csrf: string; variant?: "admin" | "worker" }) {
  const isAdmin = variant === "admin";
  const [selected, setSelected] = useState<{ date: string; shift: CalendarShift } | null>(null);
  const [creatingOn, setCreatingOn] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{ event: CalendarEvent; mode: "view" | "edit" | "delete" } | null>(null);
  const leading = days.length ? days[0]!.weekday : 0;

  return (
    <>
      <section className="calendar-month">
        <CalendarMonthNav year={year} month={month} />
        <div className="calendar calendar--full" role="grid" aria-label={`לוח שנה ל${label}`}>
          {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
          {Array.from({ length: leading }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
          {days.map(d => (
            <div
              className={`calendar-day${isAdmin ? " calendar-day--creatable" : ""}${d.isToday ? " calendar-day--today" : ""}`}
              key={d.date}
              role="gridcell"
              aria-current={d.isToday ? "date" : undefined}
              aria-label={isAdmin ? `${formatHebrewDate(d.date)} · לחיצה ליצירת אירוע` : formatHebrewDate(d.date)}
              tabIndex={isAdmin ? 0 : undefined}
              onClick={isAdmin ? e => { if (!(e.target as Element).closest("button, a")) setCreatingOn(d.date); } : undefined}
              onKeyDown={isAdmin ? e => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setCreatingOn(d.date); } } : undefined}
            >
              <span className="calendar-day-number">{d.day}</span>
              {(d.shifts.length > 0 || d.birthdays.length > 0 || d.holidays.length > 0 || d.events.length > 0 || d.housing) && (
                <div className="calendar-shift-list">
                  {d.holidays.map(holiday => (
                    <span key={holiday.name} className={`tag holiday-${holiday.religion}`}>{HOLIDAY_EMOJI[holiday.religion]} {holiday.name}</span>
                  ))}
                  {d.housing && (
                    <span className={`tag calendar-housing${d.housing.status === "MAYBE" ? " is-maybe" : ""}`} title={d.housing.option ?? undefined}>
                      <TentIcon size={13} />
                      <span>{housingLabel(d.housing)}</span>
                    </span>
                  )}
                  {d.birthdays.map(name => (
                    <span key={name} className="tag">🎂 {name}</span>
                  ))}
                  {d.events.map(event => (
                    <button
                      type="button"
                      key={event.id}
                      className={`tag calendar-shift-btn calendar-event-btn${event.isPublished ? " is-published" : ""}${selectedEvent?.event.id === event.id ? " is-selected" : ""}`}
                      aria-pressed={selectedEvent?.event.id === event.id}
                      title={isAdmin ? (event.isPublished ? "אירוע מפורסם" : "אירוע פרטי") : undefined}
                      onClick={() => setSelectedEvent({ event, mode: "view" })}
                    >
                      {isAdmin && event.isPublished && <EyeIcon size={13} />}
                      <span>{event.name}</span>
                    </button>
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
      {creatingOn && (
        <Modal title={`אירוע חדש · ${formatHebrewDate(creatingOn)}`} onClose={() => setCreatingOn(null)}>
          <AdminEventForm csrf={csrf} date={creatingOn} />
        </Modal>
      )}
      {selectedEvent?.mode === "view" && (
        <Modal title={selectedEvent.event.name} onClose={() => setSelectedEvent(null)}>
          <div className="stack">
            <p className="muted">{eventDates(selectedEvent.event)}</p>
            {isAdmin && (
              <p className="inline-icon-text">
                {selectedEvent.event.isPublished && <EyeIcon size={16} />}
                <span>{selectedEvent.event.isPublished ? "מפורסם לכל העובדים" : "פרטי — גלוי רק לך"}</span>
              </p>
            )}
            {!selectedEvent.event.isMine && <p className="muted">נוצר על ידי {selectedEvent.event.creator}</p>}
            {selectedEvent.event.details && <p className="pre-wrap">{selectedEvent.event.details}</p>}
            {isAdmin && selectedEvent.event.isMine && (
              <div className="row">
                <button type="button" className="btn secondary btn-sm btn-icon-leading" onClick={() => setSelectedEvent({ ...selectedEvent, mode: "edit" })}><PencilIcon size={16} /><span>עריכה</span></button>
                <button type="button" className="btn danger btn-sm btn-icon-leading" onClick={() => setSelectedEvent({ ...selectedEvent, mode: "delete" })}><TrashIcon size={16} /><span>מחיקה</span></button>
              </div>
            )}
          </div>
        </Modal>
      )}
      {selectedEvent?.mode === "edit" && (
        <Modal title={`עריכת ${selectedEvent.event.name}`} onClose={() => setSelectedEvent(null)}>
          <AdminEventForm csrf={csrf} date={selectedEvent.event.startDate} event={selectedEvent.event} />
        </Modal>
      )}
      {selectedEvent?.mode === "delete" && (
        <Modal title={`מחיקת ${selectedEvent.event.name}`} onClose={() => setSelectedEvent(null)}>
          <form className="stack" method="post" action="/api/actions">
            <input type="hidden" name="csrf" value={csrf} />
            <input type="hidden" name="action" value="adminEventDelete" />
            <input type="hidden" name="eventId" value={selectedEvent.event.id} />
            <input type="hidden" name="startDate" value={selectedEvent.event.startDate} />
            <p>למחוק את האירוע &quot;{selectedEvent.event.name}&quot;? לא ניתן לבטל פעולה זו.</p>
            <div className="row">
              <button className="btn danger">מחיקה</button>
              <button type="button" className="btn secondary" onClick={() => setSelectedEvent({ ...selectedEvent, mode: "view" })}>ביטול</button>
            </div>
          </form>
        </Modal>
      )}
      {selected && (
        <Modal title={`${formatHebrewDate(selected.date)} · ${selected.shift.startTime}–${selected.shift.endTime}`} onClose={() => setSelected(null)}>
          <div className="stack">
            <p className="muted inline-icon-text">
              <MapPinIcon size={16} />
              <span>{selected.shift.farm} · {selected.shift.fruitType}{selected.shift.fruitSubtype ? ` (${selected.shift.fruitSubtype})` : ""}</span>
            </p>
            {selected.shift.address && <p className="muted">{selected.shift.address}</p>}
            <p>מוביל משמרת: {selected.shift.leader}</p>
            {!isAdmin && (
              <div>
                <p>עובדים במשמרת:</p>
                {selected.shift.pickers.length > 0 ? (
                  <ol className="numbered-list">{selected.shift.pickers.map((p, i) => <li key={`${p.name}-${i}`}>{p.name}</li>)}</ol>
                ) : (
                  <p className="muted">טרם שובצו קוטפים</p>
                )}
              </div>
            )}
            {isAdmin && <div>
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
                              {p.quantities.length === 0 ? "—" : p.quantities.map(q => (
                                <span key={q.unit} className="unit-line">
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
                          {totalsByUnit(selected.shift.pickers).length === 0 ? "—" : totalsByUnit(selected.shift.pickers).map(t => (
                            <span key={t.unit} className="unit-line">
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
            </div>}
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
