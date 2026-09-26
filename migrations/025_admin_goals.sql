CREATE TABLE IF NOT EXISTS admin_monthly_goals (
 user_id INTEGER NOT NULL REFERENCES users(id),
 month TEXT NOT NULL CHECK(month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','OTHER')),
 goal REAL NOT NULL CHECK(goal > 0), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,month,unit)
);
