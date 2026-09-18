import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
const password = 'Prueba-Web-Bocha-2026!';
async function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-http-'));
  const runtime = new ServerRuntime({
    databasePath: join(directory, 'bocha.sqlite'),
    backupDirectory: join(directory, 'backups'),
    backupKey: randomBytes(32),
    appVersion: '0.1.0',
  });
  new AuthService(runtime.database).bootstrap({ username: 'jefe', name: 'Agus', password });
  const app = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    runtime,
  );
  return { app, runtime, directory };
}
it('cookies privadas, CSRF/origin y deny-default; bootstrap y rutas internas no públicos', async () => {
  const f = await fixture();
  try {
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/auth/bootstrap',
          headers: base,
          payload: {},
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/rpc/internal.authorize',
          headers: base,
          payload: {},
        })
      ).statusCode,
    ).toBe(404);
    expect((await f.app.inject({ url: '/api/v1/products', headers: base })).statusCode).toBe(401);
    const wrong = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { host: 'pos.test', origin: 'http://evil.test' },
      payload: { username: 'jefe', password },
    });
    expect(wrong.statusCode).toBe(403);
    const login = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: base,
      payload: { username: 'jefe', password },
    });
    expect(login.statusCode).toBe(200);
    expect(JSON.stringify(login.json())).not.toMatch(/sessionToken|password_hash/);
    const setCookie = login.headers['set-cookie'] as string;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
    const cookie = setCookie.split(';')[0]!;
    const csrf = login.json().value.csrfToken as string;
    const headers = { ...base, cookie, 'x-csrf-token': csrf };
    expect((await f.app.inject({ url: '/api/v1/products?limit=20', headers })).statusCode).toBe(
      200,
    );
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/products',
          headers: { ...base, cookie },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/products',
          headers: { ...headers, origin: 'http://pos.test.evil.test' },
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/products',
          headers,
          payload: { name: 'Injected', unexpected: 'x' },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await f.app.inject({ method: 'POST', url: '/api/v1/sales', headers, payload: {} }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/auth/logout',
          headers,
          payload: { extra: true },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await f.app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers, payload: {} }))
        .statusCode,
    ).toBe(200);
    expect((await f.app.inject({ url: '/api/v1/products?limit=20', headers })).statusCode).toBe(
      401,
    );
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
it('roles web: vendedor solo caja; supervisor gestiona stock; jefe crea usuarios', async () => {
  const f = await fixture();
  try {
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    const login = async (username: string) => {
      const r = await f.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: base,
        payload: { username, password },
      });
      expect(r.statusCode).toBe(200);
      return {
        ...base,
        cookie: (r.headers['set-cookie'] as string).split(';')[0]!,
        'x-csrf-token': r.json().value.csrfToken,
      };
    };
    const owner = await login('jefe');
    for (const [username, role] of [
      ['seller', 'SELLER'],
      ['supervisor', 'SUPERVISOR'],
    ]) {
      expect(
        (
          await f.app.inject({
            method: 'POST',
            url: '/api/v1/users',
            headers: owner,
            payload: { username, name: username, role, active: true, password },
          })
        ).statusCode,
      ).toBe(200);
    }
    const seller = await login('seller'),
      supervisor = await login('supervisor');
    expect((await f.app.inject({ url: '/api/v1/products', headers: seller })).statusCode).toBe(200);
    expect(
      (await f.app.inject({ url: '/api/v1/checkout/draft', headers: seller })).statusCode,
    ).toBe(200);
    for (const path of ['stock', 'users', 'backups', 'dashboard/monthly?month=2026-09', 'sales'])
      expect((await f.app.inject({ url: '/api/v1/' + path, headers: seller })).statusCode).toBe(
        403,
      );
    expect((await f.app.inject({ url: '/api/v1/stock', headers: supervisor })).statusCode).toBe(
      200,
    );
    expect(
      (await f.app.inject({ url: '/api/v1/dashboard/monthly?month=2026-09', headers: supervisor }))
        .statusCode,
    ).toBe(403);
    expect((await f.app.inject({ url: '/api/v1/users', headers: supervisor })).statusCode).toBe(
      403,
    );
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
}, 10000);
it('seguridad producción, no origen wildcard, límites de login e inyección de proxy no confiado', async () => {
  const f = await fixture();
  try {
    const headers = { host: 'pos.test', origin: 'http://pos.test', 'x-forwarded-for': '1.2.3.4' };
    for (let i = 0; i < 6; i++)
      await f.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers,
        payload: { username: 'intruso' + i, password: 'incorrecta' },
      });
    const blocked = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { ...headers, 'x-forwarded-for': '8.8.8.8' },
      payload: { username: 'jefe', password },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.headers['x-content-type-options']).toBe('nosniff');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    expect(blocked.body).not.toContain('stack');
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
