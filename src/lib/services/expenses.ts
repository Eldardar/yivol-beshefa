import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { AppDb } from "@/lib/db";
import { jerusalemDate, monthRange } from "@/lib/dates";
import { EDITABLE_FIELDS, EXPENSE_FIELDS, EXPENSE_FILE_TYPES, type ExpenseFileType, type ExpenseRow, type ExpenseSource, type ExpenseValues } from "@/lib/expenses";

const dateValue = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "תאריך אינו תקין");
const emptyToNull = (value: unknown) => (value === undefined || value === null || (typeof value === "string" && value.trim() === "") ? null : value);

const valuesSchema = z.object(
  Object.fromEntries(
    EXPENSE_FIELDS.map(field => {
      const base = field.kind === "date" ? dateValue : field.kind === "number" ? z.coerce.number().finite(`${field.label} אינו מספר תקין`) : z.string().trim().max(field.kind === "longtext" ? 5000 : 500);
      return [field.key, z.preprocess(emptyToNull, base.nullable()).optional()];
    })
  )
) as z.ZodType<ExpenseValues>;

const ROW_COLUMNS = `id,source,file_path IS NOT NULL has_file,file_mime,created_at,${EXPENSE_FIELDS.map(field => field.key).join(",")}`;

const EXTENSIONS: Record<ExpenseFileType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "application/pdf": "pdf" };

export function isExpenseFileType(value: string): value is ExpenseFileType {
  return (EXPENSE_FILE_TYPES as readonly string[]).includes(value);
}

// הקבצים נשמרים ליד מסד הנתונים, על אותו אחסון מתמיד
export function expenseFilesDir(): string {
  const dbPath = process.env.DATABASE_PATH || "./data/yivol.sqlite";
  return path.resolve(path.dirname(dbPath), "expense-files");
}

export type ExpenseFile = { bytes: Buffer; mime: ExpenseFileType };

export class ExpenseService {
  constructor(private readonly db: AppDb, private readonly filesDir = expenseFilesDir()) {}

  create(actorId: number, source: ExpenseSource, input: unknown, file?: ExpenseFile, options: { extractionFailed?: boolean } = {}): number {
    const values = valuesSchema.parse(input ?? {});
    if (values.invoice_date && values.tax_year == null) values.tax_year = Number(values.invoice_date.toString().slice(0, 4));
    values.processing_date = jerusalemDate();

    const keys = EXPENSE_FIELDS.map(field => field.key);
    return this.db.transaction(() => {
      const result = this.db
        .prepare(`INSERT INTO expenses(source,created_by,extraction_failed,${keys.join(",")}) VALUES(?,?,?,${keys.map(() => "?").join(",")})`)
        .run(source, actorId, options.extractionFailed ? 1 : 0, ...keys.map(key => values[key] ?? null));
      const id = Number(result.lastInsertRowid);
      if (file) {
        const name = `expense-${id}.${EXTENSIONS[file.mime]}`;
        fs.mkdirSync(this.filesDir, { recursive: true, mode: 0o700 });
        fs.writeFileSync(path.join(this.filesDir, name), file.bytes, { mode: 0o600 });
        this.db
          .prepare("UPDATE expenses SET file_path=?,file_mime=?,new_file_name=?,file_link=? WHERE id=?")
          .run(name, file.mime, name, `/api/admin/expenses/${id}/file`, id);
      }
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, "CREATE", "EXPENSE", id);
      return id;
    })();
  }

  // עדכון ידני (למשל השלמת הוצאה שהחילוץ שלה נכשל) — מסיר את סימון הכישלון
  update(actorId: number, id: number, input: unknown): void {
    const values = valuesSchema.parse(input ?? {});
    if (values.invoice_date && values.tax_year == null) values.tax_year = Number(values.invoice_date.toString().slice(0, 4));
    const keys = EDITABLE_FIELDS.map(field => field.key);
    this.db.transaction(() => {
      const result = this.db
        .prepare(`UPDATE expenses SET ${keys.map(key => `${key}=?`).join(",")},extraction_failed=0 WHERE id=?`)
        .run(...keys.map(key => values[key] ?? null), id);
      if (result.changes !== 1) throw new Error("ההוצאה לא נמצאה");
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, "UPDATE", "EXPENSE", id);
    })();
  }

  // מחיקה לצמיתות, כולל קובץ המקור מהדיסק
  delete(actorId: number, id: number): void {
    const file = this.getFile(id);
    this.db.transaction(() => {
      const result = this.db.prepare("DELETE FROM expenses WHERE id=?").run(id);
      if (result.changes !== 1) throw new Error("ההוצאה לא נמצאה");
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, "DELETE", "EXPENSE", id);
    })();
    if (file) fs.rmSync(file.path, { force: true });
  }

  // הוצאה משויכת לחודש לפי תאריך העסקה, ובהיעדרו לפי מועד ההוספה. כל השדות — לפירוט המורחב ולייצוא.
  // הוצאות שהחילוץ שלהן נכשל ממתינות ברשימה נפרדת עד להשלמתן
  listForMonth(year: number, month: number): ExpenseRow[] {
    const range = monthRange(year, month);
    return this.db
      .prepare(
        `SELECT ${ROW_COLUMNS} FROM expenses
         WHERE extraction_failed=0 AND COALESCE(invoice_date,substr(created_at,1,10))>=? AND COALESCE(invoice_date,substr(created_at,1,10))<?
         ORDER BY COALESCE(invoice_date,substr(created_at,1,10)),id`
      )
      .all(range.start, range.end) as ExpenseRow[];
  }

  listFailed(): ExpenseRow[] {
    return this.db.prepare(`SELECT ${ROW_COLUMNS} FROM expenses WHERE extraction_failed=1 ORDER BY created_at DESC,id DESC`).all() as ExpenseRow[];
  }

  getFile(id: number): { path: string; mime: string; name: string } | undefined {
    const row = this.db.prepare("SELECT file_path,file_mime FROM expenses WHERE id=?").get(id) as { file_path: string | null; file_mime: string | null } | undefined;
    if (!row?.file_path || !row.file_mime) return undefined;
    return { path: path.join(this.filesDir, path.basename(row.file_path)), mime: row.file_mime, name: row.file_path };
  }
}
