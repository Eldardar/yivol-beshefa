import { AppShell } from "@/components/nav";
import { HousingReportTabs, HOUSING_REPORT_VIEWS, type HousingReportTabKey } from "@/components/housing-report-tabs";
import { requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function HousingReport({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const view: HousingReportTabKey = (HOUSING_REPORT_VIEWS as readonly string[]).includes(query.view ?? "") ? (query.view as HousingReportTabKey) : "all";

  return (
    <AppShell user={user}>
      <h1>דוח מגורים</h1>
      <HousingReportTabs active={view} />
      <section className="card empty-state">
        <p>הדוח בבנייה ויתווסף בקרוב.</p>
      </section>
    </AppShell>
  );
}
