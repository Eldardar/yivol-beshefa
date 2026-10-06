-- חנות: מוצרים שמנהלים מגדירים ועובדים צופים בהם, עם תמונה אופציונלית שנשמרת בשרת
CREATE TABLE store_products (
 id INTEGER PRIMARY KEY,
 name TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 price REAL NOT NULL CHECK(price >= 0),
 image_path TEXT,
 image_mime TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
