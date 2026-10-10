import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import ExcelJS from 'exceljs';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import type { ExcelPreview } from '../../src/shared/excel';
import type { ControlHome } from '../../src/shared/control';

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
    runtime.database
      .prepare(
        "UPDATE business_features SET enabled=1 WHERE feature_key IN ('MONTHLY_DASHBOARD','CUSTOMERS','SUPPLIER_ACCOUNTS')",
      )
      .run();
    runtime.database
      .prepare(
        'INSERT INTO terminals(id,name,active,revision,created_at_utc,updated_at_utc) VALUES(?,?,1,1,?,?)',
      )
      .run(randomUUID(), 'Caja de prueba', new Date().toISOString(), new Date().toISOString());
    const ownerHome = await runtime.request(
      'control.execute',
      { area: 'workspace', action: 'home' },
      owner.sessionToken,
    );
    if (!ownerHome.ok) throw new Error(ownerHome.error.message);
    const home = ownerHome.value as ControlHome;
    expect(home.overview?.today.saleCount).toBe(0);
    expect(home.overview?.week.netCents).toBe(0);
    expect(home.overview?.lastSaleDate).toBeNull();
    expect(home.accounts?.receivableCents).toBe(0);
    expect(home.registers.length).toBeGreaterThan(0);
    const day = home.overview!.businessDate;
    for (const [number, status, total] of [
      [1, 'COMPLETED', 12500],
      [2, 'COMPLETED', 7500],
      [3, 'VOIDED', 90000],
    ] as const) {
      runtime.database
        .prepare(
          `INSERT INTO sales(id,number,checkout_key,payload_hash,status,
        created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json)
        VALUES(?,?,?,?,?,?,?,?,?,0,?,'{}')`,
        )
        .run(
          randomUUID(),
          number,
          randomUUID(),
          'test',
          status,
          new Date().toISOString(),
          day,
          day.slice(0, 7),
          total,
          total,
        );
    }
    const populatedHome = await runtime.request(
      'control.execute',
      { area: 'workspace', action: 'home' },
      owner.sessionToken,
    );
    if (!populatedHome.ok) throw new Error(populatedHome.error.message);
    expect((populatedHome.value as ControlHome).overview).toMatchObject({
      today: { saleCount: 2, netCents: 20000, averageCents: 10000 },
      week: { saleCount: 2, netCents: 20000 },
      lastSaleDate: day,
    });
    const supervisorHome = await runtime.request(
      'control.execute',
      { area: 'workspace', action: 'home' },
      superGrant.sessionToken,
    );
    if (!supervisorHome.ok) throw new Error(supervisorHome.error.message);
    expect((supervisorHome.value as ControlHome).accounts).toBeNull();
    runtime.database
      .prepare("UPDATE business_features SET enabled=0 WHERE feature_key='MONTHLY_DASHBOARD'")
      .run();
    const disabledHome = await runtime.request(
      'control.execute',
      { area: 'workspace', action: 'home' },
      owner.sessionToken,
    );
    if (!disabledHome.ok) throw new Error(disabledHome.error.message);
    expect((disabledHome.value as ControlHome).overview).toBeNull();
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
    expect(workbook.getWorksheet('Productos')!.getRow(2).values).toContain('Producto control');
    expect(workbook.getWorksheet('Perla')!.getImages()).toHaveLength(1);
    expect(workbook.getWorksheet('Filtros')!.getColumn(2).values).toContain('90');
    const exportRequest = {
      area: 'commercial',
      action: 'export',
      input: { view: 'prices', filters: { days: 90 } },
    };
    const preview = await runtime.request(
      'control.exportPreview',
      exportRequest,
      owner.sessionToken,
    );
    if (!preview.ok) throw new Error(preview.error.message);
    const rows = preview.value as ExcelPreview;
    expect(rows.sheets.map((sheet) => sheet.name)).not.toContain('Filtros');
    const selected = await runtime.request(
      'control.export',
      { ...exportRequest, selection: [rows.items[0]!.key] },
      owner.sessionToken,
    );
    expect(selected.ok).toBe(true);
    expect(
      (await runtime.request('control.exportPreview', exportRequest, sellerGrant.sessionToken)).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'control.export',
          { ...exportRequest, selection: ['0'.repeat(64)] },
          owner.sessionToken,
        )
      ).ok,
    ).toBe(false);
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
