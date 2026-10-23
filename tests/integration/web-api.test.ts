import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
const password = 'Prueba-Web-Bocha-2026!';

it('producción entrega cookie __Host privada y segura, CSP estricta y protección de framing', async () => {
  const f = await fixture();
  const secure = await createServer(
    { origin: 'https://pos.test', production: true, trustProxy: false, logger: false },
    f.runtime,
  );
  try {
    const response = await secure.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { host: 'pos.test', origin: 'https://pos.test' },
      payload: { username: 'jefe', password },
    });
    expect(response.statusCode).toBe(200);
    const cookie = response.headers['set-cookie'] as string;
    expect(cookie).toMatch(/^__Host-bocha=[a-f0-9]{64};/);
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toContain('Domain=');
    expect(response.headers['strict-transport-security']).toContain('max-age=');
    expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
    const csp = String(response.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).toContain("object-src 'none'");
    expect(response.headers['cache-control']).toBe('no-store');
    expect(JSON.stringify(response.json())).not.toMatch(/password_hash|sessionToken/);
  } finally {
    await secure.close();
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});

it('filtros web de clientes, traslados y resumen por ubicación admiten parámetros válidos y rechazan extras', async () => {
  const f = await fixture();
  try {
    f.runtime.database
      .prepare(
        "UPDATE business_features SET enabled=1 WHERE feature_key IN ('CUSTOMERS','LOCATIONS_TRANSFERS')",
      )
      .run();
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    const login = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: base,
      payload: { username: 'jefe', password },
    });
    const headers = { ...base, cookie: (login.headers['set-cookie'] as string).split(';')[0]! };
    for (const url of [
      '/api/v1/customers?query=Maria&activeOnly=false&limit=30',
      '/api/v1/transfers?limit=30',
      '/api/v1/locations/summary?month=2026-10',
    ]) {
      const valid = await f.app.inject({ url, headers });
      expect(valid.statusCode, valid.body).toBe(200);
      const unexpected = await f.app.inject({ url: url + '&unexpected=true', headers });
      expect(unexpected.statusCode, unexpected.body).toBe(400);
    }
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
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
    expect(
      (
        await f.app.inject({
          method: 'POST',
          url: '/api/v1/auth/unlock-user',
          headers,
          payload: { username: 'jefe' },
        })
      ).statusCode,
    ).toBe(200);
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
it('distintas cuentas comparten red y un proxy no confiado no controla la IP', async () => {
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
    const validSharedNetwork = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: { ...headers, 'x-forwarded-for': '8.8.8.8' },
      payload: { username: 'jefe', password },
    });
    expect(validSharedNetwork.statusCode).toBe(200);
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
it('limita intentos de una misma cuenta y conserva cabeceras de seguridad', async () => {
  const f = await fixture();
  try {
    const headers = { host: 'pos.test', origin: 'http://pos.test', 'x-forwarded-for': '1.2.3.4' };
    for (let i = 0; i < 5; i++)
      await f.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers,
        payload: { username: 'intruso-repetido', password: 'incorrecta' },
      });
    const blocked = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers,
      payload: { username: 'intruso-repetido', password: 'incorrecta' },
    });
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json()).toMatchObject({
      ok: false,
      error: { code: 'AUTH_THROTTLED', retryable: true },
    });
    expect(blocked.headers['x-content-type-options']).toBe('nosniff');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
    expect(blocked.body).not.toContain('stack');
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
it('administrador del sistema conserva acceso a copias y administración web', async () => {
  const f = await fixture();
  try {
    f.runtime.database.prepare("UPDATE users SET system_admin=1 WHERE username='jefe'").run();
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    const login = await f.app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: base,
      payload: { username: 'jefe', password },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().value.user.role).toBe('ADMIN');
    const headers = {
      ...base,
      cookie: (login.headers['set-cookie'] as string).split(';')[0]!,
      'x-csrf-token': login.json().value.csrfToken,
    };
    expect((await f.app.inject({ url: '/api/v1/backups', headers })).statusCode).toBe(200);
    expect((await f.app.inject({ url: '/api/v1/users', headers })).statusCode).toBe(200);
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});

it('solo jefe o administrador cambia funciones y el estado se expone a usuarios autenticados', async () => {
  const f = await fixture();
  try {
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    const login = async (username: string) => {
      const response = await f.app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: base,
        payload: { username, password },
      });
      return {
        ...base,
        cookie: (response.headers['set-cookie'] as string).split(';')[0]!,
        'x-csrf-token': response.json().value.csrfToken as string,
      };
    };
    const owner = await login('jefe');
    await f.app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: owner,
      payload: {
        username: 'super',
        name: 'Supervisora',
        role: 'SUPERVISOR',
        active: true,
        password,
      },
    });
    const supervisor = await login('super');
    const current = await f.app.inject({
      url: '/api/v1/settings/features',
      headers: supervisor,
    });
    expect(current.statusCode).toBe(200);
    const input = current.json().value as { revision: number; enabled: Record<string, boolean> };
    expect(
      (
        await f.app.inject({
          method: 'PUT',
          url: '/api/v1/settings/features',
          headers: supervisor,
          payload: {
            expectedRevision: input.revision,
            enabled: { ...input.enabled, RECEIPTS: false },
          },
        })
      ).statusCode,
    ).toBe(403);
    const saved = await f.app.inject({
      method: 'PUT',
      url: '/api/v1/settings/features',
      headers: owner,
      payload: { expectedRevision: input.revision, enabled: { ...input.enabled, RECEIPTS: false } },
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().value.enabled.RECEIPTS).toBe(false);
    expect((await f.app.inject({ url: '/api/v1/receipts', headers: owner })).statusCode).toBe(403);
  } finally {
    await f.app.close();
    f.runtime.close();
    rmSync(f.directory, { recursive: true, force: true });
  }
});
