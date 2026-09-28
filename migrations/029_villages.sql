CREATE TABLE IF NOT EXISTS villages (
 id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))
);
CREATE TABLE IF NOT EXISTS village_sleeping_options (
 id INTEGER PRIMARY KEY, village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
 name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', cost_per_day REAL NOT NULL CHECK(cost_per_day >= 0)
);
CREATE INDEX IF NOT EXISTS idx_village_sleeping_options_village ON village_sleeping_options(village_id);
CREATE TABLE IF NOT EXISTS village_available_months (
 village_id INTEGER NOT NULL REFERENCES villages(id) ON DELETE CASCADE,
 month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
 PRIMARY KEY(village_id, month)
);
