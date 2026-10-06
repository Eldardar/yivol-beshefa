import { AppShell } from "@/components/nav";
import { HarvestReportTabs, type HarvestReportTabKey } from "@/components/harvest-report-tabs";
import { FarmerPerformanceReport } from "@/components/farmer-performance-report";
import type { FarmerOption } from "@/components/farmer-picker";
import { CropHarvestReport } from "@/components/crop-harvest-report";
import { PeriodControl, PeriodTabs } from "@/components/period-nav";
import { db, requireAdmin } from "@/lib/server";
import { getShiftsByFarmer, getShiftCountsByFarmer, getPickedAmountsByFruitType, getFarmerBreakdownByFruitType } from "@/lib/shifts-data";
import { jerusalemDate } from "@/lib/dates";
import { PERIOD_VIEWS, resolvePeriod } from "@/lib/period";

export const dynamic = "force-dynamic";

const VIEWS: HarvestReportTabKey[] = ["farmer", "crop", "season"];
const BASE = "/admin/reports/harvest";
const REPORT_PERIOD_VIEWS = PERIOD_VIEWS.filter(v => v.key !== "custom");

export default async function HarvestReport({ searchParams }: { searchParams: Promise<{ view?: string; range?: string; y?: string; m?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const view: HarvestReportTabKey = (VIEWS as readonly string[]).includes(query.view ?? "") ? (query.view as HarvestReportTabKey) : "farmer";

  const database = db();
  const today = jerusalemDate();

  // The period lives under `range`, since `view` already picks the report tab
  const period = resolvePeriod({ view: query.range, y: query.y, m: query.m }, today, { views: REPORT_PERIOD_VIEWS });
  const range = period.range.start && period.range.end ? { start: period.range.start, end: period.range.end } : undefined;
  const periodBase = `${BASE}?view=${view}`;
  const periodNav = (
    <>
      <PeriodTabs period={period} basePath={periodBase} param="range" views={REPORT_PERIOD_VIEWS} label="תקופת הדוח" />
      <PeriodControl period={period} basePath={periodBase} param="range" />
    </>
  );

  return (
    <AppShell user={user}>
      <h1>דוח נתוני קטיף</h1>
      <HarvestReportTabs active={view} />
      {view === "farmer" && (
        <FarmerPerformanceReport
          farmers={database.prepare("SELECT id,name,phone,active FROM farms ORDER BY name").all() as FarmerOption[]}
          shiftsByFarmer={getShiftsByFarmer(database, today)}
          periodNav={periodNav}
          periodLabel={period.fileLabel}
          shiftCounts={getShiftCountsByFarmer(database, today, range)}
        />
      )}
      {view === "crop" && (
        <CropHarvestReport
          fruitTypes={
            (database.prepare("SELECT DISTINCT fruit_type FROM plantation_fields ORDER BY fruit_type").all() as Array<{ fruit_type: string }>).map(
              r => r.fruit_type
            )
          }
          periodNav={periodNav}
          periodLabel={period.fileLabel}
          pickedAmounts={getPickedAmountsByFruitType(database, today, range)}
          farmerBreakdown={getFarmerBreakdownByFruitType(database, today, range)}
        />
      )}
      {view === "season" && (
        <section className="card empty-state">
          <p>הדוח בבנייה ויתווסף בקרוב.</p>
        </section>
      )}
    </AppShell>
  );
}
