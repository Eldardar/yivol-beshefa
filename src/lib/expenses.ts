import { HEBREW_MONTHS, monthRange, yearRange } from "@/lib/dates";

// הגדרת שדות ההוצאה — מקור יחיד לטופס, לטבלה, לשמירה ולחילוץ האוטומטי
export type ExpenseFieldKind = "date" | "text" | "longtext" | "number";
export type ExpenseField = { key: string; label: string; kind: ExpenseFieldKind };

export const EXPENSE_FIELDS = [
  { key: "invoice_date", label: "תאריך עסקה בחשבונית", kind: "date" },
  { key: "business_type", label: "סוג העסק", kind: "text" },
  { key: "business_department", label: "מחלקה בעסק", kind: "text" },
  { key: "secondary_category", label: "קטגוריה משנית", kind: "text" },
  { key: "execution_area", label: "תחום ביצוע", kind: "text" },
  { key: "trip", label: "טיול", kind: "text" },
  { key: "supplier_name", label: "שם הספק", kind: "text" },
  { key: "invoice_number", label: "מספר חשבונית", kind: "text" },
  { key: "details", label: "פרטים מהות ההוצאה", kind: "longtext" },
  { key: "transaction_currency", label: "מטבע עסקה", kind: "text" },
  { key: "exchange_rate", label: "שער המרה לשקל בתאריך החשבונית", kind: "number" },
  { key: "amount_transaction_currency", label: "סכום במטבע עסקה", kind: "number" },
  { key: "amount_before_vat", label: "סכום לפני מע״מ בשקלים", kind: "number" },
  { key: "vat", label: "מע״מ", kind: "number" },
  { key: "total_ils", label: "סכום כולל בש״ח", kind: "number" },
  { key: "payment_currency", label: "מטבע תשלום", kind: "text" },
  { key: "payment_date", label: "תאריך תשלום", kind: "date" },
  { key: "paying_account", label: "חשבון המשלם", kind: "text" },
  { key: "payment_method", label: "אופן תשלום", kind: "text" },
  { key: "invoice_type", label: "סוג חשבונית", kind: "text" },
  { key: "tax_classification", label: "סיווג מס", kind: "text" },
  { key: "expense_type", label: "סוג הוצאה", kind: "text" },
  { key: "personal_area", label: "אזור אישי", kind: "text" },
  { key: "statement_line_date", label: "תאריך שורה באשראי או בנק", kind: "date" },
  { key: "has_local_file", label: "יש קובץ במחשב", kind: "text" },
  { key: "report_folder", label: "תיקיית דיווח", kind: "text" },
  { key: "in_ledger", label: "מופיע בכרטסת", kind: "text" },
  { key: "ledger_line", label: "שורה בכרטסת", kind: "text" },
  { key: "tax_year", label: "שנת מס", kind: "number" },
  { key: "handling_status", label: "סטטוס טיפול", kind: "text" },
  { key: "extra_details", label: "פירוט נוסף", kind: "longtext" },
  { key: "processing_date", label: "תאריך עיבוד", kind: "date" },
  { key: "new_file_name", label: "שם קובץ חדש", kind: "text" },
  { key: "file_link", label: "קישור לקובץ", kind: "text" },
  { key: "review_notes", label: "הערות לבדיקה", kind: "longtext" },
] as const satisfies readonly ExpenseField[];

export type ExpenseFieldKey = (typeof EXPENSE_FIELDS)[number]["key"];
export type ExpenseValues = Partial<Record<ExpenseFieldKey, string | number | null>>;
export type ExpenseSource = "MANUAL" | "CAMERA" | "UPLOAD";

// מועדי יצירה ועדכון — נשמרים אוטומטית ב-UTC
export const EXPENSE_TIMESTAMPS = [
  { key: "created_at", label: "מועד יצירה" },
  { key: "updated_at", label: "מועד עדכון אחרון" },
] as const;

export const EXPENSE_SOURCE_LABEL: Record<ExpenseSource, string> = { MANUAL: "ידני", CAMERA: "צילום", UPLOAD: "קובץ" };

// סוגי קבצים ש-Claude יודע לקרוא: תמונות ו-PDF
export const EXPENSE_FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"] as const;
export type ExpenseFileType = (typeof EXPENSE_FILE_TYPES)[number];
export const MAX_EXPENSE_FILE_BYTES = 20 * 1024 * 1024;

export type ExpenseRow = { id: number; source: ExpenseSource; has_file: number; file_mime: string | null; created_at: string; updated_at: string | null } & Record<ExpenseFieldKey, string | number | null>;

// שדות שהמערכת ממלאת בעצמה (עיבוד וקובץ) ואינם נערכים ידנית
export const PLATFORM_FIELDS: ReadonlySet<ExpenseFieldKey> = new Set<ExpenseFieldKey>(["processing_date", "new_file_name", "file_link"]);
export const EDITABLE_FIELDS = EXPENSE_FIELDS.filter(field => !PLATFORM_FIELDS.has(field.key));

// תקופת התצוגה בעמוד ההוצאות — נגזרת מפרמטרי ה-URL
export type ExpensePeriodView = "all" | "year" | "month" | "custom";
export const EXPENSE_PERIOD_VIEWS: { key: ExpensePeriodView; label: string }[] = [
  { key: "all", label: "כל הזמנים" },
  { key: "year", label: "שנתי" },
  { key: "month", label: "חודשי" },
  { key: "custom", label: "טווח מותאם" }
];
export type ExpensePeriod = {
  view: ExpensePeriodView;
  year: number;
  month: number;
  from: string;
  to: string;
  // end אינו כלול; טווח חסר = ללא הגבלה
  range: { start?: string; end?: string };
  label: string;
  fileLabel: string;
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(value: string | undefined): value is string {
  if (!value || !ISO_DATE.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function nextDay(iso: string): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

const dmy = (iso: string) => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;
const pad = (n: number) => String(n).padStart(2, "0");

export function resolveExpensePeriod(query: { view?: string; y?: string; m?: string; from?: string; to?: string }, today: string): ExpensePeriod {
  const view = EXPENSE_PERIOD_VIEWS.some(v => v.key === query.view) ? (query.view as ExpensePeriodView) : "all";
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const y = Number(query.y);
  const m = Number(query.m);
  const year = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : todayYear;
  const month = Number.isInteger(m) && m >= 1 && m <= 12 ? m : todayMonth;
  let from = validDate(query.from) ? query.from : `${todayYear}-${pad(todayMonth)}-01`;
  let to = validDate(query.to) ? query.to : today;
  if (from > to) [from, to] = [to, from];

  const base = { view, year, month, from, to };
  switch (view) {
    case "year":
      return { ...base, range: yearRange(year), label: String(year), fileLabel: String(year) };
    case "month":
      return { ...base, range: monthRange(year, month), label: `${HEBREW_MONTHS[month - 1]} ${year}`, fileLabel: `${pad(month)}-${year}` };
    case "custom":
      return { ...base, range: { start: from, end: nextDay(to) }, label: `${dmy(from)} עד ${dmy(to)}`, fileLabel: `${dmy(from)} עד ${dmy(to)}` };
    default:
      return { ...base, range: {}, label: "כל הזמנים", fileLabel: "כל הזמנים" };
  }
}
