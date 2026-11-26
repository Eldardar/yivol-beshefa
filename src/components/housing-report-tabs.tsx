import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";
import { CalendarMonthNav } from "./calendar-month-nav";
import { jerusalemDate } from "@/lib/dates";
import { HOUSING_REPORT_VIEWS, type HousingReportPeriod, type HousingReportView } from "@/lib/housing-report";

// מעבר בין הלשוניות שומר את השנה/החודש האחרונים שנבחרו
function viewHref(base: string, view: HousingReportView, period: HousingReportPeriod): string {
  switch (view) {
    case "yearly": return `${base}?view=yearly&y=${period.year}`;
    case "monthly": return `${base}?view=monthly&y=${period.year}&m=${period.month}`;
    default: return `${base}?view=all`;
  }
}

export function HousingReportTabs({ period, basePath }: { period: HousingReportPeriod; basePath: string }) {
  return (
    <div className="tabs" role="tablist" aria-label="תקופת הדוח">
      {HOUSING_REPORT_VIEWS.map(view => (
        <Link key={view.key} href={viewHref(basePath, view.key, period)} role="tab" aria-selected={view.key === period.view} className={`tab${view.key === period.view ? " is-active" : ""}`}>
          {view.label}
        </Link>
      ))}
    </div>
  );
}

function YearNav({ year, basePath }: { year: number; basePath: string }) {
  const todayYear = Number(jerusalemDate().slice(0, 4));
  const href = (y: number) => `${basePath}?view=yearly&y=${y}`;
  return (
    <div className="calendar-nav">
      <Link href={href(year - 1)} className="calendar-nav-arrow" aria-label="שנה קודמת"><ArrowRightIcon size={18} /></Link>
      <span className="calendar-nav-label">{year}</span>
      <Link href={href(year + 1)} className="calendar-nav-arrow" aria-label="שנה הבאה"><ArrowLeftIcon size={18} /></Link>
      {year !== todayYear && <Link href={href(todayYear)} className="calendar-nav-today">השנה</Link>}
    </div>
  );
}

// בחירת התקופה בתוך הלשונית הפעילה; ב״כל הזמנים״ אין מה לבחור
export function HousingReportPeriodControl({ period, basePath }: { period: HousingReportPeriod; basePath: string }) {
  switch (period.view) {
    case "yearly": return <YearNav year={period.year} basePath={basePath} />;
    case "monthly": return <CalendarMonthNav year={period.year} month={period.month} basePath={`${basePath}?view=monthly`} />;
    default: return null;
  }
}
