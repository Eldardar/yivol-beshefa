import { AppShell } from "@/components/nav";
import { AddExpenseButton } from "@/components/add-expense-button";
import { ExpensesExportButton } from "@/components/expenses-export-button";
import { PeriodControl, PeriodTabs } from "@/components/period-nav";
import { ExpensesTable } from "@/components/expenses-table";
import { FailedExtractionsButton } from "@/components/failed-extractions-button";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";
import { resolveExpensePeriod } from "@/lib/expenses";
import { ExpenseService } from "@/lib/services/expenses";

export const dynamic = "force-dynamic";

export default async function Expenses({ searchParams }: { searchParams: Promise<{ view?: string; y?: string; m?: string; from?: string; to?: string; saved?: string; failed?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;

  const period = resolveExpensePeriod(query, jerusalemDate());
  const saved = Number(query.saved);
  const failedNow = Number(query.failed);

  const service = new ExpenseService(db());
  const rows = service.list(period.range);
  const failed = service.listFailed();

  return (
    <AppShell user={user}>
      <h1>הוצאות</h1>
      {saved > 0 && <p className="alert" role="status">{saved === 1 ? "ההוצאה נשמרה" : `נשמרו ${saved} הוצאות`}</p>}
      {failedNow > 0 && failed.length > 0 && <p className="alert">{failedNow === 1 ? "קובץ אחד לא חולץ במלואו ועבר" : `${failedNow} קבצים לא חולצו במלואם ועברו`} ל״נכשלו בחילוץ״ להשלמה ידנית</p>}
      <PeriodTabs period={period} basePath="/admin/expenses" label="תקופת ההוצאות" />
      <div className="table-toolbar">
        <PeriodControl period={period} basePath="/admin/expenses" />
        <div className="expenses-actions">
          <FailedExtractionsButton csrf={csrf} rows={failed} />
          {rows.length > 0 && <ExpensesExportButton rows={rows} label={period.label} fileLabel={period.fileLabel} />}
          <AddExpenseButton csrf={csrf} />
        </div>
      </div>
      <ExpensesTable csrf={csrf} rows={rows} />
    </AppShell>
  );
}
