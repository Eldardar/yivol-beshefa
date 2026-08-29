CREATE TABLE IF NOT EXISTS field_unit_rates (
 id INTEGER PRIMARY KEY, field_id INTEGER NOT NULL REFERENCES plantation_fields(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','TON','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','OTHER')),
 rate_nis REAL NOT NULL CHECK(rate_nis > 0), UNIQUE(field_id,unit)
);
