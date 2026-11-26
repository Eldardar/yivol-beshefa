-- יום שבו כבר נשלחה תזכורת יומית (16:00) למילוי סטטוס לינה, כדי שהבדיקה התקופתית לא תשלח פעמיים.
CREATE TABLE IF NOT EXISTS housing_status_reminders (
 date TEXT PRIMARY KEY,
 sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
