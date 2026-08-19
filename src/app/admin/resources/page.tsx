import { AppShell } from "@/components/nav";
import { FarmersTable, type FarmRow, type PlantationFieldRow, type PlantationFieldsByFarm } from "@/components/farmers-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function Resources({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error } = await searchParams;
  const database = db();

  const farms = database.prepare("SELECT id,name,contact_person,phone,address,active FROM farms ORDER BY active DESC,name").all() as FarmRow[];
  const plantationFields = database.prepare("SELECT id,farm_id,name,fruit_type,fruit_subtype,size,location,details,active FROM plantation_fields ORDER BY id DESC").all() as PlantationFieldRow[];

  const plantationFieldsByFarm: PlantationFieldsByFarm = {};
  for (const field of plantationFields) (plantationFieldsByFarm[field.farm_id] ??= []).push(field);

  return (
    <AppShell user={user}>
      <h1>ניהול חקלאים</h1>
      {saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <FarmersTable farms={farms} plantationFieldsByFarm={plantationFieldsByFarm} csrf={csrf} />
      </section>
    </AppShell>
  );
}
