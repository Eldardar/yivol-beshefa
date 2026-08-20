CREATE TABLE shifts_new (
 id INTEGER PRIMARY KEY, date TEXT NOT NULL, slot TEXT NOT NULL CHECK(slot IN ('MORNING','EVENING','PRE_DAWN')),
 plantation_field_id INTEGER NOT NULL REFERENCES plantation_fields(id), leader_id INTEGER NOT NULL REFERENCES users(id),
 notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','COMPLETED','CANCELLED')),
 created_by INTEGER NOT NULL REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO shifts_new(id,date,slot,plantation_field_id,leader_id,notes,status,created_by,created_at,updated_at)
 SELECT id,date,slot,plantation_field_id,leader_id,notes,status,created_by,created_at,updated_at FROM shifts;
DROP TABLE shifts;
ALTER TABLE shifts_new RENAME TO shifts;
CREATE INDEX IF NOT EXISTS idx_shift_slot ON shifts(date,slot);
