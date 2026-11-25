import { DismissibleAlert } from "@/components/dismissible-alert";
import { AppShell } from "@/components/nav";
import { ShiftsTable } from "@/components/shifts-table";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { loadShiftsPageData } from "@/lib/shifts-data";

export const dynamic = "force-dynamic";

export default async function Shifts({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; warning?: string; shift?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;
  const data = loadShiftsPageData(db());
  const focusShift = Number(query.shift);

  return (
    <AppShell user={user}>
      <div className="page-head-stack">
        <h1>ניהול משמרות</h1>
        {query.saved && <DismissibleAlert variant="success" param="saved">הפעולה הושלמה</DismissibleAlert>}
        {query.warning && <DismissibleAlert variant="warning" param="warning">אזהרה: {query.warning}</DismissibleAlert>}
        {query.error && <DismissibleAlert variant="error" param="error">{query.error}</DismissibleAlert>}
      </div>
      <section className="card">
        <ShiftsTable {...data} csrf={csrf} initialExpanded={Number.isInteger(focusShift) && focusShift > 0 ? focusShift : null} />
      </section>
    </AppShell>
  );
}
