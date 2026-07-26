# ארכיטקטורה

Next.js App Router מרנדר רכיבי שרת וטפסי Server Actions. `src/lib/services` מחזיק את כללי האימות, ההרשאה והתזמון; `src/lib/db.ts` הוא גבול התשתית; Zod מנרמל ומאמת קלט. better-sqlite3 מספק פעולות מסונכרנות ועסקאות מקומיות, עם נתיב מתמיד דרך `DATABASE_PATH` ומצב WAL.

## מודל
`users` (ADMIN/PICKER), `sessions`, `farms` → `seasons`, `vehicles`, `availability`, `shifts` → `shift_pickers`/`shift_vehicles`, `notifications`, `audit_log`. מוביל הוא `leader_id` במשמרת וחייב להופיע ב-`shift_pickers`; הוא אינו תפקיד חשבון. רשומות מופנות אינן נמחקות אלא מסומנות לא פעילות.

## גבולות הרשאה
מנהל בלבד משנה משאבים ומשמרות. קוטף רואה רק רשומות המשויכות למזהה ההפעלה שלו. טיוטות אינן נחשפות. מוביל רואה שמות וכמויות רק בדוח המשמרת המסוים. בדיקות שירות מאמתות התנגשויות, זמינות, IDOR ו-CSRF.

תאריכים נשמרים כ-ISO Gregorian `YYYY-MM-DD`, מוצגים בעברית ומחושבים לפי ירושלים; לוח הזמינות מתחיל ביום ראשון.
