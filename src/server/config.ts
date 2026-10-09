import { resolve } from 'node:path';
import { isIP } from 'node:net';

function readInteger(
  value: string | undefined,
  name: string,
  fallback: number,
  min: number,
  max: number,
) {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max)
    throw new Error(`${name} debe ser un número entero entre ${min} y ${max}.`);
  return parsed;
}

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
  const sessionIdleMinutes = readInteger(
      env.BOCHA_SESSION_IDLE_MINUTES,
      'BOCHA_SESSION_IDLE_MINUTES',
      30,
      5,
      240,
    ),
    sessionMaxHours = readInteger(
      env.BOCHA_SESSION_MAX_HOURS,
      'BOCHA_SESSION_MAX_HOURS',
      8,
      1,
      24,
    );
  if (sessionMaxHours * 60 < sessionIdleMinutes)
    throw new Error('La duración máxima de sesión debe ser mayor al tiempo de inactividad.');
  return {
    production,
    origin,
    trustProxy: proxy ? proxy.split(',') : (false as const),
    port,
    host: env.BOCHA_HOST ?? '127.0.0.1',
    databasePath: resolve(env.BOCHA_DATABASE_PATH ?? '.data/web/bocha.sqlite'),
    backupDirectory: resolve(env.BOCHA_BACKUP_DIRECTORY ?? '.data/web/backups'),
    backupKey: Buffer.from(hex, 'hex'),
    sessionIdleTimeoutMs: sessionIdleMinutes * 60_000,
    sessionMaxLifetimeMs: sessionMaxHours * 60 * 60_000,
    appVersion: '0.1.0',
  };
}
