import { AppShell } from "@/components/nav";
import { VehiclesTable, type VehicleRow } from "@/components/vehicles-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Transport({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();

  const vehicles = database.prepare("SELECT id,number,name,active FROM vehicles ORDER BY active DESC,name").all() as VehicleRow[];

  return (
    <AppShell user={user}>
      <h1>ניהול תחבורה</h1>
      {saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <VehiclesTable vehicles={vehicles} csrf={csrf} />
      </section>
    </AppShell>
  );
}
