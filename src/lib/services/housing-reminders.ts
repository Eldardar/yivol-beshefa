import type Database from "better-sqlite3";
import { pushToUsers } from "@/lib/push";
import { HOUSING_EDIT_CUTOFF_HOUR, jerusalemDate, jerusalemHour } from "@/lib/dates";

export const HOUSING_REMINDER_HOUR = 16;

function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// כל יום ב-16:00 (שעון ישראל): תזכורת לעובדים שמשובצים למשמרת היום או מחר ועוד לא סימנו אם הם ישנים בכפר הלילה.
// מי שכבר סימן "ישן בכפר" או "לא" לא מקבל תזכורת; מי שסימן "אולי" כן מקבל.
// אחרי שעת הנעילה (18:00) כבר אי אפשר לעדכן את היום, ולכן לא שולחים בדיעבד אם השרת היה למטה.
export async function sendHousingStatusReminders(db: Database.Database, now = new Date()): Promise<number> {
  const hour = jerusalemHour(now);
  if (hour < HOUSING_REMINDER_HOUR || hour >= HOUSING_EDIT_CUTOFF_HOUR) return 0;
  const today = jerusalemDate(now);
  if (db.prepare("SELECT 1 FROM housing_status_reminders WHERE date=?").get(today)) return 0;

  const tomorrow = addDays(today, 1);
  const recipients = db.prepare(`
    SELECT DISTINCT u.id FROM users u
    WHERE u.active = 1
      AND EXISTS (
        SELECT 1 FROM shifts s
        WHERE s.status IN ('PUBLISHED','COMPLETED') AND s.date IN (?, ?)
          AND (s.leader_id = u.id OR EXISTS (SELECT 1 FROM shift_pickers sp WHERE sp.shift_id = s.id AND sp.user_id = u.id))
      )
      AND NOT EXISTS (
        SELECT 1 FROM housing_status h WHERE h.user_id = u.id AND h.date = ? AND h.status IN ('IN_VILLAGE','AWAY')
      )
    ORDER BY u.id
  `).all(today, tomorrow, today) as Array<{ id: number }>;

  const title = "עדכון לינה להיום";
  const body = `נא לסמן אם ישנים בכפר הלילה (עד ${HOUSING_EDIT_CUTOFF_HOUR}:00)`;
  const insertNotification = db.prepare("INSERT INTO notifications(user_id,title,body) VALUES(?,?,?)");
  db.transaction(() => {
    for (const r of recipients) insertNotification.run(r.id, title, body);
    db.prepare("INSERT INTO housing_status_reminders(date) VALUES(?)").run(today);
  })();
  await pushToUsers(db, recipients.map(r => ({ userId: r.id, title, body, url: "/housing" })));
  return recipients.length;
}
