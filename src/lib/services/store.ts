import fs from "node:fs";
import path from "node:path";
import type { AppDb } from "@/lib/db";
import { storeProductSchema } from "@/lib/schemas";
import type { StoreImageType, StoreProductRow } from "@/lib/store";

export type StoreProductInput = { name: unknown; description: unknown; price: unknown };
export type StoreImage = { bytes: Buffer; mime: StoreImageType };
// image: undefined — ללא שינוי, null — הסרת התמונה הקיימת
export type StoreImageChange = StoreImage | null | undefined;

const EXTENSIONS: Record<StoreImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };

// התמונות נשמרות ליד מסד הנתונים, על אותו אחסון מתמיד
export function storeImagesDir(): string {
  const dbPath = process.env.DATABASE_PATH || "./data/yivol.sqlite";
  return path.resolve(path.dirname(dbPath), "store-images");
}

export class StoreService {
  constructor(private readonly db: AppDb, private readonly imagesDir = storeImagesDir()) {}

  private assertAdmin(actorId: number): void {
    const actor = this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as { role: string; active: number } | undefined;
    if (!actor?.active || actor.role !== "ADMIN") throw new Error("אין הרשאה");
  }

  list(): StoreProductRow[] {
    return this.db.prepare("SELECT id,name,description,price,image_path IS NOT NULL has_image,updated_at FROM store_products ORDER BY name,id").all() as StoreProductRow[];
  }

  /** Creates a product (productId null) or updates it, replacing or removing its image when asked. */
  save(actorId: number, productId: number | null, raw: StoreProductInput, image?: StoreImageChange): number {
    this.assertAdmin(actorId);
    const input = storeProductSchema.parse(raw);
    const previous = productId === null ? undefined : this.imagePath(productId);
    let written: string | undefined;
    const run = this.db.transaction(() => {
      let id: number;
      if (productId === null) {
        id = Number(this.db.prepare("INSERT INTO store_products(name,description,price) VALUES(?,?,?)").run(input.name, input.description, input.price).lastInsertRowid);
      } else {
        const result = this.db.prepare("UPDATE store_products SET name=?,description=?,price=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(input.name, input.description, input.price, productId);
        if (result.changes !== 1) throw new Error("המוצר לא נמצא");
        id = productId;
      }
      if (image) {
        // שם ייחודי לכל העלאה, כדי שהחלפה שנכשלה לא תדרוס את התמונה הקיימת
        const name = `product-${id}-${Date.now()}.${EXTENSIONS[image.mime]}`;
        fs.mkdirSync(this.imagesDir, { recursive: true, mode: 0o700 });
        fs.writeFileSync(path.join(this.imagesDir, name), image.bytes, { mode: 0o600 });
        written = name;
        this.db.prepare("UPDATE store_products SET image_path=?,image_mime=? WHERE id=?").run(name, image.mime, id);
      } else if (image === null) {
        this.db.prepare("UPDATE store_products SET image_path=NULL,image_mime=NULL WHERE id=?").run(id);
      }
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, productId === null ? "CREATE" : "UPDATE", "STORE_PRODUCT", id);
      return id;
    });
    let id: number;
    try {
      id = run.immediate();
    } catch (error) {
      if (written) fs.rmSync(path.join(this.imagesDir, written), { force: true });
      throw error;
    }
    if (previous && image !== undefined && path.basename(previous) !== written) fs.rmSync(previous, { force: true });
    return id;
  }

  // מחיקה לצמיתות, כולל התמונה מהדיסק
  delete(actorId: number, productId: number): void {
    this.assertAdmin(actorId);
    const image = this.imagePath(productId);
    this.db.transaction(() => {
      const result = this.db.prepare("DELETE FROM store_products WHERE id=?").run(productId);
      if (result.changes !== 1) throw new Error("המוצר לא נמצא");
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, "DELETE", "STORE_PRODUCT", productId);
    })();
    if (image) fs.rmSync(image, { force: true });
  }

  getImage(productId: number): { path: string; mime: string } | undefined {
    const row = this.db.prepare("SELECT image_path,image_mime FROM store_products WHERE id=?").get(productId) as { image_path: string | null; image_mime: string | null } | undefined;
    if (!row?.image_path || !row.image_mime) return undefined;
    return { path: path.join(this.imagesDir, path.basename(row.image_path)), mime: row.image_mime };
  }

  private imagePath(productId: number): string | undefined {
    return this.getImage(productId)?.path;
  }
}
