# יבול בשפע

MVP מלא לניהול קוטפים, זמינות, משקים, עונות, רכבים, משמרות, הודעות ודוחות. ממשק עברי RTL; אזור הזמן `Asia/Jerusalem`.

## הפעלה
1. Node.js 22.
2. `npm ci`
3. `cp .env.example .env.local` והגדירו `DATABASE_PATH`.
4. `npm run db:migrate`
5. הגדירו זמנית את ארבעת משתני `SEED_ADMIN_*` והריצו `npm run seed`. אין פרטי ברירת מחדל.
6. `npm run dev` או `npm run build && npm start`.

## פקודות
`npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run db:migrate`, `npm run seed`.

## גבולות MVP
אין שכר, חשבוניות, GPS, מסלולים, צ׳אט, העלאות, חשבונות משק, ניתוחים מתקדמים, אפליקציה טבעית או SMTP. הודעות הן בתוך המערכת בלבד; לא נשלח דוא״ל.
