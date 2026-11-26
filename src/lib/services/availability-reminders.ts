import type Database from "better-sqlite3";
import { pushToUsers } from "@/lib/push";
import { jerusalemDate, jerusalemHour } from "@/lib/dates";

export const AVAILABILITY_REMINDER_WEEKDAY = 2; // יום שלישי
export const AVAILABILITY_REMINDER_HOUR = 16;
export const AVAILABILITY_REMINDER_DAYS = 21;

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// כל יום שלישי ב-16:00 (שעון ישראל): תזכורת לעובדים פעילים שלא סימנו זמינות לכל אחד מ-21 הימים הבאים (החל ממחר).
export async function sendAvailabilityReminders(db: Database.Database, now = new Date()): Promise<number> {
  const today = jerusalemDate(now);
  if (new Date(`${today}T12:00:00Z`).getUTCDay() !== AVAILABILITY_REMINDER_WEEKDAY) return 0;
  if (jerusalemHour(now) < AVAILABILITY_REMINDER_HOUR) return 0;
  if (db.prepare("SELECT 1 FROM availability_reminders WHERE date=?").get(today)) return 0;

  const start = addDays(today, 1);
  const end = addDays(today, 1 + AVAILABILITY_REMINDER_DAYS);
  const recipients = db.prepare(`
    SELECT u.id FROM users u
    WHERE u.active = 1 AND u.role = 'PICKER'
      AND (SELECT count(*) FROM availability a WHERE a.user_id = u.id AND a.date >= ? AND a.date < ?) < ?
    ORDER BY u.id
  `).all(start, end, AVAILABILITY_REMINDER_DAYS) as Array<{ id: number }>;

  const title = "עדכון זמינות לעבודה";
  const body = "נא לסמן זמינות לכל אחד מהימים בשלושת השבועות הקרובים";
  const insertNotification = db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
  db.transaction(() => {
    for (const r of recipients) insertNotification.run(r.id, title, body);
    db.prepare("INSERT INTO availability_reminders(date) VALUES(?)").run(today);
  })();
  await pushToUsers(db, recipients.map(r => ({ userId: r.id, title, body, url: "/availability" })));
  return recipients.length;
}
