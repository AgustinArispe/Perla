import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import ExcelJS from 'exceljs';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';

test('control web exige perfil, exportar no ejecuta mutaciones y XLSX conserva filtros', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'perla-control-api-'));
  const runtime = new ServerRuntime({
    databasePath: join(dir, 'pos.sqlite'),
    backupDirectory: join(dir, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  });
  try {
    const auth = new AuthService(runtime.database);
    const owner = auth.bootstrap({
      name: 'Jefe',
      username: 'jefe',
      password: 'Prueba-Control-2026!',
    });
    const seller = auth.saveUser(owner.sessionToken, {
      name: 'Caja',
      username: 'caja',
      password: 'Prueba-Control-2026!',
      role: 'SELLER',
      active: true,
    });
    const supervisor = auth.saveUser(owner.sessionToken, {
      name: 'Supervisor',
      username: 'super',
      password: 'Prueba-Control-2026!',
      role: 'SUPERVISOR',
      active: true,
    });
    const sellerGrant = auth.login({ username: seller.username, password: 'Prueba-Control-2026!' });
    const superGrant = auth.login({
      username: supervisor.username,
      password: 'Prueba-Control-2026!',
    });
    const app = new Application(runtime.database, auth);
    runtime.database
      .prepare("UPDATE business_features SET enabled=1 WHERE feature_key='COSTS_MARGIN'")
      .run();
    app.dispatch(
      'products.save',
      {
        sku: 'CONTROL',
        name: 'Producto control',
        barcode: null,
        category: null,
        saleUnit: 'UNIT',
        priceCents: 12345,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      owner.sessionToken,
    );
    expect(
      (await runtime.request('control.execute', { area: 'workspace', action: 'home' }, null)).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'control.execute',
          { area: 'workspace', action: 'home' },
          sellerGrant.sessionToken,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'control.execute',
          { area: 'commercial', action: 'prices' },
          superGrant.sessionToken,
        )
      ).ok,
    ).toBe(false);
    const mutation = {
      area: 'workspace',
      action: 'saveView',
      input: { name: 'Nunca crear', module: 'products', filters: {} },
    };
    expect((await runtime.request('control.export', mutation, owner.sessionToken)).ok).toBe(false);
    expect(runtime.database.prepare('SELECT COUNT(*) n FROM saved_views').get()).toEqual({ n: 0 });
    const result = await runtime.request(
      'control.export',
      { area: 'commercial', action: 'export', input: { view: 'prices', filters: { days: 90 } } },
      owner.sessionToken,
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result).toMatchObject({ ok: true });
    const file = result.value as { base64: string; filename: string };
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(file.base64, 'base64') as never);
    expect(file.filename).toMatch(/\.xlsx$/);
    expect(workbook.worksheets[0]!.getRow(2).values).toContain('Producto control');
    expect(workbook.getWorksheet('Filtros')!.getColumn(2).values).toContain('90');
    const before = runtime.database.prepare('SELECT COUNT(*) n FROM control_audit_details').get();
    await runtime.request(
      'control.export',
      { area: 'commercial', action: 'export', input: { view: 'prices', filters: { days: 90 } } },
      owner.sessionToken,
    );
    expect(runtime.database.prepare('SELECT COUNT(*) n FROM control_audit_details').get()).toEqual(
      before,
    );
  } finally {
    runtime.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
