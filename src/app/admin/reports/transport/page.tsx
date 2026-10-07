import { AppShell } from "@/components/nav";
import { VehicleTransportReport } from "@/components/vehicle-transport-report";
import type { VehicleOption } from "@/components/vehicle-picker";
import { PeriodControl, PeriodTabs } from "@/components/period-nav";
import { db, requireAdmin } from "@/lib/server";
import { getTripsByVehicle } from "@/lib/shifts-data";
import { jerusalemDate } from "@/lib/dates";
import { resolvePeriod, type PeriodQuery } from "@/lib/period";

export const dynamic = "force-dynamic";

const BASE = "/admin/reports/transport";

export default async function TransportReport({ searchParams }: { searchParams: Promise<PeriodQuery> }) {
  const user = await requireAdmin();
  const database = db();
  const today = jerusalemDate();
  const period = resolvePeriod(await searchParams, today);

  return (
    <AppShell user={user}>
      <h1>דוח תחבורה</h1>
      <VehicleTransportReport
        vehicles={database.prepare("SELECT id,number,name,active FROM vehicles ORDER BY active DESC,name").all() as VehicleOption[]}
        tripsByVehicle={getTripsByVehicle(database, today)}
        range={period.range}
        periodLabel={period.label}
        periodFileLabel={period.fileLabel}
        periodNav={
          <>
            <PeriodTabs period={period} basePath={BASE} label="תקופת הדוח" />
            <PeriodControl period={period} basePath={BASE} />
          </>
        }
      />
    </AppShell>
  );
}
