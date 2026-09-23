import type Database from "better-sqlite3";
import { pushToUsers } from "@/lib/push";
import { jerusalemInstant } from "@/lib/dates";

type Due = { id: number; title: string; body: string; send_at: string };

export async function sendDueScheduledNotifications(db: Database.Database, now = new Date()): Promise<number> {
  const rows = db.prepare("SELECT id,title,body,send_at FROM scheduled_notifications WHERE sent_at IS NULL AND cancelled_at IS NULL").all() as Due[];
  const due = rows.filter(r => now.getTime() >= jerusalemInstant(r.send_at.slice(0, 10), r.send_at.slice(11, 16)).getTime());
  if (due.length === 0) return 0;

  for (const notification of due) {
    const recipients = db.prepare(`
      SELECT u.id FROM scheduled_notification_recipients r
      JOIN users u ON u.id = r.user_id
      WHERE r.scheduled_notification_id = ? AND u.active = 1
    `).all(notification.id) as Array<{ id: number }>;

    db.transaction(() => {
      const notify = db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
      for (const r of recipients) notify.run(r.id, notification.title, notification.body);
      db.prepare("UPDATE scheduled_notifications SET sent_at=CURRENT_TIMESTAMP WHERE id=?").run(notification.id);
    })();
    await pushToUsers(db, recipients.map(r => ({ userId: r.id, title: notification.title, body: notification.body })));
  }
  return due.length;
}
