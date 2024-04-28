import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha512").update(password).digest("hex");
}

export function checkPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}