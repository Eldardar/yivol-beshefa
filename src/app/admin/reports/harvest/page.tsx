import { AppShell } from "@/components/nav";
import { HarvestReportTabs, type HarvestReportTabKey } from "@/components/harvest-report-tabs";
import { FarmerPerformanceReport } from "@/components/farmer-performance-report";
import type { FarmerOption } from "@/components/farmer-picker";
import { db, requireAdmin } from "@/lib/server";
import { getRecentShiftsByFarmer } from "@/lib/shifts-data";
import { jerusalemDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const VIEWS: HarvestReportTabKey[] = ["farmer", "crop", "season"];

export default async function HarvestReport({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const view: HarvestReportTabKey = (VIEWS as readonly string[]).includes(query.view ?? "") ? (query.view as HarvestReportTabKey) : "farmer";

  const database = db();

  return (
    <AppShell user={user}>
      <h1>דוח נתוני קטיף</h1>
      <HarvestReportTabs active={view} />
      {view === "farmer" && (
        <FarmerPerformanceReport
          farmers={database.prepare("SELECT id,name,phone FROM farms WHERE active=1 ORDER BY name").all() as FarmerOption[]}
          shiftsByFarmer={getRecentShiftsByFarmer(database, jerusalemDate())}
        />
      )}
      {view !== "farmer" && (
        <section className="card empty-state">
          <p>הדוח בבנייה ויתווסף בקרוב.</p>
        </section>
      )}
    </AppShell>
  );
}
