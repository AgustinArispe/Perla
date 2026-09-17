import { signIn } from './auth-helper';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';
test('backend IPC confirma, recupera tras reiniciar y anula una venta offline', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-sales-'));
  const env: Record<string, string> = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
  env.BOCHA_TEST_USER_DATA = directory;
  delete env.ELECTRON_RUN_AS_NODE;
  const launch = () =>
    electron.launch({
      ...(process.env.BOCHA_E2E_EXECUTABLE
        ? { executablePath: process.env.BOCHA_E2E_EXECUTABLE }
        : { args: ['.'] }),
      env,
    });
  let application = await launch();
  try {
    await application.context().setOffline(true);
    let page = await application.firstWindow();
    await signIn(page);
    await expect(page.getByText('Base de datos conectada', { exact: true })).toBeVisible();
    const saved = await page.evaluate(async () => {
      const api = window.bocha!;
      const p = await api.products.save({
        sku: 'SALE-IPC',
        barcode: '000123',
        name: 'Queso cremoso',
        priceCents: 1000000,
        saleUnit: 'KG',
        category: null,
        active: true,
        trackStock: true,
        minStockBase: 100,
      });
      if (!p.ok) throw new Error(p.error.message);
      const opening = await api.stock.opening({
        productId: p.value.id,
        countedBase: 1000,
        expectedRevision: 0,
        expectedProductRevision: 1,
        reason: 'Conteo inicial',
        operationKey: crypto.randomUUID(),
      });
      if (!opening.ok) throw new Error(opening.error.message);
      const input = {
        checkoutKey: crypto.randomUUID(),
        lines: [
          {
            lineId: crypto.randomUUID(),
            productId: p.value.id,
            quantityBase: 250,
            expectedProductRevision: opening.value.productRevision,
            expectedPriceCents: p.value.priceCents,
          },
        ],
        discount: { type: 'FIXED' as const, amountCents: 50000 },
        payments: [
          { method: 'DEBIT' as const, amountCents: 100000 },
          { method: 'CASH' as const, amountCents: 100000, tenderedCents: 150000 },
        ],
      };
      const sale = await api.sales.complete(input);
      if (!sale.ok) throw new Error(sale.error.message);
      const repeated = await api.sales.complete(input);
      return { sale: sale.value, repeated, productId: p.value.id, input };
    });
    expect(saved.sale.totalCents).toBe(200000);
    expect(saved.sale.payments[1]?.changeCents).toBe(50000);
    expect(saved.repeated).toMatchObject({ ok: true, value: { id: saved.sale.id } });
    await application.close();
    application = await launch();
    await application.context().setOffline(true);
    page = await application.firstWindow();
    await signIn(page);
    await expect(page.getByText('Base de datos conectada', { exact: true })).toBeVisible();
    const recovered = await page.evaluate(
      async ({ input, productId }) => ({
        sale: await window.bocha!.sales.findByCheckoutKey(input.checkoutKey),
        stock: await window.bocha!.stock.get(productId),
      }),
      saved,
    );
    expect(recovered.sale).toMatchObject({ ok: true, value: { id: saved.sale.id } });
    expect(recovered.stock).toMatchObject({ ok: true, value: { quantityBase: 750 } });
    const result = await page.evaluate(async ({ sale, productId }) => {
      const input = {
        saleId: sale.id,
        operationKey: crypto.randomUUID(),
        reason: 'Venta de prueba',
      };
      return {
        first: await window.bocha!.sales.void(input),
        second: await window.bocha!.sales.void(input),
        stock: await window.bocha!.stock.get(productId),
        history: await window.bocha!.sales.list({ limit: 20, status: 'VOIDED' }),
      };
    }, saved);
    expect(result.first).toMatchObject({ ok: true, value: { status: 'VOIDED' } });
    expect(result.second).toMatchObject({ ok: true, value: { id: saved.sale.id } });
    expect(result.stock).toMatchObject({ ok: true, value: { quantityBase: 1000 } });
    expect(result.history).toMatchObject({ ok: true, value: { total: 1 } });
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
