import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';
import { signIn, testPassword } from './auth-helper';
test('jefe consulta neto y pagos aplicados; supervisor y vendedor no pueden consultarlos', async () => {
  test.setTimeout(60000);
  const directory = mkdtempSync(join(tmpdir(), 'bocha-dashboard-'));
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
    const sale = await page.evaluate(async () => {
      const p = await window.bocha!.products.save({
        sku: 'U',
        barcode: '001',
        name: 'Leche',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 100000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      });
      if (!p.ok) throw new Error(p.error.message);
      const sale = await window.bocha!.sales.complete({
        checkoutKey: crypto.randomUUID(),
        lines: [
          {
            lineId: crypto.randomUUID(),
            productId: p.value.id,
            quantityBase: 2,
            expectedPriceCents: 100000,
            expectedProductRevision: 1,
          },
        ],
        discount: { type: 'PERCENT', basisPoints: 1000 },
        payments: [
          { method: 'CASH', amountCents: 80000, tenderedCents: 100000 },
          { method: 'CREDIT', amountCents: 100000 },
        ],
      });
      if (!sale.ok) throw new Error(sale.error.message);
      return sale.value;
    });
    await expect(page.getByRole('button', { name: 'Resultados', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Resultados', exact: true }).click();
    await page.getByLabel('Mes', { exact: true }).fill(sale.localMonth);
    await expect(page.getByTestId('monthly-net')).toHaveText('$ 1.800,00');
    await expect(page.locator('[data-payment=CREDIT]')).toContainText('$ 1.000,00');
    await expect(page.getByRole('button', { name: /Ver inventario actual/ })).toBeVisible();
    if (!process.env.BOCHA_E2E_EXECUTABLE)
      await page.screenshot({ path: 'tmp/monthly-dashboard.png' });
    await page.getByLabel('Mes', { exact: true }).fill('2000-01');
    await expect(page.getByTestId('monthly-net')).toHaveText('$ 0,00');
    await expect(page.getByText('Sin base de comparación', { exact: true })).toBeVisible();
    await page.evaluate(async (id) => {
      const result = await window.bocha!.sales.void({
        saleId: id,
        operationKey: crypto.randomUUID(),
        reason: 'Prueba de reporte',
      });
      if (!result.ok) throw new Error(result.error.message);
    }, sale.id);
    await page.getByLabel('Mes', { exact: true }).fill(sale.localMonth);
    await expect(page.getByTestId('monthly-net')).toHaveText('$ 0,00');
    await page.getByText('Desglose de ventas', { exact: true }).click();
    await expect(page.getByTestId('monthly-voided')).toHaveText('$ 1.800,00');
    for (const role of ['SUPERVISOR', 'SELLER'] as const) {
      await page.evaluate(
        async ({ role, password }) => {
          const username = role.toLowerCase();
          const created = await window.bocha!.users.save({
            username,
            name: role,
            role,
            active: true,
            password,
          });
          if (!created.ok) throw new Error(created.error.message);
        },
        { role, password: testPassword },
      );
    }
    for (const username of ['supervisor', 'seller']) {
      await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
      await page.getByLabel('Usuario', { exact: true }).fill(username);
      await page.getByLabel('Contraseña', { exact: true }).fill(testPassword);
      await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
      await expect(
        page.getByRole('heading', {
          name: username === 'seller' ? 'Caja' : 'Productos',
          exact: true,
        }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Resultados', exact: true })).toHaveCount(0);
      expect(
        await page.evaluate((month) => window.bocha!.dashboard.monthly(month), sale.localMonth),
      ).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    }
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
