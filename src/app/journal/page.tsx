import { AppShell } from "@/components/nav";
import { db, requireUser } from "@/lib/server";
import { formatHebrewDateTime } from "@/lib/dates";
import { PickerService } from "@/lib/services/picker";

export const dynamic = "force-dynamic";

export default async function Journal() {
  const user = await requireUser();
  if (user.role !== "PICKER") return null;

  const entries = new PickerService(db()).journalEntries(user.id);

  return (
    <AppShell user={user}>
      <h1>יומן אישי</h1>
      <p>זה שלך אישי! בינתיים...</p>

      <div className="table-wrap card">
        <table className="table">
          <thead><tr><th>תאריך</th><th>הודעה</th></tr></thead>
          <tbody>
            {entries.map(entry => (
              <tr key={entry.id}>
                <td><span dir="ltr" className="ltr-field">{formatHebrewDateTime(entry.created_at)}</span></td>
                <td>{entry.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && <p className="muted">אין הודעות להצגה עדיין.</p>}
      </div>
    </AppShell>
  );
}
