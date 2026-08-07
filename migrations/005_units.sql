CREATE TABLE IF NOT EXISTS shift_goals (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','TON','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','OTHER')),
 goal REAL NOT NULL CHECK(goal >= 0), UNIQUE(shift_id,unit)
);
INSERT INTO shift_goals(shift_id,unit,goal) SELECT id,'KG',goal FROM shifts;
ALTER TABLE shifts DROP COLUMN goal;

CREATE TABLE quantities_new (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 quantity REAL NOT NULL CHECK(quantity >= 0),
 unit TEXT NOT NULL CHECK(unit IN ('KG','TON','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','OTHER')),
 updated_by INTEGER NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(shift_id,user_id,unit)
);
INSERT INTO quantities_new(shift_id,user_id,quantity,unit,updated_by,updated_at)
SELECT shift_id,user_id,quantity,'KG',updated_by,updated_at FROM quantities;
DROP TABLE quantities;
ALTER TABLE quantities_new RENAME TO quantities;
