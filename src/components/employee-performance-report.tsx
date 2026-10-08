"use client";
import { useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { WorkerPicker, type WorkerOption } from "./worker-picker";
import { CalendarMonthNav } from "./calendar-month-nav";
import { ExcelDownloadButton, ExportExcelButton } from "./export-excel-button";
import { formatHebrewDate, monthRange } from "@/lib/dates";
import { UNIT_LABEL, unitsPresent, type Unit } from "@/lib/units";
import type { XlsxCell, XlsxSheet } from "@/lib/xlsx";
import { formatMoney } from "@/lib/format";
import { unitAmount } from "@/lib/pricing";
import type { UnitRatesByField } from "./shifts-table";
import type { FruitTopResults } from "@/lib/shifts-data";
import { FruitTopResultsCards } from "./fruit-top-results";

export type EmployeeShiftRow = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  actual_start: string | null;
  actual_end: string | null;
  plantation_field_id: number;
  farm: string;
  fruit_type: string;
  leader: string;
  status: string;
  quantities: Array<{ unit: Unit; quantity: number }>;
};
export type ShiftsByWorker = Record<number, EmployeeShiftRow[]>;

function shiftEarnings(row: EmployeeShiftRow, unitRatesByField: UnitRatesByField): number | null {
  const rates = unitRatesByField[row.plantation_field_id] ?? {};
  let total = 0;
  let rated = false;
  for (const q of row.quantities) {
    const rate = rates[q.unit];
    if (rate != null) { total += unitAmount(rate, q.quantity); rated = true; }
  }
  return rated ? total : null;
}

function workerShiftsSheet(shifts: EmployeeShiftRow[], unitRatesByField: UnitRatesByField, totalEarnings: number): XlsxSheet {
  const units = unitsPresent(shifts.map(row => row.quantities));
  return {
    name: "משמרות",
    header: ["תאריך", "חקלאי", "גידול", "מוביל משמרת", "התחלה מתוכננת", "סיום מתוכנן", "התחלה בפועל", "סיום בפועל", ...units.map(u => `כמות (${UNIT_LABEL[u]})`), "הכנסה"],
    rows: shifts.map(row => {
      const earnings = shiftEarnings(row, unitRatesByField);
      return [
        { date: row.date }, row.farm, row.fruit_type, row.leader, row.start_time, row.end_time, row.actual_start, row.actual_end,
        ...units.map(u => row.quantities.find(q => q.unit === u)?.quantity),
        earnings != null ? { money: earnings } : null
      ];
    }),
    footer: ["סה\"כ הכנסה", ...Array<null>(7 + units.length).fill(null), { money: totalEarnings }]
  };
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

function hoursBetween(startTime: string | null, endTime: string | null): number | null {
  if (!startTime || !endTime) return null;
  let minutes = toMinutes(endTime) - toMinutes(startTime);
  if (minutes < 0) minutes += 24 * 60;
  return minutes / 60;
}

const roundHours = (hours: number) => Math.round(hours * 100) / 100;
const hourlyAverage = (earnings: number, hours: number): XlsxCell => (hours > 0 ? { money: earnings / hours } : null);

type WorkerTotals = { days: number; hours: number; earnings: number };

// Work days count each date once per worker: the first shift of a day gets 1, any others that day get 0.
function workerShiftLines(shifts: EmployeeShiftRow[], unitRatesByField: UnitRatesByField) {
  const totals: WorkerTotals = { days: 0, hours: 0, earnings: 0 };
  const countedDates = new Set<string>();
  const lines = shifts.map(row => {
    const earnings = shiftEarnings(row, unitRatesByField);
    const hours = hoursBetween(row.actual_start, row.actual_end);
    const workDay = countedDates.has(row.date) ? 0 : 1;
    countedDates.add(row.date);
    totals.days += workDay;
    totals.hours += hours ?? 0;
    totals.earnings += earnings ?? 0;
    return { row, earnings, hours, workDay };
  });
  return { lines, totals };
}

// One sheet with every worker's shifts, grouped by worker with a blank row between workers.
function allWorkersShiftsSheet(workerShifts: Array<{ worker: WorkerOption; shifts: EmployeeShiftRow[] }>, unitRatesByField: UnitRatesByField): XlsxSheet {
  const byName = [...workerShifts].sort((a, b) => a.worker.name.localeCompare(b.worker.name, "he"));
  const rows: XlsxCell[][] = [];
  const boldRows: number[] = [];
  const total: WorkerTotals = { days: 0, hours: 0, earnings: 0 };
  byName.forEach(({ worker, shifts }, i) => {
    if (i > 0) rows.push([]);
    const { lines, totals } = workerShiftLines(shifts, unitRatesByField);
    for (const { row, earnings, hours, workDay } of lines) {
      rows.push([
        worker.name, { date: row.date }, workDay, row.farm, row.actual_start, row.actual_end,
        hours != null ? roundHours(hours) : null,
        earnings != null ? { money: earnings } : null,
        earnings != null && hours != null ? hourlyAverage(earnings, hours) : null
      ]);
    }
    boldRows.push(rows.length);
    rows.push([`סה"כ ${worker.name}`, null, totals.days, null, null, null, roundHours(totals.hours), { money: totals.earnings }, hourlyAverage(totals.earnings, totals.hours)]);
    total.days += totals.days;
    total.hours += totals.hours;
    total.earnings += totals.earnings;
  });
  return {
    name: "דוח עבודה מפרט",
    header: ["עובד/ת", "תאריך", "כמות ימי עבודה", "חקלאי", "התחלה בפועל", "סיום בפועל", "סך כל שעות", "הכנסה", "ממוצע שעתי"],
    highlightHeader: true,
    boxed: true,
    rows,
    boldRows,
    footer: ["סה\"כ - כל העובדים", null, total.days, null, null, null, roundHours(total.hours), { money: total.earnings }, hourlyAverage(total.earnings, total.hours)]
  };
}

// One row per worker who either worked or slept in the village during the period.
function grossSummarySheet(
  workerShifts: Array<{ worker: WorkerOption; shifts: EmployeeShiftRow[] }>,
  workers: WorkerOption[],
  housingCostByWorker: Record<number, number>,
  unitRatesByField: UnitRatesByField
): XlsxSheet {
  const shiftsById = new Map(workerShifts.map(({ worker, shifts }) => [worker.id, shifts]));
  const included = workers
    .filter(worker => shiftsById.has(worker.id) || (housingCostByWorker[worker.id] ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "he"));
  const total = { days: 0, hours: 0, earnings: 0, housing: 0 };
  const rows: XlsxCell[][] = included.map(worker => {
    const { totals } = workerShiftLines(shiftsById.get(worker.id) ?? [], unitRatesByField);
    const housing = housingCostByWorker[worker.id] ?? 0;
    total.days += totals.days;
    total.hours += totals.hours;
    total.earnings += totals.earnings;
    total.housing += housing;
    return [worker.name, totals.days, roundHours(totals.hours), { money: totals.earnings }, { money: housing }, { money: 0 }];
  });
  return {
    name: "דוח מסכם ברוטו",
    header: ["עובד/ת", "כמות ימי עבודה", "סך כל שעות", "סך הכל הכנסה חקלאות", "ניכויי מגורים", "החזר נסיעות"],
    highlightHeader: true,
    boxed: true,
    rows,
    footer: ["סה\"כ - כל העובדים", total.days, roundHours(total.hours), { money: total.earnings }, { money: total.housing }, { money: 0 }]
  };
}

export function EmployeePerformanceReport({
  workers,
  shiftsByWorker,
  unitRatesByField,
  periodNav,
  periodLabel,
  periodRange,
  housingCostByWorker,
  rangeLabel,
  shiftCounts,
  totalHoursByWorker,
  bestShiftCounts,
  fruitTopResults,
  initialYear,
  initialMonth
}: {
  workers: WorkerOption[];
  shiftsByWorker: ShiftsByWorker;
  unitRatesByField: UnitRatesByField;
  // Period tabs/navigation are URL-driven (server-rendered links), so they only affect the all-workers view
  periodNav: ReactNode;
  periodLabel: string;
  // end is exclusive; a missing bound means unbounded
  periodRange: { start?: string; end?: string };
  housingCostByWorker: Record<number, number>;
  rangeLabel: string;
  shiftCounts: Record<number, number>;
  totalHoursByWorker: Record<number, number>;
  bestShiftCounts: Record<number, number>;
  fruitTopResults: FruitTopResults[];
  initialYear: number;
  initialMonth: number;
}) {
  const [selected, setSelected] = useState<WorkerOption | null>(null);
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const allShifts = selected ? shiftsByWorker[selected.id] ?? [] : [];
  const { start: monthStart, end: monthEnd } = useMemo(() => monthRange(viewYear, viewMonth), [viewYear, viewMonth]);
  const shifts = allShifts.filter(row => row.date >= monthStart && row.date < monthEnd);
  const totalEarnings = shifts.reduce((sum, row) => sum + (shiftEarnings(row, unitRatesByField) ?? 0), 0);
  const inPeriod = (row: EmployeeShiftRow) => (!periodRange.start || row.date >= periodRange.start) && (!periodRange.end || row.date < periodRange.end);
  const allWorkersPeriodShifts = selected
    ? []
    : workers
      .map(worker => ({ worker, shifts: (shiftsByWorker[worker.id] ?? []).filter(inPeriod) }))
      .filter(({ shifts }) => shifts.length > 0);
  const monthLabel = `${String(viewMonth).padStart(2, "0")}-${viewYear}`;
  const bestWorkers = workers
    .filter(worker => (bestShiftCounts[worker.id] ?? 0) > 0)
    .sort((a, b) => (bestShiftCounts[b.id] ?? 0) - (bestShiftCounts[a.id] ?? 0) || a.name.localeCompare(b.name, "he"));
  const workersById = new Map(workers.map(worker => [worker.id, worker]));
  const rankedWorkers = [...workers].sort((a, b) => (totalHoursByWorker[b.id] ?? 0) - (totalHoursByWorker[a.id] ?? 0) || a.name.localeCompare(b.name, "he"));

  function selectWorker(worker: WorkerOption | null) {
    setSelected(worker);
    setViewYear(initialYear);
    setViewMonth(initialMonth);
  }

  return (
    <div className="stack">
      <WorkerPicker workers={workers} selected={selected} onSelect={selectWorker} />

      {selected && (
        <CalendarMonthNav year={viewYear} month={viewMonth} onChange={(y, m) => { setViewYear(y); setViewMonth(m); }} />
      )}

      {!selected && periodNav}

      {!selected && rankedWorkers.length > 0 && (
        <div className="report-export">
          <ExcelDownloadButton
            fileName={`ביצועי עובדים - ${periodLabel}`}
            sheets={() => [{
              name: "ביצועי עובדים",
              header: ["#", "עובד/ת", `מספר משמרות (${periodLabel})`, `סה"כ שעות עבודה (${periodLabel})`, "סטטוס"],
              rows: rankedWorkers.map((worker, i) => [i + 1, worker.name, shiftCounts[worker.id] ?? 0, Math.round((totalHoursByWorker[worker.id] ?? 0) * 100) / 100, worker.active ? "פעיל" : "לא פעיל"])
            }]}
          />
          <ExcelDownloadButton
            label="ייצוא משמרות לאקסל - כל העובדים"
            fileName={`משמרות כל העובדים - ${periodLabel}`}
            sheets={() => [
              allWorkersShiftsSheet(allWorkersPeriodShifts, unitRatesByField),
              grossSummarySheet(allWorkersPeriodShifts, workers, housingCostByWorker, unitRatesByField)
            ]}
          />
        </div>
      )}

      {selected && shifts.length > 0 && (
        <ExportExcelButton
          fileName={`${selected.name} - ${monthLabel}`}
          sheets={() => [workerShiftsSheet(shifts, unitRatesByField, totalEarnings)]}
        />
      )}

      {!selected && rankedWorkers.length === 0 && (
        <section className="card empty-state" style={{ justifyItems: "center", textAlign: "center" }}>
          <Image
            src="/reports-placeholder.jpg"
            alt=""
            width={2316}
            height={3088}
            style={{ maxWidth: "100%", width: 240, height: "auto", borderRadius: "var(--radius-md)" }}
          />
          <p>בחר/י עובד/ת כדי לראות את המשמרות שלה/ו.</p>
        </section>
      )}

      {!selected && rankedWorkers.length > 0 && (
        <div className="report-with-aside">
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr><th>#</th><th>עובד/ת</th><th>מספר משמרות</th><th>סה&quot;כ שעות עבודה</th></tr>
              </thead>
              <tbody>
                {rankedWorkers.map((worker, i) => (
                  <tr
                    key={worker.id}
                    className={`table-row-clickable${worker.active ? "" : " row-inactive"}`}
                    title={worker.active ? undefined : "עובד/ת לא פעיל/ה"}
                    onClick={() => selectWorker(worker)}
                  >
                    <td>{i + 1}</td>
                    <td>{worker.name}</td>
                    <td>{shiftCounts[worker.id] ?? 0}</td>
                    <td>{(totalHoursByWorker[worker.id] ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 1 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* DOM order after the table puts this on the visual left in RTL */}
          <div className="report-aside">
            <FruitTopResultsCards
              fruitTopResults={fruitTopResults}
              workersById={workersById}
              rangeLabel={rangeLabel}
              showEarnings
              onSelectWorker={id => selectWorker(workersById.get(id) ?? null)}
            />

            <section className="card best-workers">
              <h2>👑 עובד/ת המשמרת</h2>
              <p className="muted">מספר המשמרות שבהן העובד/ת הרוויח/ה הכי הרבה ({rangeLabel})</p>
              {bestWorkers.length === 0 ? (
                <p className="muted">אין עדיין נתונים.</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr><th>עובד/ת</th><th>משמרות</th></tr>
                  </thead>
                  <tbody>
                    {bestWorkers.map(worker => (
                      <tr
                        key={worker.id}
                        className={`table-row-clickable${worker.active ? "" : " row-inactive"}`}
                        onClick={() => selectWorker(worker)}
                      >
                        <td>{worker.name}</td>
                        <td>{bestShiftCounts[worker.id]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}

      {selected && shifts.length === 0 && (
        <section className="card empty-state">
          <p>לא נמצאו משמרות עבור {selected.name} בחודש זה.</p>
        </section>
      )}

      {selected && shifts.length > 0 && (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th>תאריך</th><th>חקלאי וגידול</th><th>מוביל משמרת</th><th>שעות מתוכננות</th><th>שעות בפועל</th><th>כמות</th><th>הכנסה</th></tr>
            </thead>
            <tbody>
              {shifts.map(row => {
                const earnings = shiftEarnings(row, unitRatesByField);
                return (
                  <tr key={row.id}>
                    <td>{formatHebrewDate(row.date)}</td>
                    <td>{row.farm} · {row.fruit_type}</td>
                    <td>{row.leader}</td>
                    <td><span dir="ltr" className="ltr-field">{row.start_time}–{row.end_time}</span></td>
                    <td>
                      {row.actual_start && row.actual_end
                        ? <span dir="ltr" className="ltr-field">{row.actual_start}–{row.actual_end}</span>
                        : <span className="muted">טרם דווח</span>}
                    </td>
                    <td>
                      {row.quantities.length === 0
                        ? <span className="muted">טרם דווח</span>
                        : row.quantities.map(q => (
                          <span key={q.unit} className="unit-line">
                            <span dir="ltr" className="ltr-field">{q.quantity}</span> {UNIT_LABEL[q.unit]}
                          </span>
                        ))}
                    </td>
                    <td>{earnings != null ? formatMoney(earnings) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={6}>סה&quot;כ הכנסה</td>
                <td>{formatMoney(totalEarnings)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
