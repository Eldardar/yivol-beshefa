import { AppShell } from "@/components/nav";
import { db, requireUser } from "@/lib/server";
import { formatHebrewShortDate, jerusalemDate } from "@/lib/dates";
import { PERIOD_VIEWS, resolvePeriod, type PeriodQuery } from "@/lib/period";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { PeriodControl, PeriodTabs } from "@/components/period-nav";
import { WorkerEarningsChart, type EarningsPoint } from "@/components/worker-earnings-chart";

export const dynamic = "force-dynamic";

const BASE = "/history";
const HISTORY_VIEWS = PERIOD_VIEWS.filter(v => v.key !== "custom");

type HistoryRow = { id: number; date: string; status: string; farm: string; crop: string; start_time: string | null; end_time: string | null };

// Gold when the worker met their goal for a unit, red when they fell short; uncolored until a quantity is entered.
function goalResultClass(goal: number, produced: number | undefined): string | undefined {
  if (goal <= 0 || produced == null) return undefined;
  return produced >= goal ? "goal-cell--met" : "goal-cell--missed";
}

export default async function History({ searchParams }: { searchParams: Promise<PeriodQuery & { saved?: string; error?: string }> }) {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;
  const query = await searchParams;
  const { saved, error } = query;
  const today = jerusalemDate();
  const period = resolvePeriod(query, today, { views: HISTORY_VIEWS, defaultView: "month" });
  const { start: rangeStart = "", end: rangeEnd = "9999-12-31" } = period.range;

  const rows = db()
    .prepare(
      `SELECT s.id,s.date,s.status,f.name farm,pf.fruit_type crop,sh.start_time,sh.end_time FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       LEFT JOIN shift_hours sh ON sh.shift_id=s.id AND sh.user_id=sp.user_id
       WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED') AND (s.date<? OR s.status='COMPLETED')
         AND s.date>=? AND s.date<?
       ORDER BY s.date DESC`
    )
    .all(user.id, today, rangeStart, rangeEnd) as HistoryRow[];

  // גרף ההכנסות המצטברות מוצג רק בתצוגה החודשית: עד היום בחודש הנוכחי, כל החודש בחודש שעבר
  let earningsChart: { points: EarningsPoint[]; scaleMax: number } | null = null;
  if (period.view === "month" && period.range.start && period.range.start <= today) {
    const monthKey = period.range.start.slice(0, 7);
    const lastDay = today.startsWith(monthKey) ? Number(today.slice(8, 10)) : new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
    const monthlyEarningsRows = db()
      .prepare(
        `SELECT s.date date, SUM(unit_amount(q.quantity, r.rate_nis, r.tiers)) amount FROM shift_pickers sp
         JOIN shifts s ON s.id=sp.shift_id
         JOIN quantities q ON q.shift_id=s.id AND q.user_id=sp.user_id
         JOIN field_unit_rates r ON r.field_id=s.plantation_field_id AND r.unit=q.unit
         WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED') AND s.date<=?
         GROUP BY s.date`
      )
      .all(user.id, today) as Array<{ date: string; amount: number }>;
    const earningsByDay = new Map(monthlyEarningsRows.filter(r => r.date.startsWith(monthKey)).map(r => [Number(r.date.slice(8, 10)), r.amount]));
    const points: EarningsPoint[] = [];
    let cumulativeEarnings = 0;
    for (let day = 1; day <= lastDay; day++) {
      cumulativeEarnings += earningsByDay.get(day) ?? 0;
      points.push({ day, total: cumulativeEarnings, hasShift: earningsByDay.has(day) });
    }
    // הסקאלה נקבעת לפי החודש הטוב ביותר, כדי שהגרף לא יחשוף סכומים מדויקים
    const monthTotals = new Map<string, number>();
    for (const r of monthlyEarningsRows) monthTotals.set(r.date.slice(0, 7), (monthTotals.get(r.date.slice(0, 7)) ?? 0) + r.amount);
    const bestMonth = Math.max(0, ...monthTotals.values());
    earningsChart = { points, scaleMax: Math.max(bestMonth, cumulativeEarnings, 1) * 1.15 };
  }

  const quantityRows = db().prepare("SELECT shift_id,quantity,unit FROM quantities WHERE user_id=?").all(user.id) as Array<{ shift_id: number; quantity: number; unit: Unit }>;
  const quantitiesByShift = new Map<number, Array<{ quantity: number; unit: Unit }>>();
  for (const q of quantityRows) {
    const arr = quantitiesByShift.get(q.shift_id) ?? [];
    arr.push({ quantity: q.quantity, unit: q.unit });
    quantitiesByShift.set(q.shift_id, arr);
  }
  const goalRows = db().prepare("SELECT shift_id,unit,goal FROM worker_goals WHERE user_id=?").all(user.id) as Array<{ shift_id: number; unit: Unit; goal: number }>;
  const goalsByShift = new Map<number, Array<{ unit: Unit; goal: number }>>();
  for (const g of goalRows) {
    const arr = goalsByShift.get(g.shift_id) ?? [];
    arr.push({ unit: g.unit, goal: g.goal });
    goalsByShift.set(g.shift_id, arr);
  }
  const quantityParts = (id: number) => {
    const lines = quantitiesByShift.get(id) ?? [];
    const goals = goalsByShift.get(id) ?? [];
    const goalUnits = new Set(goals.map(g => g.unit));
    const byUnit = new Map(lines.map(l => [l.unit, l.quantity]));
    const parts: Array<{ key: string; className?: string; node: React.ReactNode }> = goals.map(g => ({
      key: `g-${g.unit}`,
      className: goalResultClass(g.goal, byUnit.get(g.unit)),
      node: <><span dir="ltr" className="ltr-field">{byUnit.get(g.unit) ?? "—"}/{g.goal}</span> {UNIT_LABEL[g.unit]}</>
    }));
    for (const l of lines) if (!goalUnits.has(l.unit)) parts.push({ key: `q-${l.unit}`, node: <>{l.quantity} {UNIT_LABEL[l.unit]}</> });
    return parts;
  };
  const hoursText = (x: HistoryRow) => (x.start_time && x.end_time ? `${x.start_time}–${x.end_time}` : "—");

  return (
    <AppShell user={user}>
      <h1>היסטוריה וכמויות</h1>
      <PeriodTabs period={period} basePath={BASE} views={HISTORY_VIEWS} label="תקופת ההיסטוריה" />
      <div className="table-toolbar">
        <PeriodControl period={period} basePath={BASE} />
      </div>
      {earningsChart?.points.some(p => p.hasShift) && <WorkerEarningsChart points={earningsChart.points} scaleMax={earningsChart.scaleMax} />}
      {saved && <p className="alert" role="status">הדיווח נשמר</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>תאריך</th><th>חקלאי</th><th>כמות</th></tr></thead>
          <tbody>
            {rows.map(x => {
              const parts = quantityParts(x.id);
              return (
                <tr key={x.id}>
                  <td>
                    <span className="cell-main">{formatHebrewShortDate(x.date)}</span>
                    <span className="cell-sub"><span dir="ltr" className="ltr-field">{hoursText(x)}</span></span>
                  </td>
                  <td>
                    <span className="cell-main">{x.farm}</span>
                    <span className="cell-sub">{x.crop}</span>
                  </td>
                  <td>{parts.length ? parts.map((p) => <span key={p.key} className={p.className ? `unit-line ${p.className}` : "unit-line"}>{p.node}</span>) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">{period.view === "all" ? "אין היסטוריה להצגה עדיין." : `אין היסטוריה להצגה ב${period.view === "year" ? "שנת " : ""}${period.label}.`}</p>}
      </div>
    </AppShell>
  );
}
