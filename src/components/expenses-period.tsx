import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { CalendarMonthNav } from "./calendar-month-nav";
import { jerusalemDate } from "@/lib/dates";
import { EXPENSE_PERIOD_VIEWS, type ExpensePeriod, type ExpensePeriodView } from "@/lib/expenses";

const BASE = "/admin/expenses";

// מעבר בין הלשוניות שומר את השנה/החודש/הטווח האחרונים שנבחרו
function viewHref(view: ExpensePeriodView, period: ExpensePeriod): string {
  switch (view) {
    case "year": return `${BASE}?view=year&y=${period.year}`;
    case "month": return `${BASE}?view=month&y=${period.year}&m=${period.month}`;
    case "custom": return `${BASE}?view=custom&from=${period.from}&to=${period.to}`;
    default: return BASE;
  }
}

export function ExpensesPeriodTabs({ period }: { period: ExpensePeriod }) {
  return (
    <div className="tabs" role="tablist" aria-label="תקופת ההוצאות">
      {EXPENSE_PERIOD_VIEWS.map(view => (
        <Link key={view.key} href={viewHref(view.key, period)} role="tab" aria-selected={view.key === period.view} className={`tab${view.key === period.view ? " is-active" : ""}`}>
          {view.label}
        </Link>
      ))}
    </div>
  );
}

function YearNav({ year }: { year: number }) {
  const todayYear = Number(jerusalemDate().slice(0, 4));
  const href = (y: number) => `${BASE}?view=year&y=${y}`;
  return (
    <div className="calendar-nav">
      <Link href={href(year - 1)} className="calendar-nav-arrow" aria-label="שנה קודמת"><ArrowRightIcon size={18} /></Link>
      <span className="calendar-nav-label">{year}</span>
      <Link href={href(year + 1)} className="calendar-nav-arrow" aria-label="שנה הבאה"><ArrowLeftIcon size={18} /></Link>
      {year !== todayYear && <Link href={href(todayYear)} className="calendar-nav-today">השנה</Link>}
    </div>
  );
}

function CustomRangeForm({ from, to }: { from: string; to: string }) {
  return (
    <form method="get" action={BASE} className="expenses-range-form">
      <input type="hidden" name="view" value="custom" />
      <label className="field">
        <span>מתאריך</span>
        <input className="input" type="date" name="from" defaultValue={from} required />
      </label>
      <label className="field">
        <span>עד תאריך</span>
        <input className="input" type="date" name="to" defaultValue={to} required />
      </label>
      <button type="submit" className="btn secondary">הצגה</button>
    </form>
  );
}

// בחירת התקופה בתוך הלשונית הפעילה; ב״כל הזמנים״ אין מה לבחור
export function ExpensesPeriodControl({ period }: { period: ExpensePeriod }) {
  switch (period.view) {
    case "year": return <YearNav year={period.year} />;
    case "month": return <CalendarMonthNav year={period.year} month={period.month} basePath={`${BASE}?view=month`} />;
    case "custom": return <CustomRangeForm key={`${period.from}|${period.to}`} from={period.from} to={period.to} />;
    default: return null;
  }
}
