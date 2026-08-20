"use client";
import { Fragment, useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { maskNationalId } from "@/lib/privacy";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { ResetPickerPassword } from "./reset-picker-password";
import { AddWorkerButton } from "./add-worker-button";
import { EditWorkerButton } from "./edit-worker-button";
import { ActiveSwitch } from "./active-switch";
import { ChevronDownIcon } from "./icons";

export type WorkerRow = { id: number; name: string; email: string; phone: string; national_id: string | null; notes: string; role: "ADMIN" | "PICKER"; active: number };
export type WorkerShiftRow = { id: number; date: string; slot: "MORNING" | "EVENING" | "PRE_DAWN"; status: string; farm: string; crop: string; lines: Array<{ quantity: number; unit: Unit }> };
export type ShiftsByUser = Record<number, { past: WorkerShiftRow[]; future: WorkerShiftRow[] }>;

const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };
const SLOT_LABEL: Record<string, string> = { MORNING: "בוקר", EVENING: "ערב", PRE_DAWN: "לפנות בוקר" };

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function WorkersTable({ users, shiftsByUser, csrf, currentUserId }: { users: WorkerRow[]; shiftsByUser: ShiftsByUser; csrf: string; currentUserId: number }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const query = search.trim().toLowerCase();
  const filtered = query
    ? users.filter(row => row.name.toLowerCase().includes(query) || row.email.toLowerCase().includes(query) || row.phone.toLowerCase().includes(query))
    : users;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם, דוא״ל או טלפון" aria-label="חיפוש עובדים" />
        <AddWorkerButton csrf={csrf} />
      </div>

      {filtered.length === 0 && <p className="muted">לא נמצאו עובדים</p>}

      {/* Mobile: scannable cards */}
      <div className="record-list mobile-only">
        {filtered.map(row => {
          const canExpand = row.role === "PICKER";
          const isOpen = canExpand && expanded === row.id;
          const shifts = shiftsByUser[row.id];
          return (
            <article className="record-card" key={row.id}>
              <div className="record-card-head">
                <span className="avatar" aria-hidden="true">{initials(row.name)}</span>
                <div className="record-card-body">
                  <span className="record-card-name">{row.name}</span>
                  <div className="record-card-meta">
                    <span>{row.role === "ADMIN" ? "מנהל" : "עובד"}</span>
                    <span>·</span>
                    <span dir="ltr" className="ltr-field">{row.phone}</span>
                  </div>
                </div>
                {canExpand && (
                  <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי עובד" : "פתיחת פרטי עובד"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                    <ChevronDownIcon size={20} />
                  </button>
                )}
              </div>
              <div className="record-card-actions">
                <ActiveSwitch csrf={csrf} entity="USER" id={row.id} active={Boolean(row.active)} disabled={row.id === currentUserId} disabledTitle="לא ניתן להשבית את החשבון שלך" />
                <EditWorkerButton csrf={csrf} worker={row} />
                {row.role === "PICKER" && Boolean(row.active) && <ResetPickerPassword csrf={csrf} userId={row.id} />}
              </div>
              {isOpen && (
                <div className="record-card-details">
                  <WorkerDetails nationalId={row.national_id} past={shifts?.past ?? []} future={shifts?.future ?? []} />
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
            <tr><th aria-hidden="true"></th><th>מזהה</th><th>שם</th><th>תפקיד</th><th>דוא״ל</th><th>טלפון</th><th>מצב</th><th>פעולה</th></tr>
          </thead>
          <tbody>
            {filtered.map(row => {
              const canExpand = row.role === "PICKER";
              const isOpen = canExpand && expanded === row.id;
              const shifts = shiftsByUser[row.id];
              return (
                <Fragment key={row.id}>
                  <tr>
                    <td>
                      {canExpand && (
                        <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי עובד" : "פתיחת פרטי עובד"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                          <ChevronDownIcon size={18} />
                        </button>
                      )}
                    </td>
                    <td><span dir="ltr" className="ltr-field">{row.id}</span></td>
                    <td>{row.name}</td>
                    <td>{row.role === "ADMIN" ? "מנהל" : "עובד"}</td>
                    <td>{row.email}</td>
                    <td><span dir="ltr" className="ltr-field">{row.phone}</span></td>
                    <td><ActiveSwitch csrf={csrf} entity="USER" id={row.id} active={Boolean(row.active)} disabled={row.id === currentUserId} disabledTitle="לא ניתן להשבית את החשבון שלך" /></td>
                    <td>
                      <div className="actions-cell">
                        <EditWorkerButton csrf={csrf} worker={row} />
                        {row.role === "PICKER" && Boolean(row.active) && <ResetPickerPassword csrf={csrf} userId={row.id} />}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="worker-expand-row">
                      <td colSpan={8}>
                        <WorkerDetails nationalId={row.national_id} past={shifts?.past ?? []} future={shifts?.future ?? []} />
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

function WorkerDetails({ nationalId, past, future }: { nationalId: string | null; past: WorkerShiftRow[]; future: WorkerShiftRow[] }) {
  return (
    <div className="sub-tables">
      <div className="stack">
        <h3>פרטים נוספים</h3>
        <p><strong>תעודת זהות: </strong>{nationalId ? <span dir="ltr" className="ltr-field">{maskNationalId(nationalId)}</span> : "חסרה (רשומה ותיקה)"}</p>
      </div>
      <ShiftsList title="משמרות עתידיות" rows={future} empty="אין שיבוצים עתידיים" />
      <ShiftsList title="משמרות קודמות" rows={past} empty="אין משמרות קודמות" />
    </div>
  );
}

function ShiftsList({ title, rows, empty }: { title: string; rows: WorkerShiftRow[]; empty: string }) {
  return (
    <div className="stack">
      <h3>{title}</h3>
      {rows.length === 0 ? <p className="muted">{empty}</p> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>תאריך</th><th>חלק יום</th><th>חקלאי וגידול</th><th>מצב</th><th>כמות</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td>{formatHebrewDate(s.date)}</td>
                  <td>{SLOT_LABEL[s.slot]}</td>
                  <td>{s.farm} · {s.crop}</td>
                  <td>{STATUS_LABEL[s.status] ?? s.status}</td>
                  <td>{s.lines.length ? s.lines.map((l) => `${l.quantity} ${UNIT_LABEL[l.unit]}`).join(" · ") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
