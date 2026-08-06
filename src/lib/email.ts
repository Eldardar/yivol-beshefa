import "server-only";
import nodemailer from "nodemailer";

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;
function getTransporter() {
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "1",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!process.env.SMTP_HOST) {
    console.log(`[dev] אין הגדרת SMTP_HOST; קישור איפוס הסיסמה עבור ${to}: ${resetUrl}`);
    return;
  }
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM ?? "יבול בשפע <no-reply@example.com>",
    to,
    subject: "איפוס סיסמה — יבול בשפע",
    text: `התקבלה בקשה לאיפוס הסיסמה שלך.\n\nלאיפוס הסיסמה, פתחו את הקישור הבא (בתוקף ל-30 דקות):\n${resetUrl}\n\nאם לא ביקשתם זאת, ניתן להתעלם מהודעה זו.`,
    html: `<p>התקבלה בקשה לאיפוס הסיסמה שלך.</p><p><a href="${resetUrl}">לחצו כאן לאיפוס הסיסמה</a> (בתוקף ל-30 דקות).</p><p>אם לא ביקשתם זאת, ניתן להתעלם מהודעה זו.</p>`,
  });
}
