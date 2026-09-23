-- הוספת יחידת מידה 'תרמיל(ים)' (BAG)

CREATE TABLE shift_goals_new (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','OTHER')),
 goal REAL NOT NULL CHECK(goal >= 0), actual REAL, UNIQUE(shift_id,unit)
);
INSERT INTO shift_goals_new SELECT id,shift_id,unit,goal,actual FROM shift_goals;
DROP TABLE shift_goals;
ALTER TABLE shift_goals_new RENAME TO shift_goals;

CREATE TABLE quantities_new (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 quantity REAL NOT NULL CHECK(quantity >= 0),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','OTHER')),
 updated_by INTEGER NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(shift_id,user_id,unit)
);
INSERT INTO quantities_new SELECT id,shift_id,user_id,quantity,unit,updated_by,updated_at FROM quantities;
DROP TABLE quantities;
ALTER TABLE quantities_new RENAME TO quantities;

CREATE TABLE field_unit_rates_new (
 id INTEGER PRIMARY KEY, field_id INTEGER NOT NULL REFERENCES plantation_fields(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','OTHER')),
 rate_nis REAL NOT NULL CHECK(rate_nis > 0), UNIQUE(field_id,unit)
);
INSERT INTO field_unit_rates_new SELECT id,field_id,unit,rate_nis FROM field_unit_rates;
DROP TABLE field_unit_rates;
ALTER TABLE field_unit_rates_new RENAME TO field_unit_rates;

CREATE TABLE worker_goals_new (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','OTHER')),
 goal REAL NOT NULL CHECK(goal > 0), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(shift_id,user_id,unit)
);
INSERT INTO worker_goals_new SELECT id,shift_id,user_id,unit,goal,updated_at FROM worker_goals;
DROP TABLE worker_goals;
ALTER TABLE worker_goals_new RENAME TO worker_goals;

CREATE TABLE shift_goal_units_new (
 shift_id INTEGER NOT NULL REFERENCES shifts(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','OTHER')),
 PRIMARY KEY(shift_id,unit)
);
INSERT INTO shift_goal_units_new SELECT shift_id,unit FROM shift_goal_units;
DROP TABLE shift_goal_units;
ALTER TABLE shift_goal_units_new RENAME TO shift_goal_units;
