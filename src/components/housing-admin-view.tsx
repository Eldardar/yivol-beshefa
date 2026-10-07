"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { WorkerPicker, type WorkerOption } from "./worker-picker";
import { UserAvatar } from "./user-avatar";
import { CalendarMonthNav } from "./calendar-month-nav";
import { Modal } from "./modal";
import { VillagePicker, initialOptionId, nightCost, sleepsInVillage, statusLabel, type BookableVillage, type BookedOption, type HousingEntry, type Status } from "./housing-calendar";
import { formatHebrewDate } from "@/lib/dates";

export type { WorkerOption } from "./worker-picker";

export type NamedWorker = { id: number; name: string; avatar_version?: string | null };
export type HousingOverviewDay = {
  date: string;
  day: number;
  weekday: number;
  isToday: boolean;
  workersByStatus: { inVillage: NamedWorker[]; maybe: NamedWorker[]; away: NamedWorker[]; noResponse: NamedWorker[] };
};
export type HousingDay = { date: string; day: number; weekday: number; isToday: boolean; isPast: boolean };
export type HousingByWorker = Record<number, Record<string, HousingEntry>>;

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
const OPTIONS: { status: Status; cssKey: "available" | "maybe" | "unavailable" }[] = [
  { status: "IN_VILLAGE", cssKey: "available" },
  { status: "MAYBE", cssKey: "maybe" },
  { status: "AWAY", cssKey: "unavailable" }
];
const EMPTY: HousingEntry = { status: null, option: null };
const sameEntry = (a: HousingEntry, b: HousingEntry) => a.status === b.status && (a.option?.id ?? null) === (b.option?.id ?? null);
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
                          <UserAvatar userId={w.id} name={w.name} avatarVersion={w.avatar_version} />
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

function WorkerHousingCalendar({ worker, label, days, entries: initial, villages, csrf }: { worker: WorkerOption; label: string; days: HousingDay[]; entries: Record<string, HousingEntry>; villages: BookableVillage[]; csrf: string }) {
  const router = useRouter();
  const leadingPad = days.length ? days[0]!.weekday : 0;
  const [map, setMap] = useState<Record<string, HousingEntry>>(initial);
  const [draft, setDraft] = useState<Record<string, HousingEntry>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [optionId, setOptionId] = useState<number | null>(() => initialOptionId(days.map(d => ({ ...d, locked: false, status: null, option: initial[d.date]?.option ?? null })), villages));
  const [villageId, setVillageId] = useState<number | null>(() => villages.find(v => v.options.some(o => o.id === optionId))?.id ?? (villages.length === 1 ? villages[0]!.id : null));

  const selectedVillage = villages.find(v => v.id === villageId) ?? null;
  const selectedOption = selectedVillage?.options.find(o => o.id === optionId) ?? null;
  const selected: BookedOption | null = selectedVillage && selectedOption ? { id: selectedOption.id, name: selectedOption.name, villageName: selectedVillage.name, costPerDay: selectedOption.costPerDay } : null;
  const changed = days.filter(d => !sameEntry(draft[d.date] ?? EMPTY, map[d.date] ?? EMPTY));

  function chooseVillage(id: number) {
    setVillageId(id);
    setError("");
    const options = villages.find(v => v.id === id)?.options ?? [];
    setOptionId(options.length === 1 ? options[0]!.id : null);
  }

  function toggle(date: string, status: Status) {
    const current = draft[date] ?? EMPTY;
    const set = (next: HousingEntry) => { setError(""); setDraft(prev => ({ ...prev, [date]: next })); };
    if (!sleepsInVillage(status)) return set(current.status === status ? EMPTY : { status, option: null });
    // Re-clicking the same choice clears it, unless a different sleeping option was picked meanwhile.
    if (current.status === status && (!selected || current.option?.id === selected.id)) return set(EMPTY);
    if (!selected && villages.length > 0) return setError("יש לבחור כפר ואפשרות לינה לפני שיבוץ לינה בכפר");
    set({ status, option: selected });
  }

  function cancel() {
    setDraft(map);
    setError("");
  }

  async function save() {
    const entries = changed.map(d => {
      const entry = draft[d.date] ?? EMPTY;
      return { date: d.date, status: entry.status, sleepingOptionId: entry.option?.id ?? null };
    });
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
      <VillagePicker villages={villages} villageId={villageId} optionId={optionId} onVillage={chooseVillage} onOption={id => { setOptionId(id); setError(""); }} title={`שיבוץ ${worker.name} — כפר ואפשרות לינה`} />
      {error && <p className="alert" role="alert">{error}</p>}
      <div className="calendar calendar--full" role="grid" aria-label={`מגורים של ${worker.name} ל${label}`}>
        {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
        {Array.from({ length: leadingPad }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
        {days.map(d => {
          const entry = draft[d.date] ?? EMPTY;
          const status = entry.status;
          // Past days stay dark (locked colors) but remain editable for admins.
          const statusClass = d.isPast
            ? (status ? ` calendar-day--locked-${STATUS_CSS_KEY[status]}` : " calendar-day--locked")
            : (status ? ` calendar-day--${STATUS_CSS_KEY[status]}` : "");
          const cost = sleepsInVillage(status) ? nightCost(entry) : selected?.costPerDay ?? null;
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
                    {statusLabel(opt.status, cost)}
                  </button>
                ))}
              </div>
              {sleepsInVillage(status) && entry.option && <span className="calendar-day-booking">{entry.option.villageName} · {entry.option.name}</span>}
            </div>
          );
        })}
      </div>
      {days.length > 0 && (
        <div className="actions">
          <button type="button" className="btn" onClick={save} disabled={changed.length === 0 || busy}>{busy ? "שומר…" : "שמירת שינויים"}</button>
          <button type="button" className="btn secondary" onClick={cancel} disabled={changed.length === 0 || busy}>ביטול</button>
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
  housingByWorker,
  villages
}: {
  csrf: string;
  workers: WorkerOption[];
  year: number;
  month: number;
  label: string;
  days: HousingDay[];
  overview: HousingOverviewDay[];
  housingByWorker: HousingByWorker;
  villages: BookableVillage[];
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = workers.find(w => w.id === selectedId) ?? null;

  return (
    <div className="stack">
      <WorkerPicker workers={workers} selected={selected} onSelect={w => setSelectedId(w?.id ?? null)} />
      <section className="calendar-month">
        <CalendarMonthNav year={year} month={month} basePath="/admin/housing" />
        {selected ? (
          <WorkerHousingCalendar key={`${selected.id}-${year}-${month}`} worker={selected} label={label} days={days} entries={housingByWorker[selected.id] ?? {}} villages={villages} csrf={csrf} />
        ) : (
          <HousingOverviewCalendar label={label} days={overview} />
        )}
      </section>
    </div>
  );
}
