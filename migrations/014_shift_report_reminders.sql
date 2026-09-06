CREATE TABLE IF NOT EXISTS shift_report_reminders (
 shift_id INTEGER NOT NULL REFERENCES shifts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(shift_id,user_id)
);
