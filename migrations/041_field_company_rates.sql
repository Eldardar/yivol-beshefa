-- הכנסת החברה (מהחקלאי) ליחידה בכל חלקה — נפרד מתעריפי העובדים; משמש לחישוב הכנסה מיעד/תוצאת המשמרת
CREATE TABLE field_company_rates (
 field_id INTEGER NOT NULL REFERENCES plantation_fields(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','HOURS','OTHER')),
 rate_nis REAL NOT NULL CHECK(rate_nis > 0),
 PRIMARY KEY(field_id,unit)
);
