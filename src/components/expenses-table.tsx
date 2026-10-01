"use client";
import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, ChevronDownIcon, EyeIcon, XIcon } from "./icons";
import { DeleteExpenseButton, EditExpenseButton } from "./expense-actions";
import { formatHebrewDate, formatHebrewDateTime } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { EDITABLE_FIELDS, EXPENSE_FIELDS, EXPENSE_SOURCE_LABEL, EXPENSE_TIMESTAMPS, type ExpenseFieldKey, type ExpenseRow } from "@/lib/expenses";

const MONEY_FIELDS = new Set<ExpenseFieldKey>(["amount_before_vat", "vat", "total_ils"]);
// הקישור והשם של הקובץ מוצגים ככפתור צפייה, לא כטקסט
const HIDDEN_DETAIL_FIELDS = new Set<ExpenseFieldKey>(["file_link"]);
const COLUMNS = 11;

function display(row: ExpenseRow, key: ExpenseFieldKey, kind: string): string {
  const value = row[key];
  if (value == null || value === "") return "—";
  if (kind === "date" && typeof value === "string") return formatHebrewDate(value);
  if (MONEY_FIELDS.has(key) && typeof value === "number") return formatMoney(value);
  return String(value);
}

function timestamp(row: ExpenseRow, key: (typeof EXPENSE_TIMESTAMPS)[number]["key"]): string {
  const value = row[key];
  return value ? formatHebrewDateTime(value) : "—";
}

function FileLink({ row }: { row: ExpenseRow }) {
  if (!row.has_file) return <span className="muted">—</span>;
  return (
    <a className="icon-btn" href={`/api/admin/expenses/${row.id}/file`} target="_blank" rel="noopener" aria-label="צפייה בקובץ" title="צפייה בקובץ">
      <EyeIcon size={20} />
    </a>
  );
}

function ExpenseDetails({ row }: { row: ExpenseRow }) {
  return (
    <div className="expense-details">
      <dl className="expense-details-grid">
        {EXPENSE_FIELDS.filter(field => !HIDDEN_DETAIL_FIELDS.has(field.key)).map(field => (
          <div key={field.key} className={field.kind === "longtext" ? "expense-detail--wide" : undefined}>
            <dt>{field.label}</dt>
            <dd className={row[field.key] == null || row[field.key] === "" ? "muted" : undefined}>{display(row, field.key, field.kind)}</dd>
          </div>
        ))}
        <div>
          <dt>מקור</dt>
          <dd>{EXPENSE_SOURCE_LABEL[row.source]}</dd>
        </div>
        <div>
          <dt>קובץ</dt>
          <dd><FileLink row={row} /></dd>
        </div>
        {EXPENSE_TIMESTAMPS.map(field => (
          <div key={field.key}>
            <dt>{field.label}</dt>
            <dd className={row[field.key] ? undefined : "muted"}>{timestamp(row, field.key)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

type ExpensesView = "compact" | "full";
const VIEWS: { key: ExpensesView; label: string }[] = [
  { key: "compact", label: "תצוגה מקוצרת" },
  { key: "full", label: "טבלה מלאה" }
];
const FULL_FIELDS = EXPENSE_FIELDS.filter(field => !HIDDEN_DETAIL_FIELDS.has(field.key));
const TOTAL_INDEX = FULL_FIELDS.findIndex(field => field.key === "total_ils");

function sumTotal(rows: ExpenseRow[]) {
  return rows.reduce((sum, row) => sum + (typeof row.total_ils === "number" ? row.total_ils : 0), 0);
}

function ViewToggle({ active, onChange }: { active: ExpensesView; onChange: (view: ExpensesView) => void }) {
  return (
    <div className="view-toggle" role="radiogroup" aria-label="תצוגת הטבלה">
      {VIEWS.map(view => (
        <button key={view.key} type="button" role="radio" aria-checked={view.key === active} className={`view-toggle-option${view.key === active ? " is-active" : ""}`} onClick={() => onChange(view.key)}>
          {view.label}
        </button>
      ))}
    </div>
  );
}

export function ExpensesTable({ csrf, rows }: { csrf: string; rows: ExpenseRow[] }) {
  const [view, setView] = useState<ExpensesView>("compact");

  return (
    <div className="expenses-table">
      <ViewToggle active={view} onChange={setView} />
      {view === "full" ? <FullExpensesTable csrf={csrf} rows={rows} /> : <CompactExpensesTable csrf={csrf} rows={rows} />}
    </div>
  );
}

const EDITABLE_KEYS = new Set<ExpenseFieldKey>(EDITABLE_FIELDS.map(field => field.key));
type ExpenseField = (typeof EXPENSE_FIELDS)[number];
type EditingCell = { id: number; key: ExpenseFieldKey };

// עריכה בתוך התא: שומרת את כל השדות הניתנים לעריכה של השורה, כשרק השדה הזה שונה
function EditableCell({ csrf, row, field, onDone }: { csrf: string; row: ExpenseRow; field: ExpenseField; onDone: () => void }) {
  const router = useRouter();
  const initial = row[field.key] == null ? "" : String(row[field.key]);
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (value === initial) return onDone();
    if (field.key === "invoice_date" && !value) return setError("חובה למלא תאריך");
    setSaving(true);
    setError("");
    const values = Object.fromEntries(EDITABLE_FIELDS.map(f => [f.key, f.key === field.key ? value : row[f.key] == null ? "" : String(row[f.key])]));
    try {
      const res = await fetch("/api/admin/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csrf, id: row.id, values }) });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "השמירה נכשלה");
      onDone();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "השמירה נכשלה");
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onDone();
    // בשדה טקסט ארוך Enter יורד שורה, ושמירה היא Ctrl/⌘+Enter
    if (e.key === "Enter" && (field.kind !== "longtext" || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      save();
    }
  }

  const common = { className: "input", value, autoFocus: true, disabled: saving, "aria-label": field.label, onKeyDown, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValue(e.target.value) };
  return (
    <div className="cell-editor">
      <div className="cell-editor-row">
        {field.kind === "longtext" ? (
          <textarea {...common} rows={3} maxLength={5000} />
        ) : (
          <input {...common} type={field.kind === "date" ? "date" : field.kind === "number" ? "number" : "text"} step={field.kind === "number" ? "any" : undefined} maxLength={field.kind === "text" ? 500 : undefined} />
        )}
        <button type="button" className="icon-btn cell-editor-save" aria-label="אישור" title="אישור" disabled={saving} onClick={save}><CheckIcon size={18} /></button>
        <button type="button" className="icon-btn cell-editor-cancel" aria-label="ביטול" title="ביטול" disabled={saving} onClick={onDone}><XIcon size={18} /></button>
      </div>
      {error && <p className="cell-editor-error" role="alert">{error}</p>}
    </div>
  );
}

function FullExpensesTable({ csrf, rows }: { csrf: string; rows: ExpenseRow[] }) {
  const columns = FULL_FIELDS.length + EXPENSE_TIMESTAMPS.length + 5;
  const [editing, setEditing] = useState<EditingCell | null>(null);
  return (
    <div className="table-wrap card expenses-full-wrap">
      <table className="table expenses-full-table">
        <thead>
          <tr>
            <th>#</th>
            {FULL_FIELDS.map(field => <th key={field.key}>{field.label}</th>)}
            <th>מקור</th><th>קובץ</th>
            {EXPENSE_TIMESTAMPS.map(field => <th key={field.key}>{field.label}</th>)}
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={columns} className="muted">אין הוצאות בתקופה זו</td></tr>
          )}
          {rows.map((row, i) => (
            <tr key={row.id}>
              <td>{i + 1}</td>
              {FULL_FIELDS.map(field => {
                const editable = EDITABLE_KEYS.has(field.key);
                if (editing?.id === row.id && editing.key === field.key) {
                  return <td key={field.key} className="expenses-cell--editing"><EditableCell csrf={csrf} row={row} field={field} onDone={() => setEditing(null)} /></td>;
                }
                const empty = row[field.key] == null || row[field.key] === "";
                const className = [field.kind === "longtext" ? "expenses-cell--long" : "", editable ? "expenses-cell--editable" : "", empty ? "muted" : ""].filter(Boolean).join(" ") || undefined;
                return (
                  <td key={field.key} className={className} title={editable ? "לחיצה כפולה לעריכה" : undefined} onDoubleClick={editable ? () => setEditing({ id: row.id, key: field.key }) : undefined}>
                    {display(row, field.key, field.kind)}
                  </td>
                );
              })}
              <td>{EXPENSE_SOURCE_LABEL[row.source]}</td>
              <td><FileLink row={row} /></td>
              {EXPENSE_TIMESTAMPS.map(field => <td key={field.key} className={row[field.key] ? undefined : "muted"}>{timestamp(row, field.key)}</td>)}
              <td>
                <div className="actions-cell expense-row-actions">
                  <EditExpenseButton csrf={csrf} row={row} />
                  <DeleteExpenseButton csrf={csrf} row={row} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr><td colSpan={TOTAL_INDEX + 1}>סה״כ</td><td>{formatMoney(sumTotal(rows))}</td><td colSpan={columns - TOTAL_INDEX - 2} /></tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function CompactExpensesTable({ csrf, rows }: { csrf: string; rows: ExpenseRow[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const total = sumTotal(rows);

  return (
    <div className="table-wrap card">
      <table className="table">
        <thead>
          <tr><th aria-hidden="true"></th><th>#</th><th>תאריך</th><th>שם הספק</th><th>מהות ההוצאה</th><th>מספר חשבונית</th><th>סכום כולל</th><th>מקור</th><th>קובץ</th><th>הערות לבדיקה</th><th>פעולות</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={COLUMNS} className="muted">אין הוצאות בתקופה זו</td></tr>
          )}
          {rows.map((row, i) => {
            const isOpen = expanded === row.id;
            return (
              <Fragment key={row.id}>
                <tr>
                  <td>
                    <button type="button" className={`expand-btn${isOpen ? " is-open" : ""}`} aria-expanded={isOpen} aria-label={isOpen ? "סגירת פרטי הוצאה" : "פתיחת פרטי הוצאה"} onClick={() => setExpanded(isOpen ? null : row.id)}>
                      <ChevronDownIcon size={28} />
                    </button>
                  </td>
                  <td>{i + 1}</td>
                  <td>{display(row, "invoice_date", "date")}</td>
                  <td>{display(row, "supplier_name", "text")}</td>
                  <td>{display(row, "details", "text")}</td>
                  <td>{display(row, "invoice_number", "text")}</td>
                  <td>{display(row, "total_ils", "number")}</td>
                  <td>{EXPENSE_SOURCE_LABEL[row.source]}</td>
                  <td><FileLink row={row} /></td>
                  <td>{row.review_notes ? <span className="expense-notes">{row.review_notes}</span> : ""}</td>
                  <td>
                    <div className="actions-cell expense-row-actions">
                      <EditExpenseButton csrf={csrf} row={row} />
                      <DeleteExpenseButton csrf={csrf} row={row} onDeleted={() => setExpanded(null)} />
                    </div>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="worker-expand-row">
                    <td colSpan={COLUMNS}><ExpenseDetails row={row} /></td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr><td colSpan={6}>סה״כ</td><td>{formatMoney(total)}</td><td colSpan={4} /></tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
