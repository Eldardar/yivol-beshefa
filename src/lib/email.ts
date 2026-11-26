import "server-only";
import nodemailer from "nodemailer";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "יבול בשפע <no-reply@example.com>";

type Message = { to: string; subject: string; text: string; html: string };

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

function fromAddress(): string {
  return process.env.EMAIL_FROM || process.env.SMTP_FROM || DEFAULT_FROM;
}

// Resend's HTTPS API works on hosts that block outbound SMTP ports (e.g. Railway below the Pro plan).
async function sendViaResend(apiKey: string, message: Message): Promise<void> {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress(), to: [message.to], subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend API error ${res.status}: ${detail.slice(0, 500)}`);
  }
}

/** Sends via Resend when RESEND_API_KEY is set, else SMTP when SMTP_HOST is set, else logs (dev). Returns false when nothing was sent. */
export async function sendEmail(message: Message): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await sendViaResend(resendKey, message);
    return true;
  }
  if (process.env.SMTP_HOST) {
    await getTransporter().sendMail({ from: fromAddress(), ...message });
    return true;
  }
  return false;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const sent = await sendEmail({
    to,
    subject: "איפוס סיסמה — יבול בשפע",
    text: `התקבלה בקשה לאיפוס הסיסמה שלך.\n\nלאיפוס הסיסמה, פתחו את הקישור הבא (בתוקף ל-30 דקות):\n${resetUrl}\n\nאם לא ביקשתם זאת, ניתן להתעלם מהודעה זו.`,
    html: `<p>התקבלה בקשה לאיפוס הסיסמה שלך.</p><p><a href="${resetUrl}">לחצו כאן לאיפוס הסיסמה</a> (בתוקף ל-30 דקות).</p><p>אם לא ביקשתם זאת, ניתן להתעלם מהודעה זו.</p>`,
  });
  if (!sent) {
    console.log(`[dev] לא הוגדר שירות דוא״ל (RESEND_API_KEY או SMTP_HOST); קישור איפוס הסיסמה עבור ${to}: ${resetUrl}`);
  }
}
