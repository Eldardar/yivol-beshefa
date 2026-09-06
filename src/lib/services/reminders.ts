import type Database from "better-sqlite3";
import { pushToUsers } from "@/lib/push";
import { jerusalemInstant } from "@/lib/dates";

const REMINDER_DELAY_MS = 2 * 60 * 60 * 1000;

type Candidate = { shift_id: number; user_id: number; date: string; end_time: string; farm: string; crop: string };

export async function sendMissingReportReminders(db: Database.Database, now = new Date()): Promise<number> {
  const rows = db.prepare(`
    SELECT s.id shift_id, sp.user_id, s.date, s.end_time, f.name farm, pf.fruit_type crop
    FROM shift_pickers sp
    JOIN shifts s ON s.id = sp.shift_id
    JOIN plantation_fields pf ON pf.id = s.plantation_field_id
    JOIN farms f ON f.id = pf.farm_id
    WHERE s.status = 'PUBLISHED'
      AND NOT EXISTS (SELECT 1 FROM quantities q WHERE q.shift_id = s.id AND q.user_id = sp.user_id)
      AND NOT EXISTS (SELECT 1 FROM shift_report_reminders r WHERE r.shift_id = s.id AND r.user_id = sp.user_id)
  `).all() as Candidate[];

  const due = rows.filter(r => now.getTime() - jerusalemInstant(r.date, r.end_time).getTime() >= REMINDER_DELAY_MS);
  if (due.length === 0) return 0;

  const insertNotification = db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
  const markSent = db.prepare("INSERT INTO shift_report_reminders(shift_id,user_id) VALUES(?,?)");
  const pushItems: Array<{ userId: number; title: string; body: string; url?: string }> = [];
  db.transaction(() => {
    for (const r of due) {
      const title = "טרם דיווחת תוצאות משמרת";
      const body = `${r.farm} · ${r.crop}`;
      insertNotification.run(r.user_id, title, body);
      markSent.run(r.shift_id, r.user_id);
      pushItems.push({ userId: r.user_id, title, body, url: `/report/${r.shift_id}` });
    }
  })();
  await pushToUsers(db, pushItems);
  return due.length;
}
