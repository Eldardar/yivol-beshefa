import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type AppDb = Database.Database;

export function migrate(db: AppDb): void {
  db.pragma("foreign_keys = ON");
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const dir = path.join(process.cwd(), "migrations");
  const files = fs.readdirSync(dir).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  const applied = db.prepare("SELECT 1 FROM schema_migrations WHERE version=?");
  const record = db.prepare("INSERT INTO schema_migrations(version) VALUES(?)");
  for (const file of files) {
    const version = Number(file.match(/^\d+/)?.[0]);
    if (!Number.isSafeInteger(version) || applied.get(version)) continue;
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    db.transaction(() => { db.exec(sql); record.run(version); })();
  }
}

export function openDb(filename = process.env.DATABASE_PATH || "./data/yivol.sqlite"): AppDb {
  if(process.env.NODE_ENV==="production"&&(!process.env.DATABASE_PATH||!path.isAbsolute(process.env.DATABASE_PATH)))throw new Error("בייצור נדרש DATABASE_PATH מוחלט על אחסון מתמיד");
  const resolved = path.resolve(filename);
  fs.mkdirSync(path.dirname(resolved), { recursive: true, mode: 0o700 });
  const database = new Database(resolved);
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  migrate(database);
  return database;
}

let singleton: AppDb | undefined;
export function getDb(): AppDb { singleton ??= openDb(); return singleton; }
export function createTestDb(): AppDb { const database = new Database(":memory:"); migrate(database); return database; }
