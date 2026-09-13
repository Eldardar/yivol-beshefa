import { AppShell } from "@/components/nav";
import { ReportsTabs } from "@/components/reports-tabs";
import type { RangeKey } from "@/components/range-tabs";
import { EmployeePerformanceReport } from "@/components/employee-performance-report";
import type { WorkerOption } from "@/components/worker-picker";
import type { UnitRatesByField } from "@/components/shifts-table";
import { db, requireAdmin } from "@/lib/server";
import { getShiftsByWorker, getShiftCountsByWorker } from "@/lib/shifts-data";
import { jerusalemDate, currentJerusalemMonth, currentJerusalemYear } from "@/lib/dates";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function EmployeePerformance() {
  const user = await requireAdmin();
  const database = db();
  const today = jerusalemDate();

  const workers = database.prepare("SELECT id,name,phone FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as WorkerOption[];
  const shiftsByWorker = getShiftsByWorker(database, today);
  const shiftCountsByRange: Record<RangeKey, Record<number, number>> = {
    month: getShiftCountsByWorker(database, today, currentJerusalemMonth()),
    year: getShiftCountsByWorker(database, today, currentJerusalemYear()),
    all: getShiftCountsByWorker(database, today)
  };

  const rateRows = database.prepare("SELECT field_id,unit,rate_nis FROM field_unit_rates").all() as Array<{ field_id: number; unit: Unit; rate_nis: number }>;
  const unitRatesByField: UnitRatesByField = {};
  for (const r of rateRows) (unitRatesByField[r.field_id] ??= {})[r.unit] = r.rate_nis;

  return (
    <AppShell user={user}>
      <h1>דוחות</h1>
      <ReportsTabs active="employee" />
      <EmployeePerformanceReport workers={workers} shiftsByWorker={shiftsByWorker} unitRatesByField={unitRatesByField} shiftCountsByRange={shiftCountsByRange} />
    </AppShell>
  );
}
