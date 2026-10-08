import { AppShell } from "@/components/nav";
import { ReportsTabs } from "@/components/reports-tabs";
import { EmployeePerformanceReport } from "@/components/employee-performance-report";
import { PeriodControl, PeriodTabs } from "@/components/period-nav";
import type { WorkerOption } from "@/components/worker-picker";
import type { UnitRatesByField } from "@/components/shifts-table";
import { db, requireAdmin } from "@/lib/server";
import { getShiftsByWorker, getShiftCountsByWorker, getTotalHoursByWorker, getBestShiftCountsByWorker, getTopResultsByFruit } from "@/lib/shifts-data";
import { jerusalemDate } from "@/lib/dates";
import type { Unit } from "@/lib/units";
import { buildUnitPricingByField } from "@/lib/pricing";
import { PERIOD_VIEWS, resolvePeriod } from "@/lib/period";
import { getHousingReport } from "@/lib/housing-report";

export const dynamic = "force-dynamic";

const BASE = "/admin/reports/employee-performance";
const REPORT_PERIOD_VIEWS = PERIOD_VIEWS.filter(v => v.key !== "custom");

export default async function EmployeePerformance({ searchParams }: { searchParams: Promise<{ view?: string; y?: string; m?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const database = db();
  const today = jerusalemDate();

  const period = resolvePeriod(query, today, { views: REPORT_PERIOD_VIEWS });
  const range = period.range.start && period.range.end ? { start: period.range.start, end: period.range.end } : undefined;
  const periodNav = (
    <>
      <PeriodTabs period={period} basePath={BASE} views={REPORT_PERIOD_VIEWS} label="תקופת הדוח" />
      <PeriodControl period={period} basePath={BASE} />
    </>
  );

  const workers = database.prepare("SELECT id,name,phone,active,avatar_version FROM users WHERE role='PICKER' ORDER BY name").all() as WorkerOption[];
  const rateRows = database.prepare("SELECT field_id,unit,rate_nis,tiers FROM field_unit_rates").all() as Array<{ field_id: number; unit: Unit; rate_nis: number; tiers: string | null }>;
  const unitRatesByField: UnitRatesByField = buildUnitPricingByField(rateRows);

  return (
    <AppShell user={user}>
      <h1>דוחות</h1>
      <ReportsTabs active="employee" />
      <EmployeePerformanceReport
        workers={workers}
        shiftsByWorker={getShiftsByWorker(database, today)}
        unitRatesByField={unitRatesByField}
        periodNav={periodNav}
        periodLabel={period.fileLabel}
        periodRange={period.range}
        housingCostByWorker={Object.fromEntries(getHousingReport(database, period.range).map(row => [row.user_id, row.cost]))}
        rangeLabel={period.label}
        shiftCounts={getShiftCountsByWorker(database, today, range)}
        totalHoursByWorker={getTotalHoursByWorker(database, today, range)}
        bestShiftCounts={getBestShiftCountsByWorker(database, today, range)}
        fruitTopResults={getTopResultsByFruit(database, today, range)}
        initialYear={Number(today.slice(0, 4))}
        initialMonth={Number(today.slice(5, 7))}
      />
    </AppShell>
  );
}
