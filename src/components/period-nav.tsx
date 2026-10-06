import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { CalendarMonthNav } from "./calendar-month-nav";
import { jerusalemDate } from "@/lib/dates";
import { PERIOD_VIEWS, type Period, type PeriodView, type PeriodViewOption } from "@/lib/period";

// מעבר בין הלשוניות שומר את השנה/החודש/הטווח האחרונים שנבחרו
function viewHref(basePath: string, view: PeriodView, period: Period): string {
  switch (view) {
    case "year": return `${basePath}?view=year&y=${period.year}`;
    case "month": return `${basePath}?view=month&y=${period.year}&m=${period.month}`;
    case "custom": return `${basePath}?view=custom&from=${period.from}&to=${period.to}`;
    default: return `${basePath}?view=all`;
  }
}

export function PeriodTabs({ period, basePath, views = PERIOD_VIEWS, label }: { period: Period; basePath: string; views?: PeriodViewOption[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {views.map(view => (
        <Link key={view.key} href={viewHref(basePath, view.key, period)} role="tab" aria-selected={view.key === period.view} className={`tab${view.key === period.view ? " is-active" : ""}`}>
          {view.label}
        </Link>
      ))}
    </div>
  );
}

function YearNav({ year, basePath }: { year: number; basePath: string }) {
  const todayYear = Number(jerusalemDate().slice(0, 4));
  const href = (y: number) => `${basePath}?view=year&y=${y}`;
  return (
    <div className="calendar-nav">
      <Link href={href(year - 1)} className="calendar-nav-arrow" aria-label="שנה קודמת"><ArrowRightIcon size={18} /></Link>
      <span className="calendar-nav-label">{year}</span>
      <Link href={href(year + 1)} className="calendar-nav-arrow" aria-label="שנה הבאה"><ArrowLeftIcon size={18} /></Link>
      {year !== todayYear && <Link href={href(todayYear)} className="calendar-nav-today">השנה</Link>}
    </div>
  );
}

function CustomRangeForm({ from, to, basePath }: { from: string; to: string; basePath: string }) {
  return (
    <form method="get" action={basePath} className="expenses-range-form">
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
export function PeriodControl({ period, basePath }: { period: Period; basePath: string }) {
  switch (period.view) {
    case "year": return <YearNav year={period.year} basePath={basePath} />;
    case "month": return <CalendarMonthNav year={period.year} month={period.month} basePath={`${basePath}?view=month`} />;
    case "custom": return <CustomRangeForm key={`${period.from}|${period.to}`} from={period.from} to={period.to} basePath={basePath} />;
    default: return null;
  }
}
