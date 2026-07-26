ALTER TABLE users ADD COLUMN national_id TEXT;

CREATE UNIQUE INDEX idx_users_national_id_unique
ON users(national_id)
WHERE national_id IS NOT NULL;
