import { AppShell } from "@/components/nav";
import { ReportsTabs } from "@/components/reports-tabs";
import { EmployeePerformanceReport } from "@/components/employee-performance-report";
import type { WorkerOption } from "@/components/worker-picker";
import type { UnitRatesByField } from "@/components/shifts-table";
import { db, requireAdmin } from "@/lib/server";
import { getRecentShiftsByWorker } from "@/lib/shifts-data";
import { jerusalemDate } from "@/lib/dates";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function EmployeePerformance() {
  const user = await requireAdmin();
  const database = db();

  const workers = database.prepare("SELECT id,name,phone FROM users WHERE role='PICKER' AND active=1 ORDER BY name").all() as WorkerOption[];
  const shiftsByWorker = getRecentShiftsByWorker(database, jerusalemDate());

  const rateRows = database.prepare("SELECT field_id,unit,rate_nis FROM field_unit_rates").all() as Array<{ field_id: number; unit: Unit; rate_nis: number }>;
  const unitRatesByField: UnitRatesByField = {};
  for (const r of rateRows) (unitRatesByField[r.field_id] ??= {})[r.unit] = r.rate_nis;

  return (
    <AppShell user={user}>
      <h1>דוחות</h1>
      <ReportsTabs active="employee" />
      <h2>ביצועי עובדים · 7 המשמרות האחרונות</h2>
      <EmployeePerformanceReport workers={workers} shiftsByWorker={shiftsByWorker} unitRatesByField={unitRatesByField} />
    </AppShell>
  );
}
