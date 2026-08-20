import { getDb } from "../src/lib/db";
import { hashPassword, normalizeEmail } from "../src/lib/security";

async function main(): Promise<void> {
  const { ADMIN_EMAIL: emailRaw, ADMIN_PASSWORD: password } = process.env;

  if (!emailRaw || !password) {
    console.error("חובה להגדיר ADMIN_EMAIL ו-ADMIN_PASSWORD");
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("הסיסמה חייבת להכיל לפחות 8 תווים");
    process.exitCode = 1;
    return;
  }

  const email = normalizeEmail(emailRaw);
  const db = getDb();
  try {
    const hash = await hashPassword(password);
    const result = db
      .prepare("UPDATE users SET password_hash=?, must_change_password=0 WHERE email=? AND role='ADMIN'")
      .run(hash, email);
    if (result.changes === 0) {
      console.error("לא נמצא משתמש מנהל עם כתובת האימייל הזו");
      process.exitCode = 1;
      return;
    }
    console.log("הסיסמה עודכנה בהצלחה. הסיסמה אינה מודפסת.");
  } finally {
    db.close();
  }
}

main().catch(() => {
  console.error("עדכון הסיסמה נכשל.");
  process.exitCode = 1;
});
