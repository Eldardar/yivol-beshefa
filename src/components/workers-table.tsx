"use client";
import { Fragment, useState } from "react";
import { formatHebrewDate } from "@/lib/dates";
import { maskNationalId } from "@/lib/privacy";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { ResetPickerPassword } from "./reset-picker-password";
import { AddWorkerButton } from "./add-worker-button";
import { EditWorkerButton } from "./edit-worker-button";
import { ActiveSwitch } from "./active-switch";
import { ShowArchivedToggle } from "./show-archived-toggle";
import { ChevronDownIcon } from "./icons";
import { DeleteRecordButton } from "./delete-record-button";

export type WorkerRow = {
  id: number; name: string; email: string; phone: string; national_id: string | null; notes: string; role: "ADMIN" | "PICKER"; active: number;
  date_of_birth: string | null; favorite_fruit: string;
  bank_account_holder: string; bank_number: string; bank_name: string; bank_branch_number: string; bank_branch_name: string; bank_account_number: string;
};
export type WorkerShiftRow = { id: number; date: string; start_time: string; end_time: string; status: string; farm: string; crop: string; lines: Array<{ quantity: number; unit: Unit }> };
export type ShiftsByUser = Record<number, { past: WorkerShiftRow[]; future: WorkerShiftRow[] }>;

const STATUS_LABEL: Record<string, string> = { DRAFT: "טיוטה", PUBLISHED: "פורסמה", COMPLETED: "הושלמה", CANCELLED: "בוטלה" };

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function WorkersTable({ users, shiftsByUser, csrf, currentUserId }: { users: WorkerRow[]; shiftsByUser: ShiftsByUser; csrf: string; currentUserId: number }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const query = search.trim().toLowerCase();
  const visible = showArchived ? users : users.filter(row => Boolean(row.active));
  const filtered = query
    ? visible.filter(row => row.name.toLowerCase().includes(query) || row.email.toLowerCase().includes(query) || row.phone.toLowerCase().includes(query))
    : visible;

  return (
    <div className="stack">
      <div className="table-toolbar">
        <input className="input search-input" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="חיפוש לפי שם, דוא״ל או טלפון" aria-label="חיפוש עובדים" />
        <ShowArchivedToggle checked={showArchived} onChange={setShowArchived} />
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
                    <ChevronDownIcon size={28} />
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
                  <WorkerDetails csrf={csrf} worker={row} past={shifts?.past ?? []} future={shifts?.future ?? []} />
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
                          <ChevronDownIcon size={28} />
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
                        <WorkerDetails csrf={csrf} worker={row} past={shifts?.past ?? []} future={shifts?.future ?? []} />
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

function WorkerDetails({ csrf, worker, past, future }: { csrf: string; worker: WorkerRow; past: WorkerShiftRow[]; future: WorkerShiftRow[] }) {
  const { id, name, national_id: nationalId } = worker;
  const active = Boolean(worker.active);
  const hasBank = Boolean(worker.bank_number || worker.bank_account_number);
  return (
    <div className="sub-tables">
      <div className="stack">
        <h3>פרטים נוספים</h3>
        <p><strong>תעודת זהות: </strong>{nationalId ? <span dir="ltr" className="ltr-field">{maskNationalId(nationalId)}</span> : "חסרה (רשומה ותיקה)"}</p>
        <p><strong>תאריך לידה: </strong>{worker.date_of_birth ? formatHebrewDate(worker.date_of_birth) : <span className="muted">לא הוזן</span>}</p>
        <p><strong>פרי אהוב: </strong>{worker.favorite_fruit || <span className="muted">לא הוזן</span>}</p>
      </div>
      <div className="stack">
        <h3>פרטי חשבון בנק</h3>
        {hasBank ? (
          <>
            <p><strong>שם בעל החשבון: </strong>{worker.bank_account_holder}</p>
            <p><strong>בנק: </strong>{[worker.bank_number, worker.bank_name].filter(Boolean).join(" · ")}</p>
            <p><strong>סניף: </strong>{[worker.bank_branch_number, worker.bank_branch_name].filter(Boolean).join(" · ")}</p>
            <p><strong>מספר חשבון: </strong><span dir="ltr" className="ltr-field">{worker.bank_account_number}</span></p>
          </>
        ) : <p className="muted">העובד עדיין לא הזין פרטי חשבון</p>}
      </div>
      <ShiftsList title="משמרות עתידיות" rows={future} empty="אין שיבוצים עתידיים" />
      <ShiftsList title="משמרות קודמות" rows={past} empty="אין משמרות קודמות" />
      {!active && (
        <div className="actions">
          <DeleteRecordButton csrf={csrf} entity="USER" id={id} name={name} />
        </div>
      )}
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
            <thead><tr><th>תאריך</th><th>שעות</th><th>חקלאי וגידול</th><th>מצב</th><th>כמות</th></tr></thead>
            <tbody>
              {rows.map(s => (
                <tr key={s.id}>
                  <td>{formatHebrewDate(s.date)}</td>
                  <td><span dir="ltr" className="ltr-field">{s.start_time}–{s.end_time}</span></td>
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
