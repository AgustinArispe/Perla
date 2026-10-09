import { expect, it } from 'vitest';
import { readServerConfig } from '../../src/server/config';
it('producción exige HTTPS y clave externa; ignora configuración insegura', () => {
  expect(() => readServerConfig({ NODE_ENV: 'production' })).toThrow();
  expect(() =>
    readServerConfig({
      NODE_ENV: 'production',
      BOCHA_PUBLIC_ORIGIN: 'http://example.com',
      BOCHA_BACKUP_KEY: '0'.repeat(64),
    }),
  ).toThrow();
  expect(() =>
    readServerConfig({
      NODE_ENV: 'production',
      BOCHA_PUBLIC_ORIGIN: 'https://example.com',
      BOCHA_BACKUP_KEY: 'short',
    }),
  ).toThrow();
  const config = readServerConfig({
    NODE_ENV: 'production',
    BOCHA_PUBLIC_ORIGIN: 'https://pos.example.com',
    BOCHA_BACKUP_KEY: 'a'.repeat(64),
  });
  expect(config.production).toBe(true);
  expect(config.origin).toBe('https://pos.example.com');
  expect(config.trustProxy).toBe(false);
  expect(config.sessionIdleTimeoutMs).toBe(30 * 60_000);
  expect(config.sessionMaxLifetimeMs).toBe(8 * 60 * 60_000);
  expect(() =>
    readServerConfig({
      BOCHA_BACKUP_KEY: 'a'.repeat(64),
      BOCHA_SESSION_IDLE_MINUTES: '4',
    }),
  ).toThrow('BOCHA_SESSION_IDLE_MINUTES');
  expect(() =>
    readServerConfig({
      BOCHA_BACKUP_KEY: 'a'.repeat(64),
      BOCHA_SESSION_IDLE_MINUTES: '120',
      BOCHA_SESSION_MAX_HOURS: '1',
    }),
  ).toThrow('duración máxima');
  expect(() =>
    readServerConfig({
      BOCHA_BACKUP_KEY: 'a'.repeat(64),
      BOCHA_TRUST_PROXY: '0.0.0.0/0,172.29.70.2/32',
    }),
  ).toThrow();
});
