import { expect, it } from 'vitest';
import { readServerConfig } from '../../src/server/config';
it('defaults to enabled Saturday backups in Buenos Aires retaining two scheduler copies', () => {
  expect(readServerConfig({ BOCHA_BACKUP_KEY: 'a'.repeat(64) }).autoBackup).toEqual({
    enabled: true,
    retention: 2,
    timezone: 'America/Argentina/Buenos_Aires',
  });
});
it('supports disabling automatic backups and configuring retention and timezone', () => {
  expect(
    readServerConfig({
      BOCHA_BACKUP_KEY: 'a'.repeat(64),
      BOCHA_AUTO_BACKUP_ENABLED: 'false',
      BOCHA_AUTO_BACKUP_RETENTION: '4',
      BOCHA_AUTO_BACKUP_TIMEZONE: 'UTC',
    }).autoBackup,
  ).toEqual({ enabled: false, retention: 4, timezone: 'UTC' });
  expect(
    readServerConfig({ BOCHA_BACKUP_KEY: 'a'.repeat(64), BOCHA_AUTO_BACKUP_ENABLED: 'true' })
      .autoBackup.enabled,
  ).toBe(true);
});
it.each([
  ['BOCHA_AUTO_BACKUP_ENABLED', 'yes'],
  ['BOCHA_AUTO_BACKUP_ENABLED', '0'],
  ['BOCHA_AUTO_BACKUP_RETENTION', '0'],
  ['BOCHA_AUTO_BACKUP_RETENTION', '-1'],
  ['BOCHA_AUTO_BACKUP_RETENTION', '1.5'],
  ['BOCHA_AUTO_BACKUP_RETENTION', '105'],
  ['BOCHA_AUTO_BACKUP_RETENTION', 'NaN'],
  ['BOCHA_AUTO_BACKUP_TIMEZONE', 'Buenos_Aires'],
  ['BOCHA_AUTO_BACKUP_TIMEZONE', 'Invalid/Zone'],
])('rejects invalid automatic backup configuration: %s=%s', (name, value) => {
  expect(() => readServerConfig({ BOCHA_BACKUP_KEY: 'a'.repeat(64), [name]: value })).toThrow(name);
});
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
