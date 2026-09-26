CREATE TABLE IF NOT EXISTS snake_scores (
 id INTEGER PRIMARY KEY,
 user_id INTEGER NOT NULL REFERENCES users(id),
 score INTEGER NOT NULL CHECK(score > 0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS snake_scores_score ON snake_scores(score DESC, created_at);
