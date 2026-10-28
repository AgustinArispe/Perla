import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { expect, it } from 'vitest';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import type { Product } from '../../src/shared/catalog';
import type { SaleDetail } from '../../src/shared/sales';
it('exporta y previsualiza exactamente el Top elegido de productos o categorías', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'perla-ranking-export-'));
  const runtime = new ServerRuntime({
    databasePath: join(dir, 'pos.sqlite'),
    backupDirectory: join(dir, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  });
  try {
    const auth = new AuthService(runtime.database),
      grant = auth.bootstrap({ username: 'jefe', name: 'Jefe', password: 'Prueba-Ranking-2026!' });
    const app = new Application(runtime.database, auth);
    let month = '';
    for (let i = 0; i < 60; i++) {
      const product = app.dispatch(
        'products.save',
        {
          sku: `TOP-${i}`,
          name: `Artículo ${i}`,
          category: `Categoría ${i}`,
          barcode: null,
          saleUnit: 'UNIT',
          priceCents: (i + 1) * 100,
          active: true,
          trackStock: false,
          minStockBase: 0,
        },
        grant.sessionToken,
      ) as Product;
      const sale = app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 1,
              expectedProductRevision: product.revision,
              expectedPriceCents: product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          payments: [{ method: 'TRANSFER', amountCents: product.priceCents }],
        },
        grant.sessionToken,
      ) as SaleDetail;
      month = sale.localMonth;
    }
    for (const rank of ['revenue', 'categories'] as const)
      for (const topCount of [5, 10, 15, 25, 50] as const) {
        const request = { dataset: 'ranking', filters: { month, rank, topCount } };
        const preview = await runtime.request(
          'exports.preview',
          { request, page: { sheet: 0, offset: 0, limit: 100 } },
          grant.sessionToken,
        );
        expect(preview.ok).toBe(true);
        if (!preview.ok) throw new Error(preview.error.message);
        expect((preview.value as { sheets: { total: number }[] }).sheets[0]?.total).toBe(topCount);
        const result = await runtime.request('exports.excel', request, grant.sessionToken);
        if (!result.ok) throw new Error(result.error.message);
        const book = new ExcelJS.Workbook();
        await book.xlsx.load((result.value as { content: Buffer }).content as never);
        const sheet = book.getWorksheet(
          rank === 'categories' ? 'Categorías más vendidas' : 'Más vendidos',
        )!;
        expect(sheet.rowCount).toBe(topCount + 1);
        expect(sheet.getCell('A2').value).toBe(
          rank === 'categories' ? 'Categoría 59' : 'Artículo 59',
        );
        expect(sheet.getCell(`A${topCount + 1}`).value).toBe(
          `${rank === 'categories' ? 'Categoría' : 'Artículo'} ${60 - topCount}`,
        );
      }
  } finally {
    await runtime.close();
    rmSync(dir, { recursive: true, force: true });
  }
}, 30000);
