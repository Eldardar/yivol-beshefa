import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import type { ExpenseFile, ExpenseService } from "@/lib/services/expenses";
import type { ExpenseSource, ExpenseValues } from "@/lib/expenses";
import { jerusalemDate } from "@/lib/dates";

// השדות ש-Claude ממלא מתוך המסמך עצמו; שדות סיווג פנימיים (מחלקה, טיול, סיווג מס וכו') נשארים למילוי ידני
const ExtractionSchema = z.object({
  invoice_date: z.string().nullable().describe("תאריך העסקה/החשבונית בפורמט YYYY-MM-DD"),
  supplier_name: z.string().nullable().describe("שם הספק/בית העסק שהנפיק את המסמך"),
  invoice_number: z.string().nullable().describe("מספר החשבונית/הקבלה"),
  details: z.string().nullable().describe("תיאור קצר בעברית של מהות ההוצאה (מה נקנה/שולם)"),
  transaction_currency: z.string().nullable().describe("קוד מטבע העסקה לפי ISO 4217, למשל ILS, USD, EUR"),
  exchange_rate: z.number().nullable().describe("שער ההמרה לשקל אם מופיע במסמך; 1 אם המטבע הוא ILS"),
  amount_transaction_currency: z.number().nullable().describe("הסכום הכולל במטבע העסקה"),
  amount_before_vat: z.number().nullable().describe("הסכום לפני מע״מ בשקלים"),
  vat: z.number().nullable().describe("סכום המע״מ בשקלים"),
  total_ils: z.number().nullable().describe("הסכום הכולל בשקלים"),
  payment_currency: z.string().nullable().describe("קוד מטבע התשלום לפי ISO 4217"),
  payment_date: z.string().nullable().describe("תאריך התשלום בפורמט YYYY-MM-DD, אם שונה או מופיע בנפרד"),
  payment_method: z.string().nullable().describe("אופן התשלום בעברית: אשראי, מזומן, העברה בנקאית, צ׳ק, ביט וכו׳ (כולל 4 ספרות אחרונות של כרטיס אם מופיעות)"),
  invoice_type: z.string().nullable().describe("סוג המסמך בעברית: חשבונית מס, חשבונית מס/קבלה, קבלה, חשבון עסקה, חשבונית זיכוי וכו׳"),
  review_notes: z.string().nullable().describe("הערות בעברית על ערכים לא ודאיים, מסמך לא קריא או חלקי; null אם הכול ברור"),
});

const prompt = (today: string) => `המסמך המצורף הוא חשבונית, קבלה או מסמך הוצאה אחר של עסק חקלאי בישראל. התאריך היום: ${today}.
חלץ ממנו את פרטי ההוצאה לפי הסכמה.
- מלא רק ערכים שמופיעים במסמך או שניתן לחשב מהם בוודאות (למשל מע״מ = כולל פחות לפני מע״מ). אחרת החזר null — אל תנחש.
- סכומים כמספרים בלבד, ללא סימני מטבע או פסיקים.
- באופן תשלום בכרטיס, צרף את 4 הספרות האחרונות אם הן מופיעות (למשל "אשראי 4821").
- שיעור המע״מ בישראל הוא 18% מאז 1.1.2025 (17% לפני כן) — אין לסמן אותו כחריג.
- ב-review_notes ציין רק בעיות אמיתיות: ערך לא קריא, סכומים שאינם מסתכמים, תאריך אחרי היום או מסמך חלקי.
- אם המסמך אינו מסמך הוצאה או שאינו קריא, החזר null בכל השדות וכתוב הסבר ב-review_notes.`;

let client: Anthropic | undefined;
function anthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("לא הוגדר ANTHROPIC_API_KEY בשרת");
  client ??= new Anthropic();
  return client;
}

export class ExtractionError extends Error {}

const PASSWORD_PDF_MESSAGE = "קובץ ה-PDF מוגן בסיסמה, ולכן לא ניתן לקרוא אותו. אפשר להשלים את הפרטים ידנית, או לשמור עותק ללא סיסמה (למשל ״הדפסה ל-PDF״) ולהעלות שוב.";

// PDF מוצפן מסומן במילון /Encrypt. חלק מהם (הגבלת הדפסה בלבד) עדיין קריאים, ולכן זה רק מכוון את הודעת השגיאה
function isEncryptedPdf(file: ExpenseFile): boolean {
  return file.mime === "application/pdf" && file.bytes.includes("/Encrypt");
}

// הודעה ברורה בעברית למנהל; הפרטים הטכניים נשארים ביומן השרת
function friendlyError(error: unknown, file: ExpenseFile): string {
  if (error instanceof ExtractionError) return error.message;
  if (error instanceof Anthropic.BadRequestError && isEncryptedPdf(file)) return PASSWORD_PDF_MESSAGE;
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) return "מפתח ה-API של Claude אינו תקין או חסר הרשאה. יש לבדוק את ANTHROPIC_API_KEY.";
  if (error instanceof Anthropic.RateLimitError) return "שירות החילוץ עמוס כרגע. אפשר להשלים את הפרטים ידנית או להעלות שוב מאוחר יותר.";
  if (error instanceof Anthropic.APIConnectionError) return "לא ניתן היה להתחבר לשירות החילוץ. אפשר להשלים את הפרטים ידנית או להעלות שוב מאוחר יותר.";
  if (error instanceof Anthropic.APIError && error.status === 402) return "נגמרה יתרת החיוב בחשבון Claude. יש להוסיף קרדיט ב-Anthropic Console.";
  if (error instanceof Anthropic.BadRequestError) return "Claude לא הצליח לקרוא את הקובץ — ייתכן שהוא פגום, מוגן או בפורמט לא נתמך. יש להשלים את הפרטים ידנית.";
  if (error instanceof Anthropic.APIError && (error.status ?? 0) >= 500) return "שירות החילוץ לא זמין כרגע. אפשר להשלים את הפרטים ידנית או להעלות שוב מאוחר יותר.";
  return "אירעה שגיאה לא צפויה בחילוץ. יש להשלים את הפרטים ידנית.";
}

export async function extractExpense(file: ExpenseFile): Promise<ExpenseValues> {
  const data = file.bytes.toString("base64");
  const source: Anthropic.ContentBlockParam =
    file.mime === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.mime, data } };

  const response = await anthropic().messages.parse({
    model: "claude-sonnet-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { format: zodOutputFormat(ExtractionSchema) },
    messages: [{ role: "user", content: [source, { type: "text", text: prompt(jerusalemDate()) }] }],
  });

  if (response.stop_reason === "refusal") throw new ExtractionError("Claude סירב לעבד את המסמך. יש להשלים את הפרטים ידנית.");
  const parsed = response.parsed_output;
  if (!parsed) throw new ExtractionError("לא התקבלה תשובה תקינה מ-Claude. יש להשלים את הפרטים ידנית.");

  // תאריך בפורמט שגוי לא יפיל את השמירה — נעביר אותו להערות
  const notes: string[] = parsed.review_notes ? [parsed.review_notes] : [];
  for (const key of ["invoice_date", "payment_date"] as const) {
    const value = parsed[key];
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      notes.push(`${key === "invoice_date" ? "תאריך עסקה" : "תאריך תשלום"} לא זוהה בוודאות: ${value}`);
      parsed[key] = null;
    }
  }
  return { ...parsed, review_notes: notes.length ? notes.join("\n") : null };
}

// "שמירה ישירה": גם אם החילוץ נכשל, ההוצאה נשמרת עם הקובץ והערה לבדיקה כדי שלא יאבד דבר
// בלי השדות האלה ההוצאה לא שמישה, ולכן היא עוברת לרשימת "נכשלו בחילוץ" להשלמה ידנית
const REQUIRED_FIELDS = [["invoice_date", "תאריך עסקה"], ["supplier_name", "שם הספק"], ["total_ils", "סכום כולל"]] as const;

export async function createExpenseFromFile(service: ExpenseService, actorId: number, source: ExpenseSource, file: ExpenseFile): Promise<{ id: number; invoiceDate: string | null; extractionFailed: boolean }> {
  anthropic(); // תצורה חסרה היא שגיאה למנהל, לא הוצאה ריקה
  let values: ExpenseValues;
  let failed = false;
  try {
    values = await extractExpense(file);
    const missing = REQUIRED_FIELDS.filter(([key]) => values[key] == null || values[key] === "").map(([, label]) => label);
    if (missing.length) {
      failed = true;
      values.review_notes = [values.review_notes, `לא זוהו: ${missing.join(", ")}`].filter(Boolean).join("\n");
    }
  } catch (error) {
    console.error("expense extraction failed", error);
    failed = true;
    values = { review_notes: `החילוץ האוטומטי נכשל: ${friendlyError(error, file)}` };
  }
  const id = service.create(actorId, source, values, file, { extractionFailed: failed });
  return { id, invoiceDate: typeof values.invoice_date === "string" ? values.invoice_date : null, extractionFailed: failed };
}
