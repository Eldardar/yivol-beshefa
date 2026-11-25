-- מוביל משמרת אופציונלי: leader_id יכול להיות NULL ("ללא")
CREATE TABLE shifts_new (
 id INTEGER PRIMARY KEY, date TEXT NOT NULL,
 start_time TEXT NOT NULL CHECK(start_time GLOB '[0-2][0-9]:[0-5][0-9]'),
 end_time TEXT NOT NULL CHECK(end_time GLOB '[0-2][0-9]:[0-5][0-9]'),
 plantation_field_id INTEGER NOT NULL REFERENCES plantation_fields(id), leader_id INTEGER REFERENCES users(id),
 notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','COMPLETED','CANCELLED')),
 team_leader_details TEXT NOT NULL DEFAULT '',
 created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO shifts_new SELECT id,date,start_time,end_time,plantation_field_id,leader_id,notes,status,team_leader_details,created_by,created_at,updated_at FROM shifts;
DROP TABLE shifts;
ALTER TABLE shifts_new RENAME TO shifts;
CREATE INDEX IF NOT EXISTS idx_shift_date_start ON shifts(date,start_time);
