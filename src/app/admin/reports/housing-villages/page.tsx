import { AppShell } from "@/components/nav";
import { VillageHousingReport } from "@/components/village-housing-report";
import { HousingReportPeriodControl, HousingReportTabs } from "@/components/housing-report-tabs";
import { db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";
import { getHousingNightsByVillage, getVillageHousingReport, resolveHousingReportPeriod } from "@/lib/housing-report";

export const dynamic = "force-dynamic";

const BASE = "/admin/reports/housing-villages";

export default async function VillageHousingReportPage({ searchParams }: { searchParams: Promise<{ view?: string; y?: string; m?: string }> }) {
  const user = await requireAdmin();
  const period = resolveHousingReportPeriod(await searchParams, jerusalemDate());
  const database = db();

  return (
    <AppShell user={user}>
      <h1>דוח מגורים כפרים</h1>
      <HousingReportTabs period={period} basePath={BASE} />
      <HousingReportPeriodControl period={period} basePath={BASE} />
      <VillageHousingReport key={period.label} rows={getVillageHousingReport(database, period.range)} nightsByVillage={getHousingNightsByVillage(database, period.range)} label={period.label} fileLabel={period.fileLabel} />
    </AppShell>
  );
}
