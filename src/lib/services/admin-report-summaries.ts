import type Database from "better-sqlite3";
import { pushToUsers } from "@/lib/push";
import { formatHebrewShortDate, jerusalemInstant } from "@/lib/dates";

const SUMMARY_DELAY_MS = 4 * 60 * 60 * 1000;
// Shifts that ended long before this job first ran (or while the server was down) are not summarized retroactively.
const SUMMARY_MAX_AGE_MS = 48 * 60 * 60 * 1000;

type ShiftRow = { id: number; date: string; start_time: string; end_time: string; farm: string; crop: string };

function shiftEnd(shift: ShiftRow): Date {
  const end = jerusalemInstant(shift.date, shift.end_time);
  return shift.end_time < shift.start_time ? new Date(end.getTime() + 24 * 60 * 60 * 1000) : end;
}

export async function sendAdminReportSummaries(db: Database.Database, now = new Date()): Promise<number> {
  const shifts = db.prepare(`
    SELECT s.id, s.date, s.start_time, s.end_time, f.name farm, pf.fruit_type crop
    FROM shifts s
    JOIN plantation_fields pf ON pf.id = s.plantation_field_id
    JOIN farms f ON f.id = pf.farm_id
    WHERE s.status IN ('PUBLISHED','COMPLETED')
      AND EXISTS (SELECT 1 FROM shift_pickers sp WHERE sp.shift_id = s.id)
      AND NOT EXISTS (SELECT 1 FROM shift_admin_report_summaries r WHERE r.shift_id = s.id)
  `).all() as ShiftRow[];

  const due = shifts.filter(s => {
    const elapsed = now.getTime() - shiftEnd(s).getTime();
    return elapsed >= SUMMARY_DELAY_MS && elapsed < SUMMARY_MAX_AGE_MS;
  });
  if (due.length === 0) return 0;

  const admins = db.prepare("SELECT id FROM users WHERE role='ADMIN' AND active=1").all() as Array<{ id: number }>;
  const missingFor = db.prepare(`
    SELECT u.name FROM shift_pickers sp JOIN users u ON u.id = sp.user_id
    WHERE sp.shift_id = ? AND NOT EXISTS (SELECT 1 FROM quantities q WHERE q.shift_id = sp.shift_id AND q.user_id = sp.user_id)
    ORDER BY u.name
  `);
  const insertNotification = db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
  const markSent = db.prepare("INSERT INTO shift_admin_report_summaries(shift_id) VALUES(?)");
  const pushItems: Array<{ userId: number; title: string; body: string; url?: string }> = [];
  db.transaction(() => {
    for (const s of due) {
      const missing = (missingFor.all(s.id) as Array<{ name: string }>).map(r => r.name);
      const where = `${s.farm} · ${s.crop} · ${formatHebrewShortDate(s.date)}`;
      const title = missing.length === 0 ? "כל העובדים מילאו דיווח"
        : missing.length === 1 ? "עובד אחד לא מילא דיווח"
        : `${missing.length} עובדים לא מילאו דיווח`;
      const body = missing.length === 0 ? where : `${where} · לא דיווחו: ${missing.join(", ")}`;
      for (const admin of admins) {
        insertNotification.run(admin.id, title, body);
        pushItems.push({ userId: admin.id, title, body, url: `/admin/shifts?shift=${s.id}` });
      }
      markSent.run(s.id);
    }
  })();
  await pushToUsers(db, pushItems);
  return due.length;
}
