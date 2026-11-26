-- יום שלישי שבו כבר נשלחה התזכורת השבועית (16:00) למילוי זמינות לשלושת השבועות הבאים, כדי שהבדיקה התקופתית לא תשלח פעמיים.
CREATE TABLE IF NOT EXISTS availability_reminders (
 date TEXT PRIMARY KEY,
 sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
