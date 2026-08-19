"use client";
import { Fragment, useState } from "react";
import Link from "next/link";
import { formatHebrewDate } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { AddShiftButton } from "./add-shift-button";
import { EditShiftButton } from "./edit-shift-button";
import { AssignPickersButton } from "./assign-pickers-button";
import { AssignVehiclesButton } from "./assign-vehicles-button";
import { ChevronDownIcon, TrashIcon } from "./icons";
import type { Picker, SeasonOption } from "./shift-form";

export type ShiftRow = { id: number; date: string; slot: "MORNING" | "EVENING"; status: string; notes: string; season_id: number; leader_id: number; leader: string; farm: string; crop: string; picker_count: number };
export type UnitInfo = { unit: Unit; goal: number; produced: number };
export type UnitsByShift = Record<number, UnitInfo[]>;
export type PickerNamesByShift = Record<number, string[]>;
export type PickerIdsByShift = Record<number, number[]>;
export type VehiclesByShift = Record<number, Array<{ number: string; name: string }>>;
export type VehicleIdsByShift = Record<number, number[]>;

const SLOT_LABEL: Record<string, string> = { MORNING: "בוקר", EVENING: "ערב" };
const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };
const STATUS_TAG: Record<string, string> = { DRAFT: "warn", PUBLISHED: "", COMPLETED: "info", CANCELLED: "bad" };

export function ShiftsTable({
  shifts,
  pickers,
  seasons,
  unitsByShift,
  pickerNamesByShift,
  pickerIdsByShift,
  vehiclesByShift,
  vehicleIdsByShift,
  csrf
}: {
  shifts: ShiftRow[];
  pickers: Picker[];
  seasons: SeasonOption[];
  unitsByShift: UnitsByShift;
  pickerNamesByShift: PickerNamesByShift;
  pickerIdsByShift: PickerIdsByShift;
  vehiclesByShift: VehiclesByShift;
  vehicleIdsByShift: VehicleIdsByShift;
  csrf: string;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  const query = search.trim().toLowerCase();
  const filtered = shifts
    .filter(row => showCancelled || row.status !== "CANCELLED")
    .filter(row =>
      !query || row.farm.toLowerCase().includes(query) || row.crop.toLowerCase().includes(query) || row.leader.toLowerCase().includes(query) || formatHebrewDate(row.date).includes(query)
    );

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי חקלאי, גידול או מוביל משמרת" aria-label="חיפוש משמרות" />
        <label className="switch-row">
          <span className="switch">
            <input type="checkbox" checked={showCancelled} onChange={e => setShowCancelled(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
          </span>
          <span>הצג משמרות מבוטלות</span>
        </label>
        <AddShiftButton csrf={csrf} pickers={pickers} seasons={seasons} />
      </div>

      {filtered.length === 0 && <p className="muted">לא נמצאו משמרות</p>}

      {/* Mobile: scannable cards */}
      <div className="record-list mobile-only">
        {filtered.map(row => {
          const isOpen = expanded === row.id;
          const units = unitsByShift[row.id] ?? [];
          return (
            <article className="record-card" key={row.id}>
              <div className="record-card-head">
                <div className="record-card-body">
                  <span className="record-card-name">{formatHebrewDate(row.date)} · {SLOT_LABEL[row.slot]}</span>
                  <div className="record-card-meta">
                    <span>{row.farm} · {row.crop}</span>
                    <span>·</span>
                    <span>{row.leader}</span>
                  </div>
                  <span className={`tag ${STATUS_TAG[row.status] ?? ""}`}>{STATUS_LABEL[row.status] ?? row.status}</span>
                </div>
                <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי משמרת" : "פתיחת פרטי משמרת"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                  <ChevronDownIcon size={20} />
                </button>
              </div>
              <div className="record-card-actions">
                <RowActions row={row} csrf={csrf} pickers={pickers} seasons={seasons} pickerIdsByShift={pickerIdsByShift} vehicleIdsByShift={vehicleIdsByShift} unitsByShift={unitsByShift} />
              </div>
              {isOpen && (
                <div className="record-card-details">
                  <ShiftDetails units={units} pickerNames={pickerNamesByShift[row.id] ?? []} vehicles={vehiclesByShift[row.id] ?? []} notes={row.notes} />
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Desktop: data table */}
      <div className="table-wrap desktop-only">
        <table className="table">
          <thead>
            <tr><th aria-hidden="true"></th><th>תאריך</th><th>חלק יום</th><th>חקלאי וגידול</th><th>מוביל משמרת</th><th>קוטפים</th><th>יעד / בפועל</th><th>מצב</th><th>פעולות</th></tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const isOpen = expanded === row.id;
              const units = unitsByShift[row.id] ?? [];
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי משמרת" : "פתיחת פרטי משמרת"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                        <ChevronDownIcon size={18} />
                      </button>
                    </td>
                    <td>{formatHebrewDate(row.date)}</td>
                    <td>{SLOT_LABEL[row.slot]}</td>
                    <td>{row.farm} · {row.crop}</td>
                    <td>{row.leader}</td>
                    <td>{row.picker_count}</td>
                    <td>{units.length ? units.map((u, i) => (
                      <span key={u.unit}>
                        {i > 0 && " · "}
                        <span dir="ltr" className="ltr-field">{u.produced}/{u.goal}</span> {UNIT_LABEL[u.unit]}
                      </span>
                    )) : "—"}</td>
                    <td><span className={`tag ${STATUS_TAG[row.status] ?? ""}`}>{STATUS_LABEL[row.status] ?? row.status}</span></td>
                    <td>
                      <div className="actions-cell">
                        <RowActions row={row} csrf={csrf} pickers={pickers} seasons={seasons} pickerIdsByShift={pickerIdsByShift} vehicleIdsByShift={vehicleIdsByShift} unitsByShift={unitsByShift} />
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="worker-expand-row">
                      <td colSpan={9}>
                        <ShiftDetails units={units} pickerNames={pickerNamesByShift[row.id] ?? []} vehicles={vehiclesByShift[row.id] ?? []} notes={row.notes} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowActions({
  row,
  csrf,
  pickers,
  seasons,
  pickerIdsByShift,
  vehicleIdsByShift,
  unitsByShift
}: {
  row: ShiftRow;
  csrf: string;
  pickers: Picker[];
  seasons: SeasonOption[];
  pickerIdsByShift: PickerIdsByShift;
  vehicleIdsByShift: VehicleIdsByShift;
  unitsByShift: UnitsByShift;
}) {
  const editable = ["DRAFT", "PUBLISHED"].includes(row.status);
  return (
    <>
      {editable && <AssignPickersButton shiftId={row.id} leaderId={row.leader_id} csrf={csrf} />}
      {editable && <AssignVehiclesButton shiftId={row.id} csrf={csrf} />}
      {editable && (
        <EditShiftButton
          csrf={csrf}
          pickers={pickers}
          seasons={seasons}
          shift={{ id: row.id, date: row.date, slot: row.slot, season_id: row.season_id, leader_id: row.leader_id, notes: row.notes }}
          existingPickerIds={pickerIdsByShift[row.id] ?? []}
          existingVehicleIds={vehicleIdsByShift[row.id] ?? []}
          existingGoals={(unitsByShift[row.id] ?? []).map(u => ({ value: u.goal, unit: u.unit }))}
        />
      )}
      {row.status === "PUBLISHED" && <Link className="btn btn-sm secondary" href={`/leader/${row.id}`}>דוח</Link>}
      {row.status === "DRAFT" && <Transition csrf={csrf} id={row.id} target="PUBLISHED" label="פרסום" />}
      {row.status === "PUBLISHED" && (
        <>
          <Transition csrf={csrf} id={row.id} target="COMPLETED" label="סיום" />
          <Transition csrf={csrf} id={row.id} target="DRAFT" label="החזרה לטיוטה" />
        </>
      )}
      {!["COMPLETED", "CANCELLED"].includes(row.status) && <Transition csrf={csrf} id={row.id} target="CANCELLED" label="ביטול משמרת" icon={<TrashIcon size={18} />} danger />}
      {row.status === "CANCELLED" && <Transition csrf={csrf} id={row.id} target="DRAFT" label="שחזור לטיוטה" />}
    </>
  );
}

function ShiftDetails({ units, pickerNames, vehicles, notes }: { units: UnitInfo[]; pickerNames: string[]; vehicles: Array<{ number: string; name: string }>; notes: string }) {
  return (
    <div className="sub-tables">
      <div className="stack">
        <h3>יעד ותפוקה</h3>
        {units.length === 0 ? <p className="muted">לא הוגדר יעד</p> : (
          <ul>{units.map(u => <li key={u.unit}><span dir="ltr" className="ltr-field">{u.produced}/{u.goal}</span> {UNIT_LABEL[u.unit]}</li>)}</ul>
        )}
      </div>
      <div className="stack">
        <h3>קוטפים משובצים</h3>
        {pickerNames.length === 0 ? <p className="muted">לא שובצו קוטפים</p> : (
          <ol className="numbered-list">{pickerNames.map((name, i) => <li key={`${name}-${i}`}>{name}</li>)}</ol>
        )}
      </div>
      <div className="stack">
        <h3>רכבים</h3>
        {vehicles.length === 0 ? <p className="muted">לא שובצו רכבים</p> : <p>{vehicles.map(v => `${v.number} · ${v.name}`).join(" · ")}</p>}
      </div>
      {notes && (
        <div className="stack">
          <h3>הערות</h3>
          <p>{notes}</p>
        </div>
      )}
    </div>
  );
}

function Transition({ csrf, id, target, label, danger, icon }: { csrf: string; id: number; target: string; label: string; danger?: boolean; icon?: React.ReactNode }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="shiftTransition" />
      <input type="hidden" name="shiftId" value={id} />
      <input type="hidden" name="target" value={target} />
      {icon ? (
        <button className={`icon-btn${danger ? " danger" : ""}`} title={label} aria-label={label}>{icon}</button>
      ) : (
        <button className={`btn btn-sm${danger ? " danger" : " secondary"}`}>{label}</button>
      )}
    </form>
  );
}
