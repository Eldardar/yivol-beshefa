-- קואורדינטות שחולצו מקישור גוגל מפות בשדה המיקום (לקריאה בלבד)
ALTER TABLE villages ADD COLUMN latitude REAL;
ALTER TABLE villages ADD COLUMN longitude REAL;
ALTER TABLE plantation_fields ADD COLUMN latitude REAL;
ALTER TABLE plantation_fields ADD COLUMN longitude REAL;
