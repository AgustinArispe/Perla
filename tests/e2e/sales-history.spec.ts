import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';
import { signIn } from './auth-helper';
test('Caja con scanner, peso, descuento y mixto conecta Histórico y stock', async () => {
  test.setTimeout(60000);
  const directory = mkdtempSync(join(tmpdir(), 'bocha-caja-'));
  const application = await electron.launch({
    ...(process.env.BOCHA_E2E_EXECUTABLE
      ? { executablePath: process.env.BOCHA_E2E_EXECUTABLE }
      : { args: ['.'] }),
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined),
      ),
      BOCHA_TEST_USER_DATA: directory,
    },
  });
  try {
    const page = await application.firstWindow();
    await signIn(page);
    const ids = await page.evaluate(async () => {
      const ids: string[] = [];
      for (const [sku, barcode, name, unit, price, quantity] of [
        ['U', '00123', 'Leche', 'UNIT', 1000, 10],
        ['K', '00456', 'Jamón', 'KG', 1200000, 1000],
      ] as const) {
        const p = await window.bocha!.products.save({
          sku,
          barcode,
          name,
          saleUnit: unit,
          priceCents: price,
          category: null,
          active: true,
          trackStock: true,
          minStockBase: 1,
        });
        if (!p.ok) throw new Error(p.error.message);
        const opening = await window.bocha!.stock.opening({
          productId: p.value.id,
          countedBase: quantity,
          expectedRevision: 0,
          expectedProductRevision: 1,
          operationKey: crypto.randomUUID(),
          reason: 'Conteo',
        });
        if (!opening.ok) throw new Error(opening.error.message);
        ids.push(p.value.id);
      }
      return ids;
    });
    await expect(page.getByRole('button', { name: 'Caja', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Caja', exact: true }).click();
    const scan = page.getByLabel('Escanear código', { exact: true });
    await expect(scan).toBeFocused();
    for (let i = 0; i < 2; i++) {
      await page.keyboard.type('00123');
      await page.keyboard.press('Enter');
    }
    await expect(
      page.getByRole('row').filter({ hasText: 'Leche' }).getByText('2', { exact: true }),
    ).toBeVisible();
    await page.keyboard.type('00456');
    await page.keyboard.press('Enter');
    const weight = page.getByRole('dialog');
    await expect(weight.getByRole('heading', { name: 'Peso de Jamón', exact: true })).toBeVisible();
    await weight.getByLabel('Peso', { exact: true }).fill('250');
    await page.keyboard.press('Enter');
    await expect(weight).not.toBeVisible();
    await expect(scan).toBeFocused();
    await page.keyboard.press('F4');
    const discount = page.getByRole('dialog');
    await discount.getByLabel('Tipo de descuento', { exact: true }).selectOption('PERCENT');
    await discount.getByLabel('Valor del descuento', { exact: true }).fill('10');
    await discount.getByRole('button', { name: 'Aplicar descuento', exact: true }).click();
    await page.keyboard.press('F8');
    const payment = page.getByRole('dialog');
    await expect(payment.getByRole('heading', { name: 'Cobrar venta', exact: true })).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(payment).toBeVisible();
    await payment.getByLabel('Importe aplicado 1', { exact: true }).fill('1718');
    await payment.getByLabel('Efectivo recibido 1', { exact: true }).fill('2000');
    await payment.getByRole('button', { name: 'Agregar medio de pago', exact: true }).click();
    await payment.getByLabel('Medio de pago 2', { exact: true }).selectOption('DEBIT');
    await payment.getByLabel('Importe aplicado 2', { exact: true }).fill('1000');
    await page.keyboard.press('F8');
    await expect(payment).not.toBeVisible();
    await expect(page.getByText('Venta guardada · N.º 1', { exact: true })).toBeVisible();
    await expect(scan).toBeFocused();
    const balances = await page.evaluate(
      async (ids) => Promise.all(ids.map((id) => window.bocha!.stock.get(id))),
      ids,
    );
    expect(balances[0]).toMatchObject({ ok: true, value: { quantityBase: 8 } });
    expect(balances[1]).toMatchObject({ ok: true, value: { quantityBase: 750 } });
    await page.evaluate(async (id) => {
      const result = await window.bocha!.products.get(id);
      if (!result.ok) throw new Error(result.error.message);
      const p = result.value;
      const saved = await window.bocha!.products.save({
        id: p.id,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        saleUnit: p.saleUnit,
        active: p.active,
        trackStock: p.trackStock,
        minStockBase: p.minStockBase,
        name: 'Jamón nuevo',
        priceCents: 1500000,
        expectedRevision: p.revision,
      });
      if (!saved.ok) throw new Error(saved.error.message);
    }, ids[1]!);
    await page.getByRole('button', { name: 'Histórico', exact: true }).click();
    await page.getByLabel('Desde', { exact: true }).fill('2099-01-01');
    await expect(page.getByRole('button', { name: 'Ver venta 1', exact: true })).not.toBeVisible();
    await page.getByLabel('Desde', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Ver venta 1', exact: true }).click();
    const detail = page.getByRole('dialog');
    await expect(detail.getByText('Jamón', { exact: true })).toBeVisible();
    await expect(detail.getByText('Jefe de prueba', { exact: true })).toBeVisible();
    await detail.getByRole('button', { name: 'Anular venta', exact: true }).click();
    await detail
      .getByLabel('Motivo de anulación', { exact: true })
      .fill('Venta de prueba equivocada');
    await detail.getByRole('button', { name: 'Confirmar anulación', exact: true }).click();
    await expect(detail.getByText('Anulada', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        async (ids) => Promise.all(ids.map((id) => window.bocha!.stock.get(id))),
        ids,
      ),
    ).toMatchObject([
      { ok: true, value: { quantityBase: 10 } },
      { ok: true, value: { quantityBase: 1000 } },
    ]);
    if (!process.env.BOCHA_E2E_EXECUTABLE) await page.screenshot({ path: 'tmp/sales-history.png' });
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Caja', exact: true }).click();
    await expect(scan).toBeFocused();
    for (let i = 0; i < 100; i++) {
      await page.keyboard.type('00123');
      await page.keyboard.press('Enter');
    }
    await expect(
      page.getByRole('button', { name: 'Cambiar cantidad de Leche', exact: true }),
    ).toHaveText('100');
    await page.keyboard.press('F4');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(scan).toBeFocused();
    await page.getByRole('button', { name: 'Cambiar cantidad de Leche', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Cantidad', { exact: true }).fill('3');
    await page.keyboard.press('Enter');
    await expect(scan).toBeFocused();
    await page.getByRole('button', { name: 'Productos', exact: true }).click();
    await page.getByRole('button', { name: 'Caja', exact: true }).click();
    await page.getByRole('button', { name: 'Recuperar carrito', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Cambiar cantidad de Leche', exact: true }),
    ).toHaveText('3');
    await page.getByRole('button', { name: 'Cancelar venta en curso', exact: true }).click();
    await page.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
    await expect(page.getByText('Empezá una venta', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => window.bocha!.checkout.getDraft())).toMatchObject({
      ok: true,
      value: null,
    });
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
