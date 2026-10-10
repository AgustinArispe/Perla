import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { expect, test } from 'vitest';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import type { ExcelPreview } from '../../src/shared/excel';

test('Excel incluye todas las páginas filtradas, importes numéricos y códigos como texto', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pos-xlsx-'));
  const runtime = new ServerRuntime({
    databasePath: join(dir, 'pos.sqlite'),
    backupDirectory: join(dir, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  });
  try {
    const auth = new AuthService(runtime.database);
    const grant = auth.bootstrap({
      name: 'Jefe',
      username: 'jefe',
      password: 'Prueba-Excel-2026!',
    });
    const app = new Application(runtime.database, auth);
    for (let i = 0; i < 105; i++)
      app.dispatch(
        'products.save',
        {
          sku: `EXCEL-${i}`,
          barcode: null,
          category: null,
          name: `Prueba Excel ${String(i).padStart(3, '0')}`,
          saleUnit: 'UNIT',
          priceCents: 12345,
          active: true,
          trackStock: false,
          minStockBase: 0,
        },
        grant.sessionToken,
      );
    runtime.database
      .prepare("UPDATE products SET barcode='0012345678905',name='=SUM(1)' WHERE sku='EXCEL-0'")
      .run();
    const result = await runtime.request(
      'exports.excel',
      { dataset: 'products', filters: { query: '', status: 'ALL' } },
      grant.sessionToken,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((result.value as { content: Buffer }).content as never);
    const sheet = workbook.getWorksheet('Productos')!;
    expect(sheet.rowCount).toBe(106);
    expect(sheet.getCell('A2').value).toBe('=SUM(1)');
    expect(sheet.getCell('C2').value).toBe('0012345678905');
    expect(sheet.getCell('G2').value).toBe(123.45);
    expect(sheet.views[0]?.state).toBe('frozen');
    expect(workbook.getWorksheet('Filtros')).toBeTruthy();
    expect(workbook.creator).toBe('Perla');
    expect(workbook.getWorksheet('Perla')!.getCell('D2').value).toBe('Perla');
    expect(workbook.getWorksheet('Perla')!.getImages()).toHaveLength(1);
    const request = { dataset: 'products', filters: { status: 'ALL' } };
    const selectedProducts = runtime.database
      .prepare("SELECT id FROM products WHERE sku IN ('EXCEL-1','EXCEL-54') ORDER BY sku")
      .all() as { id: string }[];
    const fromList = await runtime.request(
      'exports.excel',
      {
        dataset: 'products',
        filters: {},
        selectedIds: selectedProducts.map(({ id }) => id),
      },
      grant.sessionToken,
    );
    if (!fromList.ok) throw new Error(fromList.error.message);
    const listBook = new ExcelJS.Workbook();
    await listBook.xlsx.load((fromList.value as { content: Buffer }).content as never);
    expect(listBook.getWorksheet('Productos')!.getColumn(1).values.filter(Boolean)).toEqual([
      'Producto',
      'Prueba Excel 001',
      'Prueba Excel 054',
    ]);
    for (const selectedIds of [
      [],
      [selectedProducts[0]!.id, selectedProducts[0]!.id],
      [randomUUID()],
    ]) {
      expect(
        (
          await runtime.request(
            'exports.excel',
            { dataset: 'products', filters: {}, selectedIds },
            grant.sessionToken,
          )
        ).ok,
      ).toBe(false);
    }
    const first = await runtime.request(
      'exports.preview',
      { request, page: { sheet: 0, offset: 0, limit: 50 } },
      grant.sessionToken,
    );
    const second = await runtime.request(
      'exports.preview',
      { request, page: { sheet: 0, offset: 50, limit: 50 } },
      grant.sessionToken,
    );
    if (!first.ok || !second.ok) throw new Error('Falló la vista previa');
    const page1 = first.value as ExcelPreview;
    const page2 = second.value as ExcelPreview;
    expect(page1.total).toBe(105);
    const selection = [page1.items[2]!.key, page2.items[4]!.key];
    const chosen = await runtime.request(
      'exports.excel',
      { ...request, selection },
      grant.sessionToken,
    );
    if (!chosen.ok) throw new Error(chosen.error.message);
    const chosenBook = new ExcelJS.Workbook();
    await chosenBook.xlsx.load((chosen.value as { content: Buffer }).content as never);
    const chosenSheet = chosenBook.getWorksheet('Productos')!;
    expect(chosenSheet.rowCount).toBe(3);
    expect(chosenSheet.getColumn(1).values).toContain(page1.items[2]!.cells[0]);
    expect(chosenSheet.getColumn(1).values).toContain(page2.items[4]!.cells[0]);
    expect(chosenBook.getWorksheet('Filtros')!.getColumn(2).values).toContain(
      'Solo filas seleccionadas',
    );
    for (const selection of [[], ['0'.repeat(64)], [page1.items[2]!.key, page1.items[2]!.key]])
      expect(
        (await runtime.request('exports.excel', { ...request, selection }, grant.sessionToken)).ok,
      ).toBe(false);
    expect(
      (
        await runtime.request(
          'exports.excel',
          { dataset: 'stock', filters: {}, selection },
          grant.sessionToken,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'exports.excel',
          { ...request, filters: { query: 'No coincide' }, selection },
          grant.sessionToken,
        )
      ).ok,
    ).toBe(false);
    runtime.database.prepare("UPDATE products SET price_cents=12346 WHERE sku='EXCEL-2'").run();
    expect(
      (await runtime.request('exports.excel', { ...request, selection }, grant.sessionToken)).ok,
    ).toBe(false);
    runtime.database.prepare("UPDATE products SET price_cents=12345 WHERE sku='EXCEL-2'").run();
    const filtered = await runtime.request(
      'exports.excel',
      { dataset: 'products', filters: { query: 'Excel 001', status: 'ALL' } },
      grant.sessionToken,
    );
    expect(filtered.ok).toBe(true);
    if (filtered.ok) {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load((filtered.value as { content: Buffer }).content as never);
      expect(book.getWorksheet('Productos')!.rowCount).toBe(2);
    }
    const multiProducts = ['A', 'B', 'C'].map(
      (category, index) =>
        app.dispatch(
          'products.save',
          {
            sku: `MULTI-${index}`,
            barcode: null,
            category: `Categoría ${category}`,
            brand: index === 2 ? 'Marca excluida' : 'Marca elegida',
            name: `Multifiltro ${category}`,
            saleUnit: 'UNIT',
            priceCents: 10000,
            active: index !== 1,
            trackStock: false,
            minStockBase: 0,
          },
          grant.sessionToken,
        ) as { categoryId: string; brandId: string },
    );
    const multi = await runtime.request(
      'exports.excel',
      {
        dataset: 'products',
        filters: {
          query: 'Multifiltro',
          categoryIds: [multiProducts[0]!.categoryId, multiProducts[1]!.categoryId],
          brandIds: [multiProducts[0]!.brandId],
          statuses: ['ACTIVE', 'INACTIVE'],
        },
      },
      grant.sessionToken,
    );
    expect(multi.ok).toBe(true);
    if (multi.ok) {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load((multi.value as { content: Buffer }).content as never);
      expect(book.getWorksheet('Productos')!.rowCount).toBe(3);
      expect(book.getWorksheet('Productos')!.getColumn(1).values).toContain('Multifiltro B');
      expect(book.getWorksheet('Filtros')!.getColumn(2).values).toContain(
        'Categoría A, Categoría B',
      );
    }
    for (const filters of [
      { statuses: ['BOGUS'] },
      { statuses: ['ACTIVE', 'ACTIVE'] },
      { categoryIds: [multiProducts[0]!.categoryId], categoryId: multiProducts[0]!.categoryId },
    ]) {
      expect(
        (
          await runtime.request(
            'exports.excel',
            { dataset: 'products', filters },
            grant.sessionToken,
          )
        ).ok,
      ).toBe(false);
    }
    const supervisor = auth.saveUser(grant.sessionToken, {
      name: 'Supervisor',
      username: 'supervisor',
      password: 'Prueba-Super-2026!',
      role: 'SUPERVISOR',
      active: true,
    });
    const login = auth.login({ username: supervisor.username, password: 'Prueba-Super-2026!' });
    expect(
      (
        await runtime.request(
          'exports.preview',
          { request: { dataset: 'users', filters: {} } },
          login.sessionToken,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'exports.preview',
          { request: { dataset: 'products', filters: {} } },
          null,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'exports.excel',
          { dataset: 'dashboard', filters: { month: '2026-10' } },
          login.sessionToken,
        )
      ).ok,
    ).toBe(false);
    expect(
      (
        await runtime.request(
          'exports.excel',
          { dataset: 'products', filters: { status: 'ALL' } },
          login.sessionToken,
        )
      ).ok,
    ).toBe(true);
    expect(
      (
        await runtime.request(
          'exports.excel',
          { dataset: 'products', filters: { unknown: 'x' } },
          grant.sessionToken,
        )
      ).ok,
    ).toBe(false);
    const exportedUsers = await runtime.request(
      'exports.excel',
      { dataset: 'users', filters: { query: 'supervisor', role: 'SUPERVISOR', status: 'ACTIVE' } },
      grant.sessionToken,
    );
    expect(exportedUsers.ok).toBe(true);
    if (exportedUsers.ok) {
      const usersBook = new ExcelJS.Workbook();
      await usersBook.xlsx.load((exportedUsers.value as { content: Buffer }).content as never);
      const usersSheet = usersBook.getWorksheet('Usuarios')!;
      expect(usersSheet.rowCount).toBe(2);
      expect(usersSheet.getCell('B2').value).toBe('supervisor');
      expect(usersSheet.getCell('C2').value).toBe('Supervisor');
      expect(usersSheet.getRow(1).values).not.toContain('Contraseña');
    }
    expect(
      (
        await runtime.request(
          'exports.excel',
          { dataset: 'users', filters: {} },
          login.sessionToken,
        )
      ).ok,
    ).toBe(false);
    const multipleRoles = await runtime.request(
      'exports.excel',
      {
        dataset: 'users',
        filters: { roles: ['OWNER', 'SUPERVISOR'], statuses: ['ACTIVE', 'INACTIVE'] },
      },
      grant.sessionToken,
    );
    expect(multipleRoles.ok).toBe(true);
    if (multipleRoles.ok) {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load((multipleRoles.value as { content: Buffer }).content as never);
      expect(book.getWorksheet('Usuarios')!.rowCount).toBe(3);
    }
    const denied = await runtime.request(
      'exports.excel',
      { dataset: 'promotions', filters: {} },
      grant.sessionToken,
    );
    expect(denied.ok).toBe(false);
    runtime.database.prepare('UPDATE business_features SET enabled=1').run();
    const mainLocation = (
      app.dispatch('locations.list', {}, grant.sessionToken) as { id: string; name: string }[]
    )[0]!;
    const depot = app.dispatch(
      'locations.save',
      { name: 'Depósito QA', code: 'DEPOT', active: true },
      grant.sessionToken,
    ) as { id: string };
    const inventoryProduct = app.dispatch(
      'products.save',
      {
        sku: 'INVENTORY-QA',
        barcode: null,
        category: null,
        name: 'Inventario QA',
        saleUnit: 'UNIT',
        priceCents: 100,
        active: true,
        trackStock: true,
        minStockBase: 1,
      },
      grant.sessionToken,
    ) as { id: string; revision: number };
    app.dispatch(
      'stock.opening',
      {
        productId: inventoryProduct.id,
        countedBase: 10,
        expectedRevision: 0,
        expectedProductRevision: inventoryProduct.revision,
        reason: 'Conteo QA',
        operationKey: randomUUID(),
      },
      grant.sessionToken,
    );
    const inventories = await runtime.request(
      'exports.excel',
      {
        dataset: 'inventory',
        filters: { locationIds: [mainLocation.id, depot.id], query: 'Inventario QA' },
      },
      grant.sessionToken,
    );
    expect(inventories.ok).toBe(true);
    if (inventories.ok) {
      const book = new ExcelJS.Workbook();
      await book.xlsx.load((inventories.value as { content: Buffer }).content as never);
      expect(book.getWorksheet('Existencias')!.rowCount).toBe(3);
      expect(book.getWorksheet('Existencias')!.getColumn(1).values).toContain('Depósito QA');
      expect(book.getWorksheet('Existencias')!.getColumn(1).values).toContain(mainLocation.name);
    }
    for (const dataset of [
      'promotions',
      'customers',
      'suppliers',
      'transfers',
      'dashboard',
      'profitability',
      'payments',
      'ranking',
      'lowStock',
      'locations',
      'comparison',
    ]) {
      const result = await runtime.request(
        'exports.excel',
        { dataset, filters: {} },
        grant.sessionToken,
      );
      expect(result.ok, result.ok ? dataset : result.error.message).toBe(true);
      const preview = await runtime.request(
        'exports.preview',
        { request: { dataset, filters: {} } },
        grant.sessionToken,
      );
      expect(preview.ok, preview.ok ? dataset : preview.error.message).toBe(true);
    }
    const simultaneous = await Promise.all([
      runtime.request('exports.excel', { dataset: 'products', filters: {} }, grant.sessionToken),
      runtime.request('exports.excel', { dataset: 'products', filters: {} }, grant.sessionToken),
    ]);
    expect(simultaneous[0]!.ok).toBe(true);
    expect(simultaneous[1]!.ok).toBe(false);
    const server = await createServer(
      { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
      runtime,
    );
    try {
      const base = { host: 'pos.test', origin: 'http://pos.test' };
      const login = await server.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: base,
        payload: { username: 'jefe', password: 'Prueba-Excel-2026!' },
      });
      const headers = { ...base, cookie: (login.headers['set-cookie'] as string).split(';')[0]! };
      const payload = { dataset: 'products', filters: { query: 'Excel 001' } };
      expect(
        (await server.inject({ method: 'POST', url: '/api/v1/exports/excel', headers, payload }))
          .statusCode,
      ).toBe(403);
      expect(
        (
          await server.inject({
            method: 'POST',
            url: '/api/v1/exports/excel',
            headers: base,
            payload,
          })
        ).statusCode,
      ).toBe(403);
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/exports/excel',
        headers: { ...headers, 'x-csrf-token': login.json().value.csrfToken },
        payload,
      });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('spreadsheetml');
      const book = new ExcelJS.Workbook();
      await book.xlsx.load(response.rawPayload as never);
      expect(book.getWorksheet('Productos')!.rowCount).toBe(2);
    } finally {
      await server.close();
    }
  } finally {
    runtime.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
