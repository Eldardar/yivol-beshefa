// Keep in sync with passwordSchema in src/lib/schemas.ts.
export function PasswordRules({ id = "password-rules" }: { id?: string }) {
  return (
    <div id={id} className="password-rules">
      <p className="password-rules-title">כללים לסיסמה החדשה:</p>
      <ul>
        <li>באורך 8 עד 128 תווים</li>
        <li>לפחות אות אחת גדולה באנגלית (A-Z)</li>
        <li>לפחות אות אחת קטנה באנגלית (a-z)</li>
        <li>לפחות ספרה אחת (0-9)</li>
        <li>לפחות תו מיוחד אחד, למשל ! @ # $ % * או רווח</li>
        <li>יש להקליד את אותה סיסמה בדיוק גם בשדה &quot;אימות סיסמה&quot;</li>
      </ul>
      <p className="muted">מומלץ לבחור סיסמה שאינה בשימוש באתרים אחרים.</p>
    </div>
  );
}
