CREATE TABLE housing_status (
 user_id INTEGER NOT NULL REFERENCES users(id), date TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('IN_VILLAGE','MAYBE','AWAY')),
 PRIMARY KEY(user_id,date)
);
