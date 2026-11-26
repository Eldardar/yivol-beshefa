-- מחיר מותאם ללילה בודד של עובד/ת (למשל הנחה). NULL = מחיר אפשרות הלינה הרגיל.
-- המחיר המותאם מתאפס כשאפשרות הלינה של הלילה משתנה או כשהלילה מבוטל.
ALTER TABLE housing_status ADD COLUMN price_override REAL CHECK(price_override IS NULL OR price_override >= 0);
