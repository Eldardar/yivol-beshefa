"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerPicker, initials, type WorkerOption } from "./worker-picker";
import { CalendarMonthNav } from "./calendar-month-nav";
import { Modal } from "./modal";
import { formatHebrewDate } from "@/lib/dates";

export type { WorkerOption } from "./worker-picker";

type Status = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";
export type AvailabilityDay = { date: string; day: number; weekday: number; isToday: boolean; isPast: boolean };
export type AvailabilityMonth = { key: string; label: string; days: AvailabilityDay[] };
export type AvailabilityByWorker = Record<number, Record<string, Status>>;
export type NamedWorker = { id: number; name: string };
export type AvailabilityOverviewDay = {
  date: string;
  day: number;
  weekday: number;
  isToday: boolean;
  workersByStatus: { available: NamedWorker[]; maybe: NamedWorker[]; unavailable: NamedWorker[]; noResponse: NamedWorker[] };
};
export type AvailabilityOverview = { year: number; month: number; label: string; days: AvailabilityOverviewDay[] };

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];
const OPTIONS: { status: Status; label: string; className: string }[] = [
  { status: "AVAILABLE", label: "רוצה לעבוד", className: "status-option--available" },
  { status: "MAYBE", label: "אולי יש לי תוכניות אחרות", className: "status-option--maybe" },
  { status: "UNAVAILABLE", label: "מנוחה", className: "status-option--unavailable" }
];
const OVERVIEW_SECTIONS: { key: keyof AvailabilityOverviewDay["workersByStatus"]; label: string; pillClass: string }[] = [
  { key: "available", label: "רוצה לעבוד", pillClass: "count-pill--available" },
  { key: "maybe", label: "אולי", pillClass: "count-pill--maybe" },
  { key: "unavailable", label: "מנוחה", pillClass: "count-pill--unavailable" },
  { key: "noResponse", label: "לא ענו", pillClass: "count-pill--none" }
];

export function AvailabilityOverviewCalendar({ year, month, label, days }: { year: number; month: number; label: string; days: AvailabilityOverviewDay[] }) {
  const leadingPad = days.length ? days[0]!.weekday : 0;
  const [selected, setSelected] = useState<AvailabilityOverviewDay | null>(null);

  return (
    <section className="calendar-month">
      <CalendarMonthNav year={year} month={month} basePath="/admin/shifts/availability" />
      <div className="calendar" role="grid" aria-label={`תצוגת זמינות חודשית ל${label}`}>
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
        <Modal title={`זמינות ל${formatHebrewDate(selected.date)}`} onClose={() => setSelected(null)}>
          <div className="stack">
            {OVERVIEW_SECTIONS.map(section => {
              const list = selected.workersByStatus[section.key];
              return (
                <details className="status-section" key={section.key}>
                  <summary>{section.label} ({list.length})</summary>
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
                </details>
              );
            })}
          </div>
        </Modal>
      )}
    </section>
  );
}

function WorkerAvailabilityCalendar({
  worker,
  months,
  initialMap,
  csrf
}: {
  worker: WorkerOption;
  months: AvailabilityMonth[];
  initialMap: Record<string, Status>;
  csrf: string;
}) {
  const router = useRouter();
  const days = months.flatMap(m => m.days.filter(d => d.weekday !== 6));
  const [map, setMap] = useState<Record<string, Status | null>>(() => Object.fromEntries(days.map(d => [d.date, initialMap[d.date] ?? null])));
  const [draft, setDraft] = useState<Record<string, Status | null>>(map);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dirty = days.some(d => (draft[d.date] ?? null) !== (map[d.date] ?? null));

  function toggle(date: string, status: Status) {
    setDraft(prev => ({ ...prev, [date]: prev[date] === status ? null : status }));
  }

  function cancel() {
    setDraft(map);
    setError("");
  }

  async function save() {
    const entries = days
      .filter(d => (draft[d.date] ?? null) !== (map[d.date] ?? null))
      .map(d => ({ date: d.date, status: draft[d.date] ?? null }));
    if (entries.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/availability", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId: worker.id, entries, csrf })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "השמירה נכשלה");
      setMap(draft);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "השמירה נכשלה");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      {error && <p className="alert" role="alert">{error}</p>}
      {months.map(month => {
        const monthDays = month.days.filter(d => d.weekday !== 6);
        const leadingPad = monthDays.length ? monthDays[0]!.weekday : 0;
        return (
          <section className="calendar-month" key={month.key}>
            <strong className="calendar-month-label">{month.label}</strong>
            <div className="calendar" role="grid" aria-label={`זמינות ${worker.name} ל${month.label}`}>
              {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
              {Array.from({ length: leadingPad }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
              {monthDays.map(d => {
                const status = d.isPast ? (map[d.date] ?? null) : (draft[d.date] ?? null);
                const statusClass = status ? ` calendar-day--${status.toLowerCase()}` : "";
                const pastClass = d.isPast ? " calendar-day--past" : "";
                return (
                  <div className={`calendar-day${statusClass}${pastClass}${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell" aria-disabled={d.isPast}>
                    <span className="calendar-day-number">{d.day}</span>
                    <div className="status-options" role="radiogroup" aria-label={`זמינות ל-${d.day} ב${month.label}`}>
                      {OPTIONS.map(opt => (
                        <button
                          type="button"
                          key={opt.status}
                          className={`status-option ${opt.className}${status === opt.status ? " is-selected" : ""}`}
                          role="radio"
                          aria-checked={status === opt.status}
                          disabled={busy || d.isPast}
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
      <div className="actions">
        <button type="button" className="btn" onClick={save} disabled={!dirty || busy}>{busy ? "שומר…" : "שמירת שינויים"}</button>
        <button type="button" className="btn secondary" onClick={cancel} disabled={!dirty || busy}>ביטול</button>
      </div>
    </div>
  );
}

export function WorkerAvailabilityView({
  workers,
  months,
  availabilityByWorker,
  csrf,
  overview
}: {
  workers: WorkerOption[];
  months: AvailabilityMonth[];
  availabilityByWorker: AvailabilityByWorker;
  csrf: string;
  overview: AvailabilityOverview;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = workers.find(w => w.id === selectedId) ?? null;

  return (
    <div className="stack">
      <WorkerPicker workers={workers} selected={selected} onSelect={w => setSelectedId(w?.id ?? null)} />

      {selected ? (
        <WorkerAvailabilityCalendar
          key={selected.id}
          worker={selected}
          months={months}
          initialMap={availabilityByWorker[selected.id] ?? {}}
          csrf={csrf}
        />
      ) : (
        <AvailabilityOverviewCalendar year={overview.year} month={overview.month} label={overview.label} days={overview.days} />
      )}
    </div>
  );
}
