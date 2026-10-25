import { expect, test } from '@playwright/test';
import { openModule } from './navigation-helper';

test('activa remitos, emite desde una venta, imprime y conserva historial al desactivar', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  const seed = await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const post = async (path: string, body: unknown) => {
      const response = await fetch('/api/v1' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(path + ': ' + result.error.message);
      return result.value;
    };
    const terminal = await post('/terminals', { name: 'Caja remitos', active: true });
    await post('/auth/terminal', { terminalId: terminal.id });
    const product = await post('/products', {
      sku: 'REM-WEB',
      name: 'Merluza para entregar',
      barcode: null,
      category: null,
      saleUnit: 'UNIT',
      priceCents: 10000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    await post('/cash/open', {
      terminalId: terminal.id,
      openingCashCents: 0,
      operationKey: crypto.randomUUID(),
    });
    const sale = await post('/sales', {
      checkoutKey: crypto.randomUUID(),
      lines: [
        {
          lineId: crypto.randomUUID(),
          productId: product.id,
          quantityBase: 2,
          expectedProductRevision: product.revision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'DEBIT', amountCents: 20000 }],
    });
    return { saleId: sale.id, saleNumber: sale.number };
  });
  await openModule(page, 'Configuración');
  await page.getByRole('tab', { name: 'Funciones', exact: true }).click();
  await page.getByRole('switch', { name: 'Remitos a clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
  const confirmation = page.getByRole('dialog');
  await confirmation.getByRole('button', { name: /Aplicar|Confirmar|Guardar/ }).click();
  await expect(confirmation).not.toBeVisible();
  await openModule(page, 'Remitos');
  await page.getByRole('button', { name: 'Nuevo remito', exact: true }).click();
  const create = page.getByRole('dialog');
  await create.getByLabel('Documento de origen').selectOption(seed.saleId);
  await create.getByLabel('Destinatario', { exact: true }).fill('Cliente de prueba');
  await create.getByLabel('Dirección de entrega / recepción').fill('Puerto 123');
  await create.getByRole('button', { name: 'Emitir remito', exact: true }).click();
  const detail = page.getByRole('dialog');
  await expect(detail.locator('.delivery-note-print')).toContainText('Cliente de prueba');
  await expect(detail.locator('.delivery-note-print')).toContainText('Merluza para entregar');
  await expect(detail.locator('.delivery-note-print')).toContainText('2 u.');
  await expect(detail.locator('.delivery-note-print')).not.toContainText('$');
  await page.screenshot({ path: testInfo.outputPath('remito.png'), fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(detail.locator('.dialog-footer')).toBeHidden();
  await expect(detail.locator('.delivery-note-print')).toBeVisible();
  await page.pdf({ path: testInfo.outputPath('remito.pdf'), format: 'A4', printBackground: false });
  await page.emulateMedia({ media: 'screen' });
  await detail.getByRole('button', { name: 'Confirmar entrega', exact: true }).click();
  await detail.getByLabel('Recibido por / constancia').fill('Recibió Lucía');
  await detail.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(detail.locator('.delivery-note-print')).toContainText('Entrega confirmada');
  await detail
    .locator('.dialog-footer')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await openModule(page, 'Configuración');
  await page.getByRole('tab', { name: 'Funciones', exact: true }).click();
  await page.getByRole('switch', { name: 'Remitos a clientes', exact: true }).click();
  await page.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /Aplicar|Confirmar|Guardar/ })
    .click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await openModule(page, 'Remitos');
  await expect(page.getByRole('button', { name: 'Nuevo remito', exact: true })).toBeDisabled();
  await expect(page.locator('.receipt-queue-row')).toContainText('Cliente de prueba');
  await page.getByRole('button', { name: 'Ver e imprimir', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.delivery-note-print')).toContainText(
    'Recibió Lucía',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const preview = page.getByRole('dialog').locator('.delivery-note-print');
  await expect(preview).toBeVisible();
  expect(await preview.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  expect(errors).toEqual([]);
});
