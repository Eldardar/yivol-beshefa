import { AppShell } from "@/components/nav";
import { ShiftsTable } from "@/components/shifts-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { loadShiftsPageData } from "@/lib/shifts-data";

export const dynamic = "force-dynamic";

export default async function Shifts({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;
  const data = loadShiftsPageData(db());

  return (
    <AppShell user={user}>
      <h1>ניהול משמרות</h1>
      {query.saved && <p className="alert" role="status">הפעולה הושלמה</p>}
      {query.warning && <p className="alert" role="alert">אזהרה: {query.warning}</p>}
      {query.error && <p className="alert" role="alert">{query.error}</p>}
      <section className="card">
        <ShiftsTable {...data} csrf={csrf} />
      </section>
    </AppShell>
  );
}
