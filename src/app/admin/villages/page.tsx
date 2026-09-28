import { AppShell } from "@/components/nav";
import { VillagesTable, type VillageRow } from "@/components/villages-table";
import type { EditableSleepingOption } from "@/components/village-form";
import { csrfValue, db, requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Villages({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();

  const rows = database.prepare("SELECT id,name,description,location,active FROM villages ORDER BY active DESC,name").all() as Array<Omit<VillageRow, "sleepingOptions" | "months">>;
  const options = database.prepare("SELECT id,village_id,name,description,cost_per_day FROM village_sleeping_options ORDER BY id").all() as Array<EditableSleepingOption & { village_id: number }>;
  const months = database.prepare("SELECT village_id,month FROM village_available_months ORDER BY month").all() as Array<{ village_id: number; month: number }>;

  const villages: VillageRow[] = rows.map(row => ({
    ...row,
    sleepingOptions: options.filter(o => o.village_id === row.id).map(o => ({ id: o.id, name: o.name, description: o.description, cost_per_day: o.cost_per_day })),
    months: months.filter(m => m.village_id === row.id).map(m => m.month),
  }));

  return (
    <AppShell user={user}>
      <h1>ניהול כפרים</h1>
      {saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <VillagesTable villages={villages} csrf={csrf} />
      </section>
    </AppShell>
  );
}
