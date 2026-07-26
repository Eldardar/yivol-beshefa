import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
if (process.env.DATABASE_PATH && !path.isAbsolute(process.env.DATABASE_PATH)) {
  process.env.DATABASE_PATH = path.resolve(root, process.env.DATABASE_PATH);
}
const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(standalone, "server.js"))) {
  console.error("לא נמצא build עצמאי. יש להריץ npm run build תחילה.");
  process.exit(1);
}
fs.mkdirSync(path.join(standalone, ".next"), { recursive: true });
fs.cpSync(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"), { recursive: true });
const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) fs.cpSync(publicDir, path.join(standalone, "public"), { recursive: true });
await import(path.join(standalone, "server.js"));
