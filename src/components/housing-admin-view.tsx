"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
export type HousingDay = { date: string; day: number; weekday: number; isToday: boolean; isPast: boolean; status: Status | null };
export type HousingByWorker = Record<number, Record<string, Status>>;

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const OPTIONS: { status: Status; label: string; cssKey: "available" | "maybe" | "unavailable" }[] = [
  { status: "IN_VILLAGE", label: "ישן בכפר 25 🪙", cssKey: "available" },
  { status: "MAYBE", label: "אולי", cssKey: "maybe" },
  { status: "AWAY", label: "חוגג את החיים במקום אחר", cssKey: "unavailable" }
];
const STATUS_LABEL = Object.fromEntries(OPTIONS.map(o => [o.status, o.label])) as Record<Status, string>;
const STATUS_CSS_KEY = Object.fromEntries(OPTIONS.map(o => [o.status, o.cssKey])) as Record<Status, "available" | "maybe" | "unavailable">;
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
    </>
  );
}

function WorkerHousingCalendar({ worker, label, days, csrf }: { worker: WorkerOption; label: string; days: HousingDay[]; csrf: string }) {
  const router = useRouter();
  const leadingPad = days.length ? days[0]!.weekday : 0;
  const editableDays = days.filter(d => !d.isPast);
  const [map, setMap] = useState<Record<string, Status | null>>(() => Object.fromEntries(editableDays.map(d => [d.date, d.status])));
  const [draft, setDraft] = useState<Record<string, Status | null>>(map);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const dirty = editableDays.some(d => (draft[d.date] ?? null) !== (map[d.date] ?? null));

  function toggle(date: string, status: Status) {
    setDraft(prev => ({ ...prev, [date]: prev[date] === status ? null : status }));
  }

  function cancel() {
    setDraft(map);
    setError("");
  }

  async function save() {
    const entries = editableDays
      .filter(d => (draft[d.date] ?? null) !== (map[d.date] ?? null))
      .map(d => ({ date: d.date, status: draft[d.date] ?? null }));
    if (entries.length === 0) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/housing", {
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
      <div className="calendar calendar--full" role="grid" aria-label={`מגורים של ${worker.name} ל${label}`}>
        {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
        {Array.from({ length: leadingPad }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
        {days.map(d => {
          if (d.isPast) {
            const colorClass = d.status ? ` calendar-day--locked-${STATUS_CSS_KEY[d.status]}` : " calendar-day--locked";
            return (
              <div className={`calendar-day calendar-day--past-choice${colorClass}`} key={d.date} role="gridcell" aria-disabled="true">
                <span className="calendar-day-number">{d.day}</span>
                <span className="calendar-day-status-label">{d.status ? STATUS_LABEL[d.status] : "לא עודכן"}</span>
              </div>
            );
          }
          const status = draft[d.date] ?? null;
          const statusClass = status ? ` calendar-day--${STATUS_CSS_KEY[status]}` : "";
          return (
            <div className={`calendar-day${statusClass}${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell">
              <span className="calendar-day-number">{d.day}</span>
              <div className="status-options" role="radiogroup" aria-label={`סידור שינה של ${worker.name} ל-${d.day} ב${label}`}>
                {OPTIONS.map(opt => (
                  <button
                    type="button"
                    key={opt.status}
                    className={`status-option status-option--${opt.cssKey}${status === opt.status ? " is-selected" : ""}`}
                    role="radio"
                    aria-checked={status === opt.status}
                    disabled={busy}
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
      {editableDays.length > 0 && (
        <div className="actions">
          <button type="button" className="btn" onClick={save} disabled={!dirty || busy}>{busy ? "שומר…" : "שמירת שינויים"}</button>
          <button type="button" className="btn secondary" onClick={cancel} disabled={!dirty || busy}>ביטול</button>
        </div>
      )}
    </div>
  );
}

export function HousingAdminView({
  csrf,
  workers,
  year,
  month,
  label,
  days,
  overview,
  housingByWorker
}: {
  csrf: string;
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
          <WorkerHousingCalendar key={`${selected.id}-${year}-${month}`} worker={selected} label={label} days={workerDays} csrf={csrf} />
        ) : (
          <HousingOverviewCalendar label={label} days={overview} />
        )}
      </section>
    </div>
  );
}
