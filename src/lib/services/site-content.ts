import fs from "node:fs";
import path from "node:path";
import type { AppDb } from "@/lib/db";
import { quoteSchema } from "@/lib/schemas";
import type { GalleryPhotoRow, QuoteRow } from "@/lib/site-content";
import type { StoreImage } from "@/lib/services/store";
import type { StoreImageType } from "@/lib/store";

export type GalleryImage = StoreImage;
export type QuoteInput = { text: unknown; cite: unknown };

const EXTENSIONS: Record<StoreImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };

// התמונות נשמרות ליד מסד הנתונים, על אותו אחסון מתמיד
export function galleryImagesDir(): string {
  const dbPath = process.env.DATABASE_PATH || "./data/yivol.sqlite";
  return path.resolve(path.dirname(dbPath), "gallery-images");
}

export class SiteContentService {
  constructor(private readonly db: AppDb, private readonly imagesDir = galleryImagesDir()) {}

  private assertAdmin(actorId: number): void {
    const actor = this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as { role: string; active: number } | undefined;
    if (!actor?.active || actor.role !== "ADMIN") throw new Error("אין הרשאה");
  }

  private audit(actorId: number, action: string, entityType: string, entityId: number): void {
    this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, action, entityType, entityId);
  }

  listPhotos(): GalleryPhotoRow[] {
    return this.db.prepare("SELECT id,created_at FROM gallery_photos ORDER BY id").all() as GalleryPhotoRow[];
  }

  addPhoto(actorId: number, image: GalleryImage): number {
    this.assertAdmin(actorId);
    fs.mkdirSync(this.imagesDir, { recursive: true, mode: 0o700 });
    const name = `gallery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSIONS[image.mime]}`;
    const file = path.join(this.imagesDir, name);
    fs.writeFileSync(file, image.bytes, { mode: 0o600 });
    try {
      return this.db.transaction(() => {
        const id = Number(this.db.prepare("INSERT INTO gallery_photos(image_path,image_mime) VALUES(?,?)").run(name, image.mime).lastInsertRowid);
        this.audit(actorId, "CREATE", "GALLERY_PHOTO", id);
        return id;
      })();
    } catch (error) {
      fs.rmSync(file, { force: true });
      throw error;
    }
  }

  // מחיקה לצמיתות, כולל הקובץ מהדיסק
  deletePhoto(actorId: number, photoId: number): void {
    this.assertAdmin(actorId);
    const image = this.getPhotoImage(photoId);
    this.db.transaction(() => {
      if (this.db.prepare("DELETE FROM gallery_photos WHERE id=?").run(photoId).changes !== 1) throw new Error("התמונה לא נמצאה");
      this.audit(actorId, "DELETE", "GALLERY_PHOTO", photoId);
    })();
    if (image) fs.rmSync(image.path, { force: true });
  }

  getPhotoImage(photoId: number): { path: string; mime: string } | undefined {
    const row = this.db.prepare("SELECT image_path,image_mime FROM gallery_photos WHERE id=?").get(photoId) as { image_path: string; image_mime: string } | undefined;
    if (!row) return undefined;
    return { path: path.join(this.imagesDir, path.basename(row.image_path)), mime: row.image_mime };
  }

  listQuotes(): QuoteRow[] {
    return this.db.prepare("SELECT id,text,cite FROM quotes ORDER BY id").all() as QuoteRow[];
  }

  addQuote(actorId: number, raw: QuoteInput): number {
    this.assertAdmin(actorId);
    const input = quoteSchema.parse(raw);
    return this.db.transaction(() => {
      const id = Number(this.db.prepare("INSERT INTO quotes(text,cite) VALUES(?,?)").run(input.text, input.cite).lastInsertRowid);
      this.audit(actorId, "CREATE", "QUOTE", id);
      return id;
    })();
  }

  deleteQuote(actorId: number, quoteId: number): void {
    this.assertAdmin(actorId);
    this.db.transaction(() => {
      if (this.db.prepare("DELETE FROM quotes WHERE id=?").run(quoteId).changes !== 1) throw new Error("הציטוט לא נמצא");
      this.audit(actorId, "DELETE", "QUOTE", quoteId);
    })();
  }
}
