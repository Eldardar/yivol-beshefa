-- אירועים שמנהל יוצר בלוח החודשי; אירוע שאינו מפורסם גלוי ליוצרו בלבד, אירוע מפורסם גלוי לכל העובדים (ובפרט לכל המנהלים)
CREATE TABLE admin_events (
 id INTEGER PRIMARY KEY,
 created_by INTEGER NOT NULL REFERENCES users(id),
 name TEXT NOT NULL,
 start_date TEXT NOT NULL CHECK(start_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
 end_date TEXT NOT NULL CHECK(end_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]' AND end_date >= start_date),
 is_published INTEGER NOT NULL DEFAULT 0 CHECK(is_published IN (0,1)),
 details TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX admin_events_dates ON admin_events(start_date,end_date);
