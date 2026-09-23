CREATE TABLE IF NOT EXISTS scheduled_notifications (
 id INTEGER PRIMARY KEY, title TEXT NOT NULL, body TEXT NOT NULL, send_at TEXT NOT NULL,
 created_by INTEGER NOT NULL REFERENCES users(id), sent_at TEXT, cancelled_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS scheduled_notification_recipients (
 scheduled_notification_id INTEGER NOT NULL REFERENCES scheduled_notifications(id),
 user_id INTEGER NOT NULL REFERENCES users(id),
 PRIMARY KEY(scheduled_notification_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON scheduled_notifications(send_at) WHERE sent_at IS NULL AND cancelled_at IS NULL;
