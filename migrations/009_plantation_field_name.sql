ALTER TABLE plantation_fields ADD COLUMN name TEXT NOT NULL DEFAULT '';
UPDATE plantation_fields SET name=fruit_type WHERE name='';
