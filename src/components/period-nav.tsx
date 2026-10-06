import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { CalendarMonthNav } from "./calendar-month-nav";
import { jerusalemDate } from "@/lib/dates";
import { PERIOD_VIEWS, type Period, type PeriodView, type PeriodViewOption } from "@/lib/period";

// basePath may already carry its own query (e.g. a report's sub-view), so the period goes under `param`
function withView(basePath: string, param: string, view: PeriodView): string {
  return `${basePath}${basePath.includes("?") ? "&" : "?"}${param}=${view}`;
}

// מעבר בין הלשוניות שומר את השנה/החודש/הטווח האחרונים שנבחרו
function viewHref(basePath: string, param: string, view: PeriodView, period: Period): string {
  const base = withView(basePath, param, view);
  switch (view) {
    case "year": return `${base}&y=${period.year}`;
    case "month": return `${base}&y=${period.year}&m=${period.month}`;
    case "custom": return `${base}&from=${period.from}&to=${period.to}`;
    default: return base;
  }
}

export function PeriodTabs({ period, basePath, param = "view", views = PERIOD_VIEWS, label }: { period: Period; basePath: string; param?: string; views?: PeriodViewOption[]; label: string }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {views.map(view => (
        <Link key={view.key} href={viewHref(basePath, param, view.key, period)} role="tab" aria-selected={view.key === period.view} className={`tab${view.key === period.view ? " is-active" : ""}`}>
          {view.label}
        </Link>
      ))}
    </div>
  );
}

function YearNav({ year, basePath }: { year: number; basePath: string }) {
  const todayYear = Number(jerusalemDate().slice(0, 4));
  const href = (y: number) => `${basePath}&y=${y}`;
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
// custom range is only supported with a plain basePath, since its GET form drops the action's query
export function PeriodControl({ period, basePath, param = "view" }: { period: Period; basePath: string; param?: string }) {
  switch (period.view) {
    case "year": return <YearNav year={period.year} basePath={withView(basePath, param, "year")} />;
    case "month": return <CalendarMonthNav year={period.year} month={period.month} basePath={withView(basePath, param, "month")} />;
    case "custom": return <CustomRangeForm key={`${period.from}|${period.to}`} from={period.from} to={period.to} basePath={basePath} />;
    default: return null;
  }
}
