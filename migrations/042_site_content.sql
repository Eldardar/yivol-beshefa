-- תוכן האתר שמנהלים עורכים: תמונות גלריית העובדים בדף הבית וציטוטים במסך הכניסה
-- מתחיל ריק — כל לקוח מעלה את התוכן שלו
-- AUTOINCREMENT: מזהה לא ממוחזר, כי כתובת התמונה נשמרת במטמון הדפדפן לצמיתות
CREATE TABLE gallery_photos (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 image_path TEXT NOT NULL,
 image_mime TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE quotes (
 id INTEGER PRIMARY KEY,
 text TEXT NOT NULL,
 cite TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
