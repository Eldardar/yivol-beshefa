"use client";
import { Fragment, useState } from "react";
import { ChevronDownIcon, EyeIcon } from "./icons";
import { DeleteExpenseButton, EditExpenseButton } from "./expense-actions";
import { formatHebrewDate } from "@/lib/dates";
import { formatMoney } from "@/lib/format";
import { EXPENSE_FIELDS, EXPENSE_SOURCE_LABEL, type ExpenseFieldKey, type ExpenseRow } from "@/lib/expenses";

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
      </dl>
    </div>
  );
}

export function ExpensesTable({ csrf, rows }: { csrf: string; rows: ExpenseRow[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const total = rows.reduce((sum, row) => sum + (typeof row.total_ils === "number" ? row.total_ils : 0), 0);

  return (
    <div className="table-wrap card">
      <table className="table">
        <thead>
          <tr><th aria-hidden="true"></th><th>#</th><th>תאריך</th><th>שם הספק</th><th>מהות ההוצאה</th><th>מספר חשבונית</th><th>סכום כולל</th><th>מקור</th><th>קובץ</th><th>הערות לבדיקה</th><th>פעולות</th></tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={COLUMNS} className="muted">אין הוצאות בחודש זה</td></tr>
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
