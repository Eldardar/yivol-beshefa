"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { WorkerPicker, type WorkerOption } from "./worker-picker";
import { RangeTabs, type RangeKey } from "./range-tabs";
import { CalendarMonthNav } from "./calendar-month-nav";
import { formatHebrewDate, monthRange } from "@/lib/dates";
import { UNIT_LABEL, type Unit } from "@/lib/units";
import { formatMoney } from "@/lib/format";
import type { UnitRatesByField } from "./shifts-table";

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
    if (rate != null) { total += q.quantity * rate; rated = true; }
  }
  return rated ? total : null;
}

export function EmployeePerformanceReport({
  workers,
  shiftsByWorker,
  unitRatesByField,
  shiftCountsByRange,
  totalHoursByWorker,
  initialYear,
  initialMonth
}: {
  workers: WorkerOption[];
  shiftsByWorker: ShiftsByWorker;
  unitRatesByField: UnitRatesByField;
  shiftCountsByRange: Record<RangeKey, Record<number, number>>;
  totalHoursByWorker: Record<number, number>;
  initialYear: number;
  initialMonth: number;
}) {
  const [selected, setSelected] = useState<WorkerOption | null>(null);
  const [range, setRange] = useState<RangeKey>("all");
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);
  const shiftCounts = shiftCountsByRange[range];
  const allShifts = selected ? shiftsByWorker[selected.id] ?? [] : [];
  const { start: monthStart, end: monthEnd } = useMemo(() => monthRange(viewYear, viewMonth), [viewYear, viewMonth]);
  const shifts = allShifts.filter(row => row.date >= monthStart && row.date < monthEnd);
  const totalEarnings = shifts.reduce((sum, row) => sum + (shiftEarnings(row, unitRatesByField) ?? 0), 0);
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

      {!selected && <RangeTabs active={range} onChange={setRange} />}

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
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr><th>#</th><th>עובד/ת</th><th>מספר משמרות</th><th>סה&quot;כ שעות עבודה</th><th></th></tr>
            </thead>
            <tbody>
              {rankedWorkers.map((worker, i) => (
                <tr key={worker.id} className="table-row-clickable" onClick={() => selectWorker(worker)}>
                  <td>{i + 1}</td>
                  <td>{worker.name}</td>
                  <td>{shiftCounts[worker.id] ?? 0}</td>
                  <td>{(totalHoursByWorker[worker.id] ?? 0).toLocaleString("he-IL", { maximumFractionDigits: 1 })}</td>
                  <td>{worker.active ? "" : "(לא פעיל)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
                        : row.quantities.map((q, i) => (
                          <span key={q.unit}>
                            {i > 0 && " · "}
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
