import { AppShell } from "@/components/nav";
import { HarvestReportTabs, type HarvestReportTabKey } from "@/components/harvest-report-tabs";
import { RangeTabs, RANGE_KEYS, type RangeKey } from "@/components/range-tabs";
import { FarmerPerformanceReport } from "@/components/farmer-performance-report";
import type { FarmerOption } from "@/components/farmer-picker";
import { db, requireAdmin } from "@/lib/server";
import { getShiftsByFarmer, getShiftCountsByFarmer } from "@/lib/shifts-data";
import { jerusalemDate, currentJerusalemMonth, currentJerusalemYear } from "@/lib/dates";

export const dynamic = "force-dynamic";

const VIEWS: HarvestReportTabKey[] = ["farmer", "crop", "season"];

export default async function HarvestReport({ searchParams }: { searchParams: Promise<{ view?: string; range?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const view: HarvestReportTabKey = (VIEWS as readonly string[]).includes(query.view ?? "") ? (query.view as HarvestReportTabKey) : "farmer";
  const range: RangeKey = (RANGE_KEYS as readonly string[]).includes(query.range ?? "") ? (query.range as RangeKey) : "month";
  const dateRange = range === "month" ? currentJerusalemMonth() : range === "year" ? currentJerusalemYear() : undefined;

  const database = db();
  const today = jerusalemDate();

  return (
    <AppShell user={user}>
      <h1>דוח נתוני קטיף</h1>
      <HarvestReportTabs active={view} />
      {view === "farmer" && (
        <>
          <RangeTabs active={range} basePath="/admin/reports/harvest?view=farmer" />
          <FarmerPerformanceReport
            farmers={database.prepare("SELECT id,name,phone FROM farms WHERE active=1 ORDER BY name").all() as FarmerOption[]}
            shiftsByFarmer={getShiftsByFarmer(database, today)}
            shiftCounts={getShiftCountsByFarmer(database, today, dateRange)}
          />
        </>
      )}
      {view !== "farmer" && (
        <section className="card empty-state">
          <p>הדוח בבנייה ויתווסף בקרוב.</p>
        </section>
      )}
    </AppShell>
  );
}
