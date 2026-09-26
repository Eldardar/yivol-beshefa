import { AppShell } from "@/components/nav";
import { db, requireUser } from "@/lib/server";
import { formatHebrewDate, jerusalemDate, currentJerusalemMonth } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { WorkerEarningsChart, type EarningsPoint } from "@/components/worker-earnings-chart";

export const dynamic = "force-dynamic";

type HistoryRow = { id: number; date: string; status: string; farm: string; crop: string; start_time: string | null; end_time: string | null };

export default async function History({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;
  const { saved, error } = await searchParams;

  const rows = db()
    .prepare(
      `SELECT s.id,s.date,s.status,f.name farm,pf.fruit_type crop,sh.start_time,sh.end_time FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id JOIN plantation_fields pf ON pf.id=s.plantation_field_id JOIN farms f ON f.id=pf.farm_id
       LEFT JOIN shift_hours sh ON sh.shift_id=s.id AND sh.user_id=sp.user_id
       WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED') AND (s.date<? OR s.status='COMPLETED')
       ORDER BY s.date DESC`
    )
    .all(user.id, jerusalemDate()) as HistoryRow[];

  const today = jerusalemDate();
  const currentDay = Number(today.slice(8, 10));
  const { start: monthStart } = currentJerusalemMonth();
  const dailyEarningsRows = db()
    .prepare(
      `SELECT s.date date, SUM(q.quantity * r.rate_nis) amount FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id
       JOIN quantities q ON q.shift_id=s.id AND q.user_id=sp.user_id
       JOIN field_unit_rates r ON r.field_id=s.plantation_field_id AND r.unit=q.unit
       WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED') AND s.date>=? AND s.date<=?
       GROUP BY s.date`
    )
    .all(user.id, monthStart, today) as Array<{ date: string; amount: number }>;
  const earningsByDay = new Map(dailyEarningsRows.map(r => [Number(r.date.slice(8, 10)), r.amount]));
  const earningsPoints: EarningsPoint[] = [];
  let cumulativeEarnings = 0;
  for (let day = 1; day <= currentDay; day++) {
    cumulativeEarnings += earningsByDay.get(day) ?? 0;
    earningsPoints.push({ day, total: cumulativeEarnings, hasShift: earningsByDay.has(day) });
  }

  const pastMonthTotals = db()
    .prepare(
      `SELECT SUM(q.quantity * r.rate_nis) amount FROM shift_pickers sp
       JOIN shifts s ON s.id=sp.shift_id
       JOIN quantities q ON q.shift_id=s.id AND q.user_id=sp.user_id
       JOIN field_unit_rates r ON r.field_id=s.plantation_field_id AND r.unit=q.unit
       WHERE sp.user_id=? AND s.status IN ('PUBLISHED','COMPLETED') AND s.date<?
       GROUP BY substr(s.date,1,7)`
    )
    .all(user.id, monthStart) as Array<{ amount: number }>;
  const bestPastMonth = pastMonthTotals.reduce((max, r) => Math.max(max, r.amount), 0);
  const earningsScaleMax = Math.max(bestPastMonth, cumulativeEarnings, 1) * 1.15;

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
    const parts: Array<{ key: string; node: React.ReactNode }> = goals.map(g => ({
      key: `g-${g.unit}`,
      node: <><span dir="ltr" className="ltr-field">{byUnit.get(g.unit) ?? "—"}/{g.goal}</span> {UNIT_LABEL[g.unit]}</>
    }));
    for (const l of lines) if (!goalUnits.has(l.unit)) parts.push({ key: `q-${l.unit}`, node: <>{l.quantity} {UNIT_LABEL[l.unit]}</> });
    return parts;
  };
  const hoursText = (x: HistoryRow) => (x.start_time && x.end_time ? `${x.start_time}–${x.end_time}` : "—");

  return (
    <AppShell user={user}>
      <h1>היסטוריה וכמויות</h1>
      <WorkerEarningsChart points={earningsPoints} scaleMax={earningsScaleMax} />
      {saved && <p className="alert" role="status">הדיווח נשמר</p>}
      {error && <p className="alert" role="alert">{error}</p>}

      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>תאריך</th><th>חקלאי</th><th>גידול</th><th>שעות</th><th>כמות</th></tr></thead>
          <tbody>
            {rows.map(x => {
              const parts = quantityParts(x.id);
              return (
                <tr key={x.id}>
                  <td>{formatHebrewDate(x.date)}</td>
                  <td>{x.farm}</td>
                  <td>{x.crop}</td>
                  <td><span dir="ltr" className="ltr-field">{hoursText(x)}</span></td>
                  <td>{parts.length ? parts.map((p, i) => <span key={p.key}>{i > 0 ? " · " : ""}{p.node}</span>) : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="muted">אין היסטוריה להצגה עדיין.</p>}
      </div>
    </AppShell>
  );
}
