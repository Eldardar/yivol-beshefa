"use client";
import { ExcelDownloadButton } from "./export-excel-button";
import { formatHebrewDateTime } from "@/lib/dates";
import { EXPENSE_FIELDS, EXPENSE_SOURCE_LABEL, EXPENSE_TIMESTAMPS, type ExpenseFieldKey, type ExpenseRow } from "@/lib/expenses";
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

function expenseSheets(rows: ExpenseRow[], sheetName: string): XlsxSheet[] {
  const footer: XlsxCell[] = EXPENSE_FIELDS.map((field, i) => {
    if (i === 0) return "סה״כ";
    if (!SUMMED_FIELDS.includes(field.key)) return null;
    return { money: rows.reduce((sum, row) => sum + (typeof row[field.key] === "number" ? (row[field.key] as number) : 0), 0) };
  });
  return [{
    name: sheetName,
    header: [...EXPENSE_FIELDS.map(field => field.label), "מקור", ...EXPENSE_TIMESTAMPS.map(field => field.label)],
    rows: rows.map(row => [...EXPENSE_FIELDS.map(field => cell(row, field.key, field.kind)), EXPENSE_SOURCE_LABEL[row.source], ...EXPENSE_TIMESTAMPS.map(field => (row[field.key] ? formatHebrewDateTime(row[field.key] as string) : null))]),
    footer: [...footer, null, ...EXPENSE_TIMESTAMPS.map(() => null)],
  }];
}

export function ExpensesExportButton({ rows, label, fileLabel }: { rows: ExpenseRow[]; label: string; fileLabel: string }) {
  return <ExcelDownloadButton fileName={`הוצאות ${fileLabel}`} sheets={() => expenseSheets(rows, label)} small={false} />;
}
