import { HEBREW_MONTHS, monthRange, yearRange } from "@/lib/dates";

// תקופת תצוגה (כל הזמנים / שנתי / חודשי / טווח מותאם) — נגזרת מפרמטרי ה-URL
export type PeriodView = "all" | "year" | "month" | "custom";
export type PeriodViewOption = { key: PeriodView; label: string };
export const PERIOD_VIEWS: PeriodViewOption[] = [
  { key: "all", label: "כל הזמנים" },
  { key: "year", label: "שנתי" },
  { key: "month", label: "חודשי" },
  { key: "custom", label: "טווח מותאם" }
];
export type PeriodQuery = { view?: string; y?: string; m?: string; from?: string; to?: string };
export type Period = {
  view: PeriodView;
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

export function resolvePeriod(
  query: PeriodQuery,
  today: string,
  { views = PERIOD_VIEWS, defaultView = "all" }: { views?: PeriodViewOption[]; defaultView?: PeriodView } = {}
): Period {
  const view = views.some(v => v.key === query.view) ? (query.view as PeriodView) : defaultView;
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
