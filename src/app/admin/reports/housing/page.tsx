import { AppShell } from "@/components/nav";
import { HousingReport } from "@/components/housing-report";
import { HousingReportPeriodControl, HousingReportTabs } from "@/components/housing-report-tabs";
import { db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";
import { getHousingNights, getHousingReport, resolveHousingReportPeriod } from "@/lib/housing-report";

export const dynamic = "force-dynamic";

export default async function HousingReportPage({ searchParams }: { searchParams: Promise<{ view?: string; y?: string; m?: string }> }) {
  const user = await requireAdmin();
  const period = resolveHousingReportPeriod(await searchParams, jerusalemDate());
  const database = db();

  return (
    <AppShell user={user}>
      <h1>דוח מגורים</h1>
      <HousingReportTabs period={period} />
      <HousingReportPeriodControl period={period} />
      <HousingReport key={period.label} rows={getHousingReport(database, period.range)} nightsByWorker={getHousingNights(database, period.range)} label={period.label} fileLabel={period.fileLabel} />
    </AppShell>
  );
}
