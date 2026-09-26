import { AppShell } from "@/components/nav";
import { VehicleTransportReport } from "@/components/vehicle-transport-report";
import type { VehicleOption } from "@/components/vehicle-picker";
import { db, requireAdmin } from "@/lib/server";
import { getTripsByVehicle } from "@/lib/shifts-data";
import { jerusalemDate, currentJerusalemMonth, currentJerusalemYear } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function TransportReport() {
  const user = await requireAdmin();
  const database = db();

  return (
    <AppShell user={user}>
      <h1>דוח תחבורה</h1>
      <VehicleTransportReport
        vehicles={database.prepare("SELECT id,number,name,active FROM vehicles ORDER BY active DESC,name").all() as VehicleOption[]}
        tripsByVehicle={getTripsByVehicle(database, jerusalemDate())}
        ranges={{ month: currentJerusalemMonth(), year: currentJerusalemYear() }}
      />
    </AppShell>
  );
}
