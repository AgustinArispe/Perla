import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
const options = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('hex');
  return `scrypt$131072$8$1$${salt}$${scryptSync(password, salt, 64, options).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (
    parts.length !== 6 ||
    parts.slice(0, 4).join('$') !== 'scrypt$131072$8$1' ||
    !/^[a-f0-9]{64}$/.test(parts[4]!) ||
    !/^[a-f0-9]{128}$/.test(parts[5]!)
  )
    return false;
  return timingSafeEqual(
    scryptSync(password, parts[4]!, 64, options),
    Buffer.from(parts[5]!, 'hex'),
  );
}
