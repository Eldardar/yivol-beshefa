import { AppShell } from "@/components/nav";
import { csrfValue, db, requireAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function AdminNotifications({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; sent?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error, sent } = await searchParams;
  const database = db();

  const { workerCount } = database.prepare("SELECT COUNT(*) workerCount FROM users WHERE role='PICKER' AND active=1").get() as { workerCount: number };

  return (
    <AppShell user={user}>
      <h1>שליחת התראות</h1>
      {saved && sent && <p className="alert" role="status">ההודעה נשלחה ל-{sent} עובדים</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <p className="muted">ההודעה תישלח כהתראה בתוך האפליקציה, וכהתראת דחיפה למכשירים שהפעילו זאת, לכל {workerCount} העובדים הפעילים.</p>
        <form className="stack" method="post" action="/api/actions">
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="action" value="broadcastNotification" />
          <div className="field"><label>כותרת<input className="input" name="title" required maxLength={100} /></label></div>
          <div className="field"><label>תוכן ההודעה<textarea className="input" name="body" required maxLength={1000} rows={5} /></label></div>
          <button className="btn" disabled={workerCount === 0}>שליחה לכל העובדים</button>
        </form>
      </section>
    </AppShell>
  );
}
