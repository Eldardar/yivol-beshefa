import { AppShell } from "@/components/nav";
import { ReportsTabs } from "@/components/reports-tabs";
import { RangeTabs, RANGE_KEYS, type RangeKey } from "@/components/range-tabs";
import { EmployeePerformanceReport } from "@/components/employee-performance-report";
import type { WorkerOption } from "@/components/worker-picker";
import type { UnitRatesByField } from "@/components/shifts-table";
import { db, requireAdmin } from "@/lib/server";
import { getShiftsByWorker, getShiftCountsByWorker } from "@/lib/shifts-data";
import { jerusalemDate, currentJerusalemMonth, currentJerusalemYear } from "@/lib/dates";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function EmployeePerformance({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireAdmin();
  const database = db();
  const today = jerusalemDate();

  const query = await searchParams;
  const range: RangeKey = (RANGE_KEYS as readonly string[]).includes(query.range ?? "") ? (query.range as RangeKey) : "month";
  const dateRange = range === "month" ? currentJerusalemMonth() : range === "year" ? currentJerusalemYear() : undefined;

  const workers = database.prepare("SELECT id,name,phone FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as WorkerOption[];
  const shiftsByWorker = getShiftsByWorker(database, today);
  const shiftCounts = getShiftCountsByWorker(database, today, dateRange);

  const rateRows = database.prepare("SELECT field_id,unit,rate_nis FROM field_unit_rates").all() as Array<{ field_id: number; unit: Unit; rate_nis: number }>;
  const unitRatesByField: UnitRatesByField = {};
  for (const r of rateRows) (unitRatesByField[r.field_id] ??= {})[r.unit] = r.rate_nis;

  return (
    <AppShell user={user}>
      <h1>דוחות</h1>
      <ReportsTabs active="employee" />
      <RangeTabs active={range} basePath="/admin/reports/employee-performance" />
      <EmployeePerformanceReport workers={workers} shiftsByWorker={shiftsByWorker} unitRatesByField={unitRatesByField} shiftCounts={shiftCounts} />
    </AppShell>
  );
}
