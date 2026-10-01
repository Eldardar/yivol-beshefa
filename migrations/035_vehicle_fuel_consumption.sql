-- צריכת דלק של הרכב בליטרים ל-100 ק״מ (אופציונלי)
ALTER TABLE vehicles ADD COLUMN fuel_consumption REAL CHECK(fuel_consumption IS NULL OR fuel_consumption > 0);
