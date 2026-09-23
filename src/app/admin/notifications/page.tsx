import { AppShell } from "@/components/nav";
import { ScheduleNotificationButton } from "@/components/schedule-notification-button";
import type { NotifiableUser } from "@/components/schedule-notification-modal";
import { AdminService } from "@/lib/services/admin";
import { csrfValue, db, requireAdmin } from "@/lib/server";
import { formatHebrewDate, formatHebrewDateTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

export default async function AdminNotifications({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string; sent?: string }> }) {
  const user = await requireAdmin();
  const csrf = await csrfValue();
  const { saved, error, sent } = await searchParams;
  const database = db();

  const { workerCount } = database.prepare("SELECT COUNT(*) workerCount FROM users WHERE role='PICKER' AND active=1").get() as { workerCount: number };
  const notifiableUsers = database.prepare("SELECT id,name,role FROM users WHERE active=1 ORDER BY name").all() as NotifiableUser[];
  const scheduledNotifications = new AdminService(database).listScheduledNotifications();
  const rows = database
    .prepare("SELECT id,title,body,read_at,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC")
    .all(user.id) as Array<{ id: number; title: string; body: string; read_at: string | null; created_at: string }>;
  const hasUnread = rows.some(x => !x.read_at);

  return (
    <AppShell user={user}>
      <h1>התראות</h1>
      {saved && sent && <p className="alert" role="status">ההודעה נשלחה ל-{sent} עובדים</p>}
      {error && <p className="alert" role="alert">{error}</p>}
      <section className="card">
        <h2>שליחת הודעה לכל העובדים</h2>
        <p className="muted">ההודעה תישלח כהתראה בתוך האפליקציה, וכהתראת דחיפה למכשירים שהפעילו זאת, לכל {workerCount} העובדים הפעילים.</p>
        <form className="stack" method="post" action="/api/actions">
          <input type="hidden" name="csrf" value={csrf} />
          <input type="hidden" name="action" value="broadcastNotification" />
          <div className="field"><label>כותרת<input className="input" name="title" required maxLength={100} /></label></div>
          <div className="field"><label>תוכן ההודעה<textarea className="input" name="body" required maxLength={1000} rows={5} /></label></div>
          <button className="btn" disabled={workerCount === 0}>שליחה לכל העובדים</button>
        </form>
      </section>

      <section className="card">
        <h2>הודעה מותאמת אישית ותזמון</h2>
        <p className="muted">בחירת נמענים ספציפיים, ואפשרות לתזמן שליחה למועד עתידי במקום שליחה מיידית.</p>
        <ScheduleNotificationButton users={notifiableUsers} csrf={csrf} />
      </section>

      {scheduledNotifications.length > 0 && (
        <section className="card">
          <h2>הודעות מתוזמנות ({scheduledNotifications.length})</h2>
          <div className="stack">
            {scheduledNotifications.map(s => (
              <article className="card" key={s.id}>
                <div className="page-header">
                  <h2>{s.title}</h2>
                  <form action="/api/actions" method="post">
                    <input type="hidden" name="action" value="cancelScheduledNotification" />
                    <input type="hidden" name="csrf" value={csrf} />
                    <input type="hidden" name="scheduledNotificationId" value={s.id} />
                    <button className="btn secondary btn-sm">ביטול</button>
                  </form>
                </div>
                <p>{s.body}</p>
                <small className="muted">{formatHebrewDate(s.sendAt.slice(0, 10))} · {s.sendAt.slice(11, 16)} · {s.recipientCount} נמענים</small>
              </article>
            ))}
          </div>
        </section>
      )}

      <div className="page-header">
        <h2>ההתראות שלי</h2>
        {hasUnread && (
          <form action="/api/actions" method="post">
            <input type="hidden" name="action" value="readAllNotifications" />
            <input type="hidden" name="csrf" value={csrf} />
            <button className="btn secondary btn-sm">סימון הכל כנקרא</button>
          </form>
        )}
      </div>
      <div className="stack">
        {rows.map(x => (
          <article className="card" key={x.id}>
            <div className="page-header">
              <h2>{x.title}</h2>
              {!x.read_at && <span className="tag info">חדש</span>}
            </div>
            <p>{x.body}</p>
            <small className="muted">{formatHebrewDateTime(x.created_at)}</small>
            {!x.read_at && (
              <form action="/api/actions" method="post">
                <input type="hidden" name="action" value="readNotification" />
                <input type="hidden" name="csrf" value={csrf} />
                <input type="hidden" name="notificationId" value={x.id} />
                <button className="btn secondary btn-sm">סימון כנקראה</button>
              </form>
            )}
          </article>
        ))}
        {!rows.length && <p className="card muted">אין התראות.</p>}
      </div>
    </AppShell>
  );
}
