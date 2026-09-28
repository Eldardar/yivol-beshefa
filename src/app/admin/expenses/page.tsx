import { AppShell } from "@/components/nav";
import { CalendarMonthNav } from "@/components/calendar-month-nav";
import { AddExpenseButton } from "@/components/add-expense-button";
import { ExpensesExportButton } from "@/components/expenses-export-button";
import { ExpensesTable } from "@/components/expenses-table";
import { FailedExtractionsButton } from "@/components/failed-extractions-button";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { jerusalemDate } from "@/lib/dates";
import { ExpenseService } from "@/lib/services/expenses";

export const dynamic = "force-dynamic";

export default async function Expenses({ searchParams }: { searchParams: Promise<{ y?: string; m?: string; saved?: string; failed?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const query = await searchParams;

  const today = jerusalemDate();
  const todayYear = Number(today.slice(0, 4));
  const todayMonth = Number(today.slice(5, 7));
  const requestedMonth = Number(query.m);
  const year = Number.isInteger(Number(query.y)) && Number(query.y) >= 2000 && Number(query.y) <= 2100 ? Number(query.y) : todayYear;
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : todayMonth;
  const saved = Number(query.saved);
  const failedNow = Number(query.failed);

  const service = new ExpenseService(db());
  const rows = service.listForMonth(year, month);
  const failed = service.listFailed();

  return (
    <AppShell user={user}>
      <h1>הוצאות</h1>
      {saved > 0 && <p className="alert" role="status">{saved === 1 ? "ההוצאה נשמרה" : `נשמרו ${saved} הוצאות`}</p>}
      {failedNow > 0 && failed.length > 0 && <p className="alert">{failedNow === 1 ? "קובץ אחד לא חולץ במלואו ועבר" : `${failedNow} קבצים לא חולצו במלואם ועברו`} ל״נכשלו בחילוץ״ להשלמה ידנית</p>}
      <div className="table-toolbar">
        <CalendarMonthNav year={year} month={month} basePath="/admin/expenses" />
        <div className="expenses-actions">
          <FailedExtractionsButton csrf={csrf} rows={failed} />
          {rows.length > 0 && <ExpensesExportButton rows={rows} year={year} month={month} />}
          <AddExpenseButton csrf={csrf} />
        </div>
      </div>
      <ExpensesTable csrf={csrf} rows={rows} />
    </AppShell>
  );
}
