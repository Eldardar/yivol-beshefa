import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [algorithm, saltText, keyText] = encoded.split("$");
  if (algorithm !== "scrypt" || !saltText || !keyText) return false;
  try {
    const expected = Buffer.from(keyText, "base64url");
    const actual = (await scrypt(password, Buffer.from(saltText, "base64url"), expected.length)) as Buffer;
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generateInitialPassword(): string {
  return `${randomBytes(12).toString("base64url")}!7aA`;
}
export const generatePassword = generateInitialPassword;
export function normalizeEmail(value:string){return value.trim().toLocaleLowerCase("en-US");}
export function sanitizeAudit(details:Record<string,unknown>){const forbidden=/password|token|secret|csrf|hash/i;return Object.fromEntries(Object.entries(details).filter(([key])=>!forbidden.test(key)));}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
