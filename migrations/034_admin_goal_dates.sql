-- יעד המנהל נקבע לטווח תאריכים (התחלה וסיום, כולל) במקום לחודש קלנדרי
CREATE TABLE admin_goals (
 user_id INTEGER NOT NULL REFERENCES users(id),
 unit TEXT NOT NULL CHECK(unit IN ('KG','DOLAV','CRATE_SMALL','CRATE_LARGE','BUCKET','BAG','HOURS','OTHER')),
 goal REAL NOT NULL CHECK(goal > 0),
 start_date TEXT NOT NULL CHECK(start_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]'),
 end_date TEXT NOT NULL CHECK(end_date GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9]' AND end_date >= start_date),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,unit)
);
-- היעד החודשי האחרון של כל מנהל הופך ליעד מתחילת אותו חודש ועד סופו
INSERT INTO admin_goals(user_id,unit,goal,start_date,end_date,updated_at)
SELECT g.user_id,g.unit,g.goal,g.month||'-01',date(g.month||'-01','+1 month','-1 day'),g.updated_at
FROM admin_monthly_goals g
WHERE g.month=(SELECT max(m.month) FROM admin_monthly_goals m WHERE m.user_id=g.user_id);
DROP TABLE admin_monthly_goals;
