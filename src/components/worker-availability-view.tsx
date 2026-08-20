"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { SearchIcon, XIcon } from "./icons";

type Status = "AVAILABLE" | "MAYBE" | "UNAVAILABLE";
export type WorkerOption = { id: number; name: string; phone: string };
export type AvailabilityDay = { date: string; day: number; isToday: boolean };
export type AvailabilityByWorker = Record<number, Record<string, Status>>;

const WEEKDAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי"];
const OPTIONS: { status: Status; label: string; className: string }[] = [
  { status: "AVAILABLE", label: "רוצה לעבוד", className: "status-option--available" },
  { status: "MAYBE", label: "אולי יש לי תוכניות אחרות", className: "status-option--maybe" },
  { status: "UNAVAILABLE", label: "מנוחה", className: "status-option--unavailable" }
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function WorkerAvailabilityCalendar({
  worker,
  days,
  leadingPad,
  initialMap,
  csrf
}: {
  worker: WorkerOption;
  days: AvailabilityDay[];
  leadingPad: number;
  initialMap: Record<string, Status>;
  csrf: string;
}) {
  const router = useRouter();
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
      <section className="calendar-month">
        <div className="calendar" role="grid" aria-label={`זמינות ${worker.name}`}>
          {WEEKDAYS.map(weekday => <div className="calendar-head" key={weekday} role="columnheader">{weekday}</div>)}
          {Array.from({ length: leadingPad }, (_, i) => <div className="calendar-pad" key={`pad-${i}`} aria-hidden="true" />)}
          {days.map(d => {
            const status = draft[d.date] ?? null;
            const statusClass = status ? ` calendar-day--${status.toLowerCase()}` : "";
            return (
              <div className={`calendar-day${statusClass}${d.isToday ? " calendar-day--today" : ""}`} key={d.date} role="gridcell">
                <span className="calendar-day-number">{d.day}</span>
                <div className="status-options" role="radiogroup" aria-label={`זמינות ל-${d.day}`}>
                  {OPTIONS.map(opt => (
                    <button
                      type="button"
                      key={opt.status}
                      className={`status-option ${opt.className}${status === opt.status ? " is-selected" : ""}`}
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
      </section>
      <div className="actions">
        <button type="button" className="btn" onClick={save} disabled={!dirty || busy}>{busy ? "שומר…" : "שמירת שינויים"}</button>
        <button type="button" className="btn secondary" onClick={cancel} disabled={!dirty || busy}>ביטול</button>
      </div>
    </div>
  );
}

export function WorkerAvailabilityView({
  workers,
  days,
  leadingPad,
  availabilityByWorker,
  csrf
}: {
  workers: WorkerOption[];
  days: AvailabilityDay[];
  leadingPad: number;
  availabilityByWorker: AvailabilityByWorker;
  csrf: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const selected = workers.find(w => w.id === selectedId) ?? null;
  const q = query.trim().toLowerCase();
  const results = q ? workers.filter(w => w.name.toLowerCase().includes(q) || w.phone.includes(q)) : workers;

  function select(worker: WorkerOption) {
    setSelectedId(worker.id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="stack">
      <div className="row worker-picker-row">
        <div className="worker-search" ref={boxRef}>
          {selected ? (
            <div className="worker-search-selected">
              <span className="avatar" aria-hidden="true">{initials(selected.name)}</span>
              <span className="worker-search-selected-name">{selected.name}</span>
              <button type="button" className="icon-btn" aria-label="בחירת עובד/ת אחר/ת" onClick={() => { setSelectedId(null); setOpen(true); }}>
                <XIcon size={18} />
              </button>
            </div>
          ) : (
            <>
              <div className="input worker-search-input-wrap">
                <SearchIcon size={18} className="worker-search-icon" />
                <input
                  type="search"
                  className="worker-search-input"
                  placeholder="חיפוש עובד/ת לפי שם או טלפון"
                  aria-label="חיפוש עובד/ת"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                />
              </div>
              {open && (
                <div className="worker-search-results" role="listbox">
                  {results.length === 0 && <p className="muted worker-search-empty">לא נמצאו עובדים</p>}
                  {results.map(worker => (
                    <button type="button" key={worker.id} className="worker-search-result" role="option" aria-selected={false} onClick={() => select(worker)}>
                      <span className="avatar" aria-hidden="true">{initials(worker.name)}</span>
                      <span className="worker-search-result-body">
                        <span className="worker-search-result-name">{worker.name}</span>
                        <span className="muted worker-search-result-phone">{worker.phone}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        <button type="button" className="btn secondary" onClick={() => setListOpen(true)}>הצג את כל העובדים</button>
      </div>

      {listOpen && (
        <Modal title="כל העובדים" onClose={() => setListOpen(false)}>
          <div className="worker-list" role="listbox">
            {workers.length === 0 && <p className="muted">אין עובדים פעילים</p>}
            {workers.map(worker => (
              <button
                type="button"
                key={worker.id}
                className="worker-search-result"
                role="option"
                aria-selected={false}
                onClick={() => { select(worker); setListOpen(false); }}
              >
                <span className="avatar" aria-hidden="true">{initials(worker.name)}</span>
                <span className="worker-search-result-body">
                  <span className="worker-search-result-name">{worker.name}</span>
                  <span className="muted worker-search-result-phone">{worker.phone}</span>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {!selected && (
        <section className="card empty-state">
          <p>בחר/י עובד/ת כדי לראות ולערוך את הזמינות שלה/ו לשבועיים הקרובים.</p>
        </section>
      )}

      {selected && (
        <WorkerAvailabilityCalendar
          key={selected.id}
          worker={selected}
          days={days}
          leadingPad={leadingPad}
          initialMap={availabilityByWorker[selected.id] ?? {}}
          csrf={csrf}
        />
      )}
    </div>
  );
}
