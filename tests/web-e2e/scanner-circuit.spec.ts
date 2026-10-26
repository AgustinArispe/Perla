import { openModule } from './navigation-helper';
import { expect, test, type Page } from '@playwright/test';

// USB HID readers deliver keyboard events, followed by their configured Enter suffix.
async function trigger(page: Page, code: string) {
  await page.keyboard.type(code, { delay: 0 });
  await page.keyboard.press('Enter');
}

test('lector USB simulado: ráfaga, demoras, errores, foco, borrador y cobro único', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  const fixture = await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    async function post(path: string, body: unknown, method = 'POST') {
      const response = await fetch('/api/v1' + path, {
        method,
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(path + ': ' + result.error.message);
      return result.value;
    }
    const features = (await (await fetch('/api/v1/settings/features')).json()).value;
    await post(
      '/settings/features',
      { expectedRevision: features.revision, enabled: { STOCK_CONTROL: true, RECEIPTS: true } },
      'PUT',
    );
    const terminal = await post('/terminals', { name: 'Caja lector USB', active: true });
    const ids = [];
    for (const [sku, name, barcode, active] of [
      ['HID-A', 'Arroz scanner', '0012345678905', true],
      ['HID-B', 'Leche scanner', '7799900080048', true],
      ['HID-INACTIVE', 'Artículo inactivo scanner', '7799900080055', false],
    ] as const) {
      const product = await post('/products', {
        sku,
        name,
        barcode,
        category: null,
        saleUnit: 'UNIT',
        priceCents: 100000,
        active,
        trackStock: true,
        minStockBase: 1,
      });
      await post('/stock/opening', {
        productId: product.id,
        operationKey: crypto.randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
        countedBase: 100,
        reason: 'Stock prueba scanner',
      });
      ids.push(product.id);
    }
    return { terminalId: terminal.id, ids };
  });
  await page.reload();
  await openModule(page, 'Caja');
  await page
    .getByRole('combobox', { name: 'Terminal', exact: true })
    .selectOption(fixture.terminalId);
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('10000');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  const scanner = page.getByLabel('Escanear código', { exact: true });
  await expect(scanner).toBeFocused();

  let releaseLookup: () => void = () => {};
  const delayedLookup = new Promise<void>((resolve) => {
    releaseLookup = resolve;
  });
  await page.route(
    '**/api/v1/barcodes/0012345678905',
    async (route) => {
      await delayedLookup;
      await route.continue();
    },
    { times: 1 },
  );
  try {
    for (let n = 0; n < 12; n++)
      await trigger(page, n % 3 === 0 ? '7799900080048' : '0012345678905');
  } finally {
    releaseLookup();
  }
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true }),
  ).toHaveText('8');
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Leche scanner', exact: true }),
  ).toHaveText('4');
  await expect(page.locator('.checkout-total')).toContainText('12.000');
  await expect(scanner).toHaveValue('');
  await expect(scanner).toBeFocused();
  await trigger(page, 'NO-EXISTE-USB');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(scanner).toBeFocused();
  await trigger(page, '7799900080055');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.checkout-lines tbody tr')).toHaveCount(2);

  await page.route(
    '**/api/v1/barcodes/HID-SIN-RED',
    (route) => route.abort('internetdisconnected'),
    { times: 1 },
  );
  await trigger(page, 'HID-SIN-RED');
  await expect(page.getByRole('alert')).toContainText('conexión');
  await expect(scanner).toBeFocused();
  await trigger(page, '0012345678905');
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true }),
  ).toHaveText('9');
  await page.keyboard.press('Enter');
  await expect(page.locator('.checkout-lines tbody tr')).toHaveCount(2);

  await page.keyboard.press('F3');
  const search = page.getByRole('dialog', { name: 'Buscar producto' });
  await expect(search.getByLabel('Nombre o código')).toBeFocused();
  await page.keyboard.type('Leche', { delay: 0 });
  await expect(search.getByLabel('Nombre o código')).toHaveValue('Leche');
  await expect(scanner).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(scanner).toBeFocused();
  await page
    .getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true })
    .click();
  const quantity = page.getByRole('textbox', { name: 'Cantidad de Arroz scanner', exact: true });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await quantity.fill('0');
  await quantity.press('Enter');
  await expect(page.getByRole('alert')).toContainText('mayor a cero');
  await expect(page.getByRole('button', { name: 'Cobrar · F8', exact: true })).toBeDisabled();
  await quantity.fill('10');
  await quantity.press('Enter');
  await expect(scanner).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true }),
  ).toHaveText('10');
  await page
    .getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true })
    .click();
  await quantity.fill('999');
  await quantity.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true }),
  ).toHaveText('10');
  await expect(scanner).toBeFocused();
  await page.getByRole('button', { name: 'Quitar Arroz scanner', exact: true }).click();
  await page.getByRole('button', { name: 'Deshacer', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true }),
  ).toHaveText('10');
  await expect(scanner).toBeFocused();
  await expect(page.locator('.checkout-save-state')).toHaveText('Borrador al día');
  await page.reload();
  await openModule(page, 'Caja');
  await page.getByRole('button', { name: 'Recuperar carrito', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz scanner', exact: true }),
  ).toHaveText('10');
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Leche scanner', exact: true }),
  ).toHaveText('4');
  await expect(scanner).toBeFocused();
  await page.keyboard.press('F8');
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  const receipt = page.getByRole('dialog', { name: 'Comprobante de venta' });
  await expect(receipt).toBeVisible();
  await receipt
    .locator('.dialog-footer')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await expect(scanner).toBeFocused();
  await expect(page.locator('.checkout-lines tbody tr')).toHaveCount(0);
  const final = await page.evaluate(
    async (ids) => ({
      stocks: await Promise.all(
        ids.map(
          async (id) => (await (await fetch('/api/v1/stock/' + id)).json()).value.quantityBase,
        ),
      ),
      sales: (await (await fetch('/api/v1/sales?limit=100')).json()).value.items,
    }),
    fixture.ids,
  );
  expect(final.stocks).toEqual([90, 96, 100]);
  expect(final.sales).toHaveLength(1);
  expect(final.sales[0].totalCents).toBe(1400000);
});
