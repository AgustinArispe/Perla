import { describe, expect, it } from 'vitest';
import { validateRequest, isTrustedSender } from '../../src/shared/requests';
import { normalizeError } from '../../src/shared/errors';

describe('frontera IPC', () => {
  it('rechaza operaciones desconocidas, payloads inválidos y campos adicionales', () => {
    expect(() =>
      validateRequest({ operation: 'executeSql', payload: { sql: 'DROP TABLE products' } }),
    ).toThrow();
    expect(() =>
      validateRequest({ operation: 'system.health', payload: { path: 'C:/secret' } }),
    ).toThrow();
    expect(() =>
      validateRequest({ operation: 'products.findByBarcode', payload: { barcode: 123 } }),
    ).toThrow();
    expect(validateRequest({ operation: 'system.health', payload: null })).toEqual({
      operation: 'system.health',
      payload: null,
    });
  });
  it('permite sólo la ventana principal de la app, nunca iframes ni otros orígenes', () => {
    const file = 'file:///C:/app/index.html';
    expect(isTrustedSender(file, true, file)).toBe(true);
    expect(isTrustedSender(file, false, file)).toBe(false);
    expect(isTrustedSender('file:///C:/app/other.html', true, file)).toBe(false);
    expect(isTrustedSender('http://127.0.0.1:5174/', true, file, 'http://127.0.0.1:5174')).toBe(
      true,
    );
    expect(isTrustedSender('http://127.0.0.1:5175/', true, file, 'http://127.0.0.1:5174')).toBe(
      false,
    );
    expect(isTrustedSender('invalid url', true, file)).toBe(false);
  });
  it('no muestra fallos SQLite como éxitos ni filtra rutas internas', () => {
    expect(
      normalizeError({ code: 'SQLITE_FULL', message: 'C:/private/bocha.sqlite' }),
    ).toMatchObject({ code: 'DISK_FULL', retryable: true });
    expect(normalizeError({ code: 'SQLITE_BUSY' })).toMatchObject({
      code: 'DB_BUSY',
      retryable: true,
    });
    expect(normalizeError(new Error('C:/private/bocha.sqlite')).message).not.toContain('private');
  });
});
