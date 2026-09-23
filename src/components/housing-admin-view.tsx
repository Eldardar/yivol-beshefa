"use client";
import { useState } from "react";
import { WorkerPicker, initials, type WorkerOption } from "./worker-picker";
import { CalendarMonthNav } from "./calendar-month-nav";
import { Modal } from "./modal";
import { formatHebrewDate } from "@/lib/dates";

export type { WorkerOption } from "./worker-picker";

type Status = "IN_VILLAGE" | "MAYBE" | "AWAY";
export type NamedWorker = { id: number; name: string };
export type HousingOverviewDay = {
  date: string;
  day: number;
  weekday: number;
  isToday: boolean;
  workersByStatus: { inVillage: NamedWorker[]; maybe: NamedWorker[]; away: NamedWorker[]; noResponse: NamedWorker[] };
};
export type HousingDay = { date: string; day: number; weekday: number; isToday: boolean; status: Status | null };
export type HousingByWorker = Record<number, Record<string, Status>>;

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const STATUS_LABEL: Record<Status, string> = { IN_VILLAGE: "ישן בכפר", MAYBE: "אולי", AWAY: "חוגג את החיים במקום אחר" };
const STATUS_CSS_KEY: Record<Status, "available" | "maybe" | "unavailable"> = { IN_VILLAGE: "available", MAYBE: "maybe", AWAY: "unavailable" };
const OVERVIEW_SECTIONS: { key: keyof HousingOverviewDay["workersByStatus"]; label: string; pillClass: string }[] = [
  { key: "inVillage", label: "ישן בכפר", pillClass: "count-pill--available" },
  { key: "maybe", label: "אולי", pillClass: "count-pill--maybe" },
  { key: "away", label: "חוגג במקום אחר", pillClass: "count-pill--unavailable" },
  { key: "noResponse", label: "לא עדכנו", pillClass: "count-pill--none" }
];

function HousingOverviewCalendar({ label, days }: { label: string; days: HousingOverviewDay[] }) {
  const leadingPad = days.length ? days[0]!.weekday : 0;
  const [selected, setSelected] = useState<HousingOverviewDay | null>(null);

  return (
    <>
      <div className="calendar calendar--full" role="grid" aria-label={`תצוגת מגורים חודשית ל${label}`}>
        {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
        {Array.from({ length: leadingPad }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
        {days.map(d => (
          <div className={`calendar-day${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell">
            <button type="button" className="calendar-day-trigger" onClick={() => setSelected(d)} aria-haspopup="dialog">
              <span className="calendar-day-number">{d.day}</span>
              <div className="calendar-day-counts">
                {OVERVIEW_SECTIONS.map(section => (
                  <span className={`count-pill ${section.pillClass}`} key={section.key}>{section.label}: {d.workersByStatus[section.key].length}</span>
                ))}
              </div>
            </button>
          </div>
        ))}
      </div>
      {selected && (
        <Modal title={`מגורים ל${formatHebrewDate(selected.date)}`} onClose={() => setSelected(null)}>
          <div className="stack">
            {OVERVIEW_SECTIONS.map(section => {
              const list = selected.workersByStatus[section.key];
              return (
                <section key={section.key}>
                  <h3>{section.label} ({list.length})</h3>
                  {list.length === 0 ? (
                    <p className="muted">אין עובדים</p>
                  ) : (
                    <div className="status-worker-list">
                      {list.map(w => (
                        <div className="status-worker-row" key={w.id}>
                          <span className="avatar" aria-hidden="true">{initials(w.name)}</span>
                          <span>{w.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}

function WorkerHousingCalendar({ worker, label, days }: { worker: WorkerOption; label: string; days: HousingDay[] }) {
  const leadingPad = days.length ? days[0]!.weekday : 0;
  return (
    <div className="calendar calendar--full" role="grid" aria-label={`מגורים של ${worker.name} ל${label}`}>
      {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
      {Array.from({ length: leadingPad }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
      {days.map(d => {
        const colorClass = d.status ? ` calendar-day--locked-${STATUS_CSS_KEY[d.status]}` : " calendar-day--locked";
        return (
          <div className={`calendar-day calendar-day--past-choice${colorClass}${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell">
            <span className="calendar-day-number">{d.day}</span>
            <span className="calendar-day-status-label">{d.status ? STATUS_LABEL[d.status] : "לא עודכן"}</span>
          </div>
        );
      })}
    </div>
  );
}

export function HousingAdminView({
  workers,
  year,
  month,
  label,
  days,
  overview,
  housingByWorker
}: {
  workers: WorkerOption[];
  year: number;
  month: number;
  label: string;
  days: HousingDay[];
  overview: HousingOverviewDay[];
  housingByWorker: HousingByWorker;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = workers.find(w => w.id === selectedId) ?? null;
  const workerDays: HousingDay[] = days.map(d => ({ ...d, status: (selected ? housingByWorker[selected.id]?.[d.date] : undefined) ?? null }));

  return (
    <div className="stack">
      <WorkerPicker workers={workers} selected={selected} onSelect={w => setSelectedId(w?.id ?? null)} />
      <section className="calendar-month">
        <CalendarMonthNav year={year} month={month} basePath="/admin/housing" />
        {selected ? (
          <WorkerHousingCalendar worker={selected} label={label} days={workerDays} />
        ) : (
          <HousingOverviewCalendar label={label} days={overview} />
        )}
      </section>
    </div>
  );
}
