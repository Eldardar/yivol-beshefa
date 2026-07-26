import { getDb } from "../src/lib/db";
import { hashPassword, normalizeEmail } from "../src/lib/security";

async function main(): Promise<void> {
  const {
    SEED_ADMIN_NAME: name,
    SEED_ADMIN_EMAIL: email,
    SEED_ADMIN_PHONE: phone,
    SEED_ADMIN_PASSWORD: password,
  } = process.env;

  if (!name || !email || !phone || !password) {
    console.error("חובה להגדיר SEED_ADMIN_NAME, SEED_ADMIN_EMAIL, SEED_ADMIN_PHONE, SEED_ADMIN_PASSWORD");
    process.exitCode = 1;
    return;
  }
  if (password.length < 8) {
    console.error("הסיסמה חייבת להכיל לפחות 8 תווים");
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  try {
    const hash = await hashPassword(password);
    db.prepare("INSERT INTO users(name,email,phone,role,password_hash,active) VALUES(?,?,?,?,?,1) ON CONFLICT(email) DO NOTHING").run(
      name,
      normalizeEmail(email),
      phone,
      "ADMIN",
      hash,
    );
    console.log("חשבון המנהל נוצר או כבר קיים. הסיסמה אינה מודפסת.");
  } finally {
    db.close();
  }
}

main().catch(() => {
  console.error("יצירת חשבון המנהל נכשלה.");
  process.exitCode = 1;
});
