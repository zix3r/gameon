import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const options = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
export const dummyPasswordHash = `scrypt$32768$8$3$${"0".repeat(32)}$${"0".repeat(128)}`;

function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const match = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(
    encoded,
  );
  if (!match) return false;
  const key = await derive(password, match[1]!);
  return timingSafeEqual(key, Buffer.from(match[2]!, "hex"));
}
