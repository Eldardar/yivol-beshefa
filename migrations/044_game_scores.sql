-- המשחק מתחלף מדי חודש בערך: טבלת שיאים אחת לכל המשחקים, ושיאי משחקים קודמים נשמרים
CREATE TABLE game_scores (
 id INTEGER PRIMARY KEY,
 game TEXT NOT NULL,
 user_id INTEGER NOT NULL REFERENCES users(id),
 score INTEGER NOT NULL CHECK(score > 0),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO game_scores(id,game,user_id,score,created_at) SELECT id,'snake',user_id,score,created_at FROM snake_scores;
DROP TABLE snake_scores;
CREATE INDEX game_scores_rank ON game_scores(game, score DESC, created_at);
