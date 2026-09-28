-- סימון הוצאות שהחילוץ האוטומטי שלהן נכשל או חלקי, עד שמנהל משלים אותן ידנית
ALTER TABLE expenses ADD COLUMN extraction_failed INTEGER NOT NULL DEFAULT 0 CHECK(extraction_failed IN (0,1));
CREATE INDEX expenses_extraction_failed ON expenses(extraction_failed) WHERE extraction_failed=1;
