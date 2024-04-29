import { hashSync, compareSync } from "bcrypt";

export function hashPassword(password: string): string {
  return hashSync(password, Number(process.env.ENCRYPT_SALT_ROUNDS));
}

export function checkPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}