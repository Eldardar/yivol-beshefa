import { AppShell } from "@/components/nav";
import { HarvestReportTabs, type HarvestReportTabKey } from "@/components/harvest-report-tabs";
import type { RangeKey } from "@/components/range-tabs";
import { FarmerPerformanceReport } from "@/components/farmer-performance-report";
import type { FarmerOption } from "@/components/farmer-picker";
import { CropHarvestReport } from "@/components/crop-harvest-report";
import { db, requireAdmin } from "@/lib/server";
import { getShiftsByFarmer, getShiftCountsByFarmer, getPickedAmountsByFruitType } from "@/lib/shifts-data";
import { jerusalemDate, currentJerusalemMonth, currentJerusalemYear } from "@/lib/dates";

export const dynamic = "force-dynamic";

const VIEWS: HarvestReportTabKey[] = ["farmer", "crop", "season"];

export default async function HarvestReport({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireAdmin();
  const query = await searchParams;
  const view: HarvestReportTabKey = (VIEWS as readonly string[]).includes(query.view ?? "") ? (query.view as HarvestReportTabKey) : "farmer";

  const database = db();
  const today = jerusalemDate();

  return (
    <AppShell user={user}>
      <h1>דוח נתוני קטיף</h1>
      <HarvestReportTabs active={view} />
      {view === "farmer" && (
        <FarmerPerformanceReport
          farmers={database.prepare("SELECT id,name,phone,active FROM farms ORDER BY name").all() as FarmerOption[]}
          shiftsByFarmer={getShiftsByFarmer(database, today)}
          shiftCountsByRange={{
            month: getShiftCountsByFarmer(database, today, currentJerusalemMonth()),
            year: getShiftCountsByFarmer(database, today, currentJerusalemYear()),
            all: getShiftCountsByFarmer(database, today)
          } satisfies Record<RangeKey, Record<number, number>>}
        />
      )}
      {view === "crop" && (
        <CropHarvestReport
          fruitTypes={
            (database.prepare("SELECT DISTINCT fruit_type FROM plantation_fields ORDER BY fruit_type").all() as Array<{ fruit_type: string }>).map(
              r => r.fruit_type
            )
          }
          pickedAmountsByRange={{
            month: getPickedAmountsByFruitType(database, today, currentJerusalemMonth()),
            year: getPickedAmountsByFruitType(database, today, currentJerusalemYear()),
            all: getPickedAmountsByFruitType(database, today)
          } satisfies Record<RangeKey, ReturnType<typeof getPickedAmountsByFruitType>>}
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
