-- מועד העדכון האחרון של הוצאה; להוצאות קיימות — מועד ההוספה
ALTER TABLE expenses ADD COLUMN updated_at TEXT;
UPDATE expenses SET updated_at=created_at;
