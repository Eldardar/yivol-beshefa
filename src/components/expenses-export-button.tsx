"use client";
import { ExcelDownloadButton } from "./export-excel-button";
import { EXPENSE_FIELDS, EXPENSE_SOURCE_LABEL, type ExpenseFieldKey, type ExpenseRow } from "@/lib/expenses";
import { HEBREW_MONTHS } from "@/lib/dates";
import type { XlsxCell, XlsxSheet } from "@/lib/xlsx";

const MONEY_FIELDS = new Set<ExpenseFieldKey>(["amount_before_vat", "vat", "total_ils"]);
const SUMMED_FIELDS: ExpenseFieldKey[] = ["amount_before_vat", "vat", "total_ils"];

function cell(row: ExpenseRow, key: ExpenseFieldKey, kind: string): XlsxCell {
  const value = row[key];
  if (value == null || value === "") return null;
  if (kind === "date" && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: value };
  if (MONEY_FIELDS.has(key) && typeof value === "number") return { money: value };
  // קישור יחסי לקובץ הופך למלא, כדי שייפתח ישירות מהאקסל
  if (key === "file_link" && typeof value === "string" && value.startsWith("/")) return `${window.location.origin}${value}`;
  return value;
}

function expenseSheets(rows: ExpenseRow[], year: number, month: number): XlsxSheet[] {
  const footer: XlsxCell[] = EXPENSE_FIELDS.map((field, i) => {
    if (i === 0) return "סה״כ";
    if (!SUMMED_FIELDS.includes(field.key)) return null;
    return { money: rows.reduce((sum, row) => sum + (typeof row[field.key] === "number" ? (row[field.key] as number) : 0), 0) };
  });
  return [{
    name: `${HEBREW_MONTHS[month - 1]} ${year}`,
    header: [...EXPENSE_FIELDS.map(field => field.label), "מקור"],
    rows: rows.map(row => [...EXPENSE_FIELDS.map(field => cell(row, field.key, field.kind)), EXPENSE_SOURCE_LABEL[row.source]]),
    footer: [...footer, null],
  }];
}

export function ExpensesExportButton({ rows, year, month }: { rows: ExpenseRow[]; year: number; month: number }) {
  return <ExcelDownloadButton fileName={`הוצאות ${String(month).padStart(2, "0")}-${year}`} sheets={() => expenseSheets(rows, year, month)} small={false} />;
}
