-- תמונת פרופיל לכל משתמש. avatar_version משתנה בכל החלפה, כדי שהדפדפן לא יציג תמונה ישנה
ALTER TABLE users ADD COLUMN avatar_path TEXT;
ALTER TABLE users ADD COLUMN avatar_mime TEXT;
ALTER TABLE users ADD COLUMN avatar_version TEXT;
