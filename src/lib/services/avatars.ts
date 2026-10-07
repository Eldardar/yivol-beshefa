import fs from "node:fs";
import path from "node:path";
import type { AppDb } from "@/lib/db";
import type { StoreImage } from "@/lib/services/store";
import type { StoreImageType } from "@/lib/store";

export type AvatarImage = StoreImage;

const EXTENSIONS: Record<StoreImageType, string> = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp" };

// התמונות נשמרות ליד מסד הנתונים, על אותו אחסון מתמיד
export function avatarImagesDir(): string {
  const dbPath = process.env.DATABASE_PATH || "./data/yivol.sqlite";
  return path.resolve(path.dirname(dbPath), "avatars");
}

export class AvatarService {
  constructor(private readonly db: AppDb, private readonly imagesDir = avatarImagesDir()) {}

  // כל משתמש מנהל את התמונה שלו, ומנהל יכול לנהל את התמונה של כל משתמש
  private assertCanEdit(actorId: number, userId: number): void {
    const actor = this.db.prepare("SELECT role,active FROM users WHERE id=?").get(actorId) as { role: string; active: number } | undefined;
    if (!actor?.active || (actor.role !== "ADMIN" && actorId !== userId)) throw new Error("אין הרשאה");
  }

  /** Replaces the user's picture (image) or removes it (null). */
  set(actorId: number, userId: number, image: AvatarImage | null): void {
    this.assertCanEdit(actorId, userId);
    const previous = this.getImage(userId)?.path;
    let written: string | undefined;
    const run = this.db.transaction(() => {
      if (!this.db.prepare("SELECT 1 FROM users WHERE id=?").get(userId)) throw new Error("המשתמש לא נמצא");
      if (image) {
        // שם ייחודי לכל העלאה, כדי שהחלפה שנכשלה לא תדרוס את התמונה הקיימת
        const version = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const name = `user-${userId}-${version}.${EXTENSIONS[image.mime]}`;
        fs.mkdirSync(this.imagesDir, { recursive: true, mode: 0o700 });
        fs.writeFileSync(path.join(this.imagesDir, name), image.bytes, { mode: 0o600 });
        written = name;
        this.db.prepare("UPDATE users SET avatar_path=?,avatar_mime=?,avatar_version=? WHERE id=?").run(name, image.mime, version, userId);
      } else {
        this.db.prepare("UPDATE users SET avatar_path=NULL,avatar_mime=NULL,avatar_version=NULL WHERE id=?").run(userId);
      }
      this.db.prepare("INSERT INTO audit_events(actor_id,action,entity_type,entity_id) VALUES(?,?,?,?)").run(actorId, image ? "AVATAR_UPDATE" : "AVATAR_DELETE", "USER", userId);
    });
    try {
      run.immediate();
    } catch (error) {
      if (written) fs.rmSync(path.join(this.imagesDir, written), { force: true });
      throw error;
    }
    if (previous && path.basename(previous) !== written) fs.rmSync(previous, { force: true });
  }

  version(userId: number): string | null {
    const row = this.db.prepare("SELECT avatar_version FROM users WHERE id=?").get(userId) as { avatar_version: string | null } | undefined;
    return row?.avatar_version ?? null;
  }

  getImage(userId: number): { path: string; mime: string } | undefined {
    const row = this.db.prepare("SELECT avatar_path,avatar_mime FROM users WHERE id=?").get(userId) as { avatar_path: string | null; avatar_mime: string | null } | undefined;
    if (!row?.avatar_path || !row.avatar_mime) return undefined;
    return { path: path.join(this.imagesDir, path.basename(row.avatar_path)), mime: row.avatar_mime };
  }
}
