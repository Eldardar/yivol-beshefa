# יומן TDD

ההתנהגויות הקריטיות נבנו במחזורי RED→GREEN לפני ה-UI.

## מחזור 1 — כללי תזמון ואבטחה בסיסית
RED (26-07-2026):
```text
$ npm test -- --reporter=verbose
FAIL tests/domain.test.ts — Cannot find module '@/lib/db'
FAIL tests/security.test.ts — Cannot find module '@/lib/security'
Test Files 2 failed (2)
```
הכשל היה צפוי: שכבות המסד, הסכמות והשירות טרם נכתבו. לאחר מימוש מינימלי:
```text
$ npm test -- --reporter=verbose
✓ דורש מוביל יחיד מתוך הקוטפים
✓ חוסם חסר זמינות ומאפשר אולי עם אזהרה
✓ חוסם שיבוץ כפול לקוטף ולרכב באותו מועד
✓ גיבוב, אסימון, הפניה פתוחה, שדות לא מוכרים וכמות שלילית
Test Files 2 passed (2), Tests 8 passed (8)
```

## מחזור 2 — הפעלה, CSRF, IDOR וחודש הבא
RED:
```text
$ npm test -- --reporter=verbose tests/authz.test.ts
FAIL — Cannot find module '@/lib/services/auth'
Test Files 1 failed (1)
```
GREEN ראשוני חשף שני כשלים אמיתיים בסכמת שאילתה (`shift_id`, `updated_at`); הם תוקנו בלי להחליש בדיקות. GREEN סופי:
```text
$ npm test -- --reporter=verbose
Test Files 3 passed (3)
Tests 13 passed (13)
```

הבדיקות משתמשות ב-SQLite אמיתי בזיכרון, לא ב-mocks. פקודות האימות הסופיות ותוצאותיהן נרשמות בסוף מסמך זה לאחר build/smoke.
