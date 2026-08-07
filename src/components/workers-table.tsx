"use client";
import { Fragment, useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { maskNationalId } from "@/lib/privacy";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { ResetPickerPassword } from "./reset-picker-password";
import { AddWorkerButton } from "./add-worker-button";

export type WorkerRow = { id: number; name: string; email: string; phone: string; national_id: string | null; role: "ADMIN" | "PICKER"; active: number };
export type WorkerShiftRow = { id: number; date: string; slot: "MORNING" | "EVENING"; status: string; farm: string; crop: string; lines: Array<{ quantity: number; unit: Unit }> };
export type ShiftsByUser = Record<number, { past: WorkerShiftRow[]; future: WorkerShiftRow[] }>;

const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };

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
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr><th aria-hidden="true"></th><th>מזהה</th><th>שם</th><th>תפקיד</th><th>דוא״ל</th><th>טלפון</th><th>מצב</th><th>פעולה</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8}>לא נמצאו עובדים</td></tr>}
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
                        <ChevronIcon />
                      </button>
                    )}
                  </td>
                  <td><span dir="ltr" className="ltr-field">{row.id}</span></td>
                  <td>{row.name}</td>
                  <td>{row.role === "ADMIN" ? "מנהל" : "עובד"}</td>
                  <td>{row.email}</td>
                  <td>{row.phone}</td>
                  <td><span className={`tag ${row.active ? "" : "bad"}`}>{row.active ? "פעיל" : "בארכיון"}</span></td>
                  <td>
                    <div className="actions-cell">
                      {row.role === "PICKER" && Boolean(row.active) && <ResetPickerPassword csrf={csrf} userId={row.id} />}
                      {row.id !== currentUserId && <ActiveForm csrf={csrf} id={row.id} active={!row.active} />}
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
                  <td>{s.slot === "MORNING" ? "בוקר" : "ערב"}</td>
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

function ActiveForm({ csrf, id, active }: { csrf: string; id: number; active: boolean }) {
  return (
    <form action="/api/actions" method="post">
      <input type="hidden" name="csrf" value={csrf} />
      <input type="hidden" name="action" value="setActive" />
      <input type="hidden" name="entity" value="USER" />
      <input type="hidden" name="entityId" value={id} />
      <input type="hidden" name="active" value={active ? "1" : "0"} />
      {active ? (
        <button className="btn">שחזור</button>
      ) : (
        <button className="icon-btn" title="העברה לארכיון" aria-label="העברה לארכיון"><TrashIcon /></button>
      )}
    </form>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
