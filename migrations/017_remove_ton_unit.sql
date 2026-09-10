-- ביטול יחידת 'טון': כל הכמויות/יעדים/תעריפים הקיימים בטון מומרים לק"ג (1 טון = 1000 ק"ג)

UPDATE shift_goals
SET goal = goal + (SELECT t.goal * 1000 FROM shift_goals t WHERE t.shift_id = shift_goals.shift_id AND t.unit = 'TON')
WHERE unit = 'KG' AND EXISTS (SELECT 1 FROM shift_goals t WHERE t.shift_id = shift_goals.shift_id AND t.unit = 'TON');
DELETE FROM shift_goals
WHERE unit = 'TON' AND EXISTS (SELECT 1 FROM shift_goals k WHERE k.shift_id = shift_goals.shift_id AND k.unit = 'KG');
UPDATE shift_goals SET unit = 'KG', goal = goal * 1000 WHERE unit = 'TON';

UPDATE quantities
SET quantity = quantity + (SELECT t.quantity * 1000 FROM quantities t WHERE t.shift_id = quantities.shift_id AND t.user_id = quantities.user_id AND t.unit = 'TON')
WHERE unit = 'KG' AND EXISTS (SELECT 1 FROM quantities t WHERE t.shift_id = quantities.shift_id AND t.user_id = quantities.user_id AND t.unit = 'TON');
DELETE FROM quantities
WHERE unit = 'TON' AND EXISTS (SELECT 1 FROM quantities k WHERE k.shift_id = quantities.shift_id AND k.user_id = quantities.user_id AND k.unit = 'KG');
UPDATE quantities SET unit = 'KG', quantity = quantity * 1000 WHERE unit = 'TON';

DELETE FROM field_unit_rates
WHERE unit = 'TON' AND EXISTS (SELECT 1 FROM field_unit_rates k WHERE k.field_id = field_unit_rates.field_id AND k.unit = 'KG');
UPDATE field_unit_rates SET unit = 'KG', rate_nis = rate_nis / 1000 WHERE unit = 'TON';

CREATE TABLE shift_goals_new (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','OTHER')),
 goal REAL NOT NULL CHECK(goal >= 0), UNIQUE(shift_id,unit)
);
INSERT INTO shift_goals_new SELECT id,shift_id,unit,goal FROM shift_goals;
DROP TABLE shift_goals;
ALTER TABLE shift_goals_new RENAME TO shift_goals;

CREATE TABLE quantities_new (
 id INTEGER PRIMARY KEY, shift_id INTEGER NOT NULL REFERENCES shifts(id), user_id INTEGER NOT NULL REFERENCES users(id),
 quantity REAL NOT NULL CHECK(quantity >= 0),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','OTHER')),
 updated_by INTEGER NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(shift_id,user_id,unit)
);
INSERT INTO quantities_new SELECT id,shift_id,user_id,quantity,unit,updated_by,updated_at FROM quantities;
DROP TABLE quantities;
ALTER TABLE quantities_new RENAME TO quantities;

CREATE TABLE field_unit_rates_new (
 id INTEGER PRIMARY KEY, field_id INTEGER NOT NULL REFERENCES plantation_fields(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','OTHER')),
 rate_nis REAL NOT NULL CHECK(rate_nis > 0), UNIQUE(field_id,unit)
);
INSERT INTO field_unit_rates_new SELECT id,field_id,unit,rate_nis FROM field_unit_rates;
DROP TABLE field_unit_rates;
ALTER TABLE field_unit_rates_new RENAME TO field_unit_rates;
