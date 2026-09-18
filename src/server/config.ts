import { resolve } from 'node:path';
import { isIP } from 'node:net';
export function readServerConfig(env: Record<string, string | undefined> = process.env) {
  const production = env.NODE_ENV === 'production';
  const origin = env.BOCHA_PUBLIC_ORIGIN ?? (production ? '' : 'http://localhost:3000');
  const url = new URL(origin);
  if (
    url.origin !== origin ||
    url.username ||
    url.password ||
    url.hostname.includes('*') ||
    !['http:', 'https:'].includes(url.protocol) ||
    (production && url.protocol !== 'https:')
  )
    throw new Error('BOCHA_PUBLIC_ORIGIN debe ser un origen válido; producción requiere HTTPS.');
  const hex = env.BOCHA_BACKUP_KEY ?? '';
  if (!/^[a-f0-9]{64}$/i.test(hex) || /^0+$/.test(hex))
    throw new Error('BOCHA_BACKUP_KEY requiere una clave aleatoria de 32 bytes en hexadecimal.');
  const proxy = env.BOCHA_TRUST_PROXY;
  if (
    proxy &&
    proxy.split(',').some((cidr) => {
      const [address, bits, ...extra] = cidr.split('/'),
        version = isIP(address ?? ''),
        prefix = Number(bits);
      return (
        extra.length > 0 ||
        !version ||
        !bits ||
        !Number.isInteger(prefix) ||
        prefix < 1 ||
        prefix > (version === 4 ? 32 : 128)
      );
    })
  )
    throw new Error('Configurá únicamente la red del proxy confiable.');
  const port = Number(env.BOCHA_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Puerto inválido.');
  return {
    production,
    origin,
    trustProxy: proxy ? proxy.split(',') : (false as const),
    port,
    host: env.BOCHA_HOST ?? '127.0.0.1',
    databasePath: resolve(env.BOCHA_DATABASE_PATH ?? '.data/web/bocha.sqlite'),
    backupDirectory: resolve(env.BOCHA_BACKUP_DIRECTORY ?? '.data/web/backups'),
    backupKey: Buffer.from(hex, 'hex'),
    appVersion: '0.1.0',
  };
}
