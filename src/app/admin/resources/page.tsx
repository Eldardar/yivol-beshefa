import { AppShell } from "@/components/nav";
import { FarmersTable, type FarmRow, type SeasonRow, type SeasonsByFarm } from "@/components/farmers-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function Resources({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();

  const farms = database.prepare("SELECT id,name,contact_person,phone,address,active FROM farms ORDER BY active DESC,name").all() as FarmRow[];
  const seasons = database.prepare("SELECT id,farm_id,crop,start_date,end_date,active FROM seasons ORDER BY start_date DESC").all() as SeasonRow[];

  const seasonsByFarm: SeasonsByFarm = {};
  for (const season of seasons) (seasonsByFarm[season.farm_id] ??= []).push(season);

  return (
    <AppShell user={user}>
      <h1>ניהול חקלאים</h1>
      {saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <FarmersTable farms={farms} seasonsByFarm={seasonsByFarm} csrf={csrf} today={jerusalemDate()} />
      </section>
    </AppShell>
  );
}
