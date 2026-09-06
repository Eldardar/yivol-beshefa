import { AppShell } from "@/components/nav";
import { ReportsTabs } from "@/components/reports-tabs";
import { ShiftsTable } from "@/components/shifts-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { loadShiftsPageData } from "@/lib/shifts-data";
import { formatHebrewDate, jerusalemDate, currentJerusalemWeek, currentJerusalemMonth } from "@/lib/dates";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const PERIODS = ["daily", "weekly", "monthly"] as const;
type Period = (typeof PERIODS)[number];

const WORKED_SUFFIX: Record<Period, string> = { daily: "היום", weekly: "השבוע", monthly: "החודש" };
const monthYearFormatter = new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", month: "long", year: "numeric" });

function periodRange(period: Period, today: string): { start: string; end: string } {
  if (period === "weekly") return currentJerusalemWeek();
  if (period === "monthly") return currentJerusalemMonth();
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  return { start: today, end: new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10) };
}

function periodTitle(period: Period, range: { start: string; end: string }, today: string): string {
  if (period === "monthly") return `דוח חודשי · ${monthYearFormatter.format(new Date(`${range.start}T12:00:00Z`))}`;
  if (period === "weekly") {
    const lastDay = new Date(`${range.end}T12:00:00Z`);
    lastDay.setUTCDate(lastDay.getUTCDate() - 1);
    return `דוח שבועי · ${formatHebrewDate(range.start)} – ${formatHebrewDate(lastDay.toISOString().slice(0, 10))}`;
  }
  return `דוח יומי · ${formatHebrewDate(today)}`;
}

export default async function Reports({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const database = db();
  const today = jerusalemDate();

  const requested = (await searchParams).period;
  const period: Period = (PERIODS as readonly string[]).includes(requested ?? "") ? (requested as Period) : "daily";
  const range = periodRange(period, today);

  const data = loadShiftsPageData(database, { dateFrom: range.start, dateTo: range.end });

  const { workerCount } = database
    .prepare("SELECT COUNT(DISTINCT sp.user_id) workerCount FROM shift_pickers sp JOIN shifts s ON s.id=sp.shift_id WHERE s.date>=? AND s.date<?")
    .get(range.start, range.end) as { workerCount: number };

  const { total } = database
    .prepare(
      `SELECT COALESCE(SUM(q.quantity*r.rate_nis),0) total
       FROM quantities q JOIN shifts s ON s.id=q.shift_id
       JOIN field_unit_rates r ON r.field_id=s.plantation_field_id AND r.unit=q.unit
       WHERE s.date>=? AND s.date<?`
    )
    .get(range.start, range.end) as { total: number };

  return (
    <AppShell user={user}>
      <h1>דוחות</h1>
      <ReportsTabs active={period} />
      <h2>{periodTitle(period, range, today)}</h2>
      <div className="kpi-grid">
        <article className="kpi-card">
          <span className="kpi-label">קוטפים שעבדו {WORKED_SUFFIX[period]}</span>
          <div className="metric">{workerCount}</div>
        </article>
        <article className="kpi-card">
          <span className="kpi-label">סה&quot;כ הכנסה</span>
          <div className="metric">{formatMoney(total)}</div>
        </article>
      </div>
      <section className="card">
        <ShiftsTable {...data} csrf={csrf} />
      </section>
    </AppShell>
  );
}
