import { AppShell } from "@/components/nav";
import { FarmersTable, type FarmRow, type PlantationFieldRow, type PlantationFieldsByFarm } from "@/components/farmers-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import type { Unit } from "@/lib/units";

export const dynamic = "force-dynamic";

export default async function Resources({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error, warning } = await searchParams;
  const database = db();

  const farms = database.prepare("SELECT id,name,contact_person,phone,address,navigation_link,notes,active FROM farms ORDER BY active DESC,name").all() as FarmRow[];
  const plantationFields = database.prepare("SELECT id,farm_id,name,fruit_type,fruit_subtype,size,location,latitude,longitude,details,active FROM plantation_fields ORDER BY id DESC").all() as Array<Omit<PlantationFieldRow, "company_rates">>;

  const companyRateRows = database.prepare("SELECT field_id,unit,rate_nis FROM field_company_rates").all() as Array<{ field_id: number; unit: Unit; rate_nis: number }>;
  const companyRatesByField: Record<number, PlantationFieldRow["company_rates"]> = {};
  for (const r of companyRateRows) (companyRatesByField[r.field_id] ??= {})[r.unit] = r.rate_nis;

  const plantationFieldsByFarm: PlantationFieldsByFarm = {};
  for (const field of plantationFields) (plantationFieldsByFarm[field.farm_id] ??= []).push({ ...field, company_rates: companyRatesByField[field.id] ?? {} });

  return (
    <AppShell user={user}>
      <h1>ניהול חקלאים</h1>
      {saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      {warning && <p className="alert" role="alert">אזהרה: {warning}</p>}
      <section className="card">
        <FarmersTable farms={farms} plantationFieldsByFarm={plantationFieldsByFarm} csrf={csrf} />
      </section>
    </AppShell>
  );
}
