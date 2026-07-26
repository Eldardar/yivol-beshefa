import { afterEach, describe, expect, test } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("seed script", () => {
  test("creates an administrator when executed through the package script", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "yivol-seed-"));
    directories.push(directory);
    const databasePath = path.join(directory, "seed.sqlite");
    const result = spawnSync("npm", ["run", "seed"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_PATH: databasePath,
        SEED_ADMIN_NAME: "מנהל בדיקה",
        SEED_ADMIN_EMAIL: "seed-admin@example.com",
        SEED_ADMIN_PHONE: "0500000000",
        SEED_ADMIN_PASSWORD: "SeedScript!Pass123",
      },
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    const db = new Database(databasePath, { readonly: true });
    const user = db.prepare("SELECT email, role, active FROM users WHERE email=?").get("seed-admin@example.com") as { email: string; role: string; active: number } | undefined;
    db.close();
    expect(user).toEqual({ email: "seed-admin@example.com", role: "ADMIN", active: 1 });
  });
});
