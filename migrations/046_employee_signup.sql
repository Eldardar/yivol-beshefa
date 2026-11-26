-- הרשמה עצמית של עובדים בקישור הזמנה.
-- משתמש שנרשם בעצמו נשמר עם active=0 ו-signup_pending=1, כך שכל בדיקות active=1 הקיימות חוסמות אותו
-- עד שהדוא״ל אומת וגם מנהל אישר; אז active=1 ו-signup_pending=0.
ALTER TABLE users ADD COLUMN signup_pending INTEGER NOT NULL DEFAULT 0 CHECK(signup_pending IN (0,1));
ALTER TABLE users ADD COLUMN email_verified_at TEXT;
ALTER TABLE users ADD COLUMN approved_at TEXT;
ALTER TABLE users ADD COLUMN approved_by INTEGER REFERENCES users(id);
CREATE TABLE IF NOT EXISTS user_invites (
 id INTEGER PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, created_by INTEGER NOT NULL REFERENCES users(id),
 expires_at TEXT NOT NULL, used_at TEXT, used_by_user_id INTEGER, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS email_verification_tokens (
 id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), token_hash TEXT NOT NULL UNIQUE,
 expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_signup_pending ON users(signup_pending);
