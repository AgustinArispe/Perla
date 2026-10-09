import { openModule } from './navigation-helper';
import { expect, test } from '@playwright/test';

test('fallo de consulta de clientes se muestra como error y se recupera con Reintentar', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const features = (await (await fetch('/api/v1/settings/features')).json()).value;
    const response = await fetch('/api/v1/settings/features', {
      method: 'PUT',
      headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
      body: JSON.stringify({ expectedRevision: features.revision, enabled: { CUSTOMERS: true } }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error.message);
  });
  await page.reload();
  await page.route('**/api/v1/customers?**', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { code: 'INTERNAL', message: 'No se pudo consultar clientes.', retryable: true },
      }),
    }),
  );
  await openModule(page, 'Clientes');
  await expect(page.getByRole('alert')).toContainText('No se pudo consultar clientes.', {
    timeout: 15000,
  });
  await expect(page.locator('.result-count')).not.toHaveText('0 clientes');
  await page.unroute('**/api/v1/customers?**');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.result-count')).toContainText('clientes');
});

test('cliente: alta, límite, venta a cuenta, cobro parcial y saldo cancelado en celular', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  const terminalId = await page.evaluate(async () => {
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
      {
        expectedRevision: features.revision,
        enabled: { CUSTOMERS: true, CUSTOMER_CREDIT: true, RECEIPTS: true },
      },
      'PUT',
    );
    const terminal = await post('/terminals', { name: 'Caja cuenta cliente', active: true });
    await post('/products', {
      sku: 'CUENTA-CLIENTE',
      name: 'Producto cuenta',
      barcode: '7799900080079',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 100000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    return terminal.id;
  });
  await page.reload();
  await openModule(page, 'Caja');
  await page.getByRole('combobox', { name: 'Terminal', exact: true }).selectOption(terminalId);
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('10000');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  await expect(page.getByLabel('Escanear código')).toBeFocused();
  await page.keyboard.type('7799900080079', { delay: 0 });
  await page.keyboard.press('Enter');
  await expect(page.locator('.checkout-total')).toContainText('1.000');
  await page.getByRole('button', { name: 'Elegir cliente', exact: true }).click();
  const picker = page.getByRole('dialog', { name: 'Cliente de la venta' });
  await picker.getByRole('button', { name: 'Nuevo cliente', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Nuevo cliente', exact: true });
  await expect(form).toBeVisible({ timeout: 5000 });
  await form.getByLabel('Nombre', { exact: true }).fill('Alta cancelada');
  await form.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(picker).toBeVisible();
  await picker.getByRole('button', { name: 'Consumidor final', exact: true }).click();
  await expect(page.locator('.checkout-total')).toContainText('1.000');
  await page.keyboard.press('F8');
  await expect(page.getByRole('combobox', { name: 'Cliente', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Agregar cliente', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Cobrar venta' })
    .getByRole('button', { name: 'Nuevo cliente', exact: true })
    .click();
  await expect(form.getByLabel('Nombre', { exact: true })).toBeFocused();
  await page.screenshot({
    path: 'output/ui-ux-implementation/2026-10-07/customer-from-checkout.png',
  });
  await form.getByLabel('Nombre', { exact: true }).fill('María cuenta de prueba');
  await form.getByRole('checkbox', { name: 'Habilitar cuenta corriente' }).check();
  await form.getByLabel('Límite', { exact: true }).fill('5000');
  await form.getByRole('button', { name: 'Guardar cliente', exact: true }).click();
  await expect(form).not.toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Cobrar venta' })).toContainText(
    'María cuenta de prueba',
  );
  const payment = page.getByRole('dialog', { name: 'Cobrar venta' });
  const methods = await payment.locator('.payment-method-option').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect();
      return { width: box.width, right: box.right };
    }),
  );
  expect(
    Math.max(...methods.map((m) => m.width)) - Math.min(...methods.map((m) => m.width)),
  ).toBeLessThan(2);
  const methodArea = await payment.locator('.payment-method-options').boundingBox();
  expect(Math.abs(methods.at(-1)!.right - (methodArea!.x + methodArea!.width))).toBeLessThan(2);
  const clientBox = await payment.locator('.entity-selection').boundingBox();
  const newClientBox = await payment.locator('.payment-new-customer').boundingBox();
  expect(
    Math.abs(clientBox!.y + clientBox!.height - newClientBox!.y - newClientBox!.height),
  ).toBeLessThan(2);
  await page.screenshot({
    path: 'output/ui-ux-implementation/2026-10-07/payment-balanced-desktop.png',
  });
  await payment.getByRole('button', { name: 'Dividir pago', exact: true }).click();
  const firstPayment = payment.locator('.payment-row').first();
  const fields = await firstPayment
    .locator('input')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        width: node.getBoundingClientRect().width,
        bottom: node.getBoundingClientRect().bottom,
      })),
    );
  expect(Math.abs(fields[0]!.width - fields[1]!.width)).toBeLessThan(2);
  const removeBox = await firstPayment.getByRole('button', { name: 'Quitar pago 1' }).boundingBox();
  expect(Math.abs(fields[0]!.bottom - removeBox!.y - removeBox!.height)).toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: 'output/ui-ux-implementation/2026-10-07/payment-balanced-mobile.png',
  });
  await page.setViewportSize({ width: 1280, height: 720 });
  const customerId = await page.evaluate(
    async () =>
      (await (await fetch('/api/v1/customers?query=Mar%C3%ADa')).json()).value.items[0].id,
  );
  await page.getByRole('button', { name: /Dejar a cuenta/ }).click();
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  const receipt = page.getByRole('dialog', { name: 'Comprobante de venta' });
  await expect(receipt).toBeVisible();
  await receipt
    .locator('.dialog-footer')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await openModule(page, 'Clientes');
  await page.getByRole('button', { name: 'Ver cuenta', exact: true }).click();
  const account = page.getByRole('dialog', { name: 'María cuenta de prueba' });
  await expect(account.locator('.customer-account-hero')).toContainText('$ 1.000,00');
  await account.getByLabel('Importe', { exact: true }).fill('400');
  await account.getByRole('button', { name: 'Confirmar cobro', exact: true }).click();
  await expect(account.locator('.customer-account-hero')).toContainText('$ 600,00');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(account.getByLabel('Importe', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await account.getByLabel('Importe', { exact: true }).fill('600');
  await account.getByRole('button', { name: 'Confirmar cobro', exact: true }).click();
  await expect(account.locator('.customer-account-hero')).toContainText('$ 0,00');
  await expect(account.getByText('Saldada', { exact: true })).toBeVisible();
  const data = await page.evaluate(
    async (customerId) => ({
      account: (await (await fetch('/api/v1/customers/' + customerId + '/account')).json()).value,
      sales: (await (await fetch('/api/v1/sales?limit=100')).json()).value.items,
    }),
    customerId,
  );
  expect(data.account.balanceCents).toBe(0);
  expect(data.account.availableCents).toBe(500000);
  expect(data.account.collections).toHaveLength(2);
  expect(data.account.receivables[0].status).toBe('PAID');
  expect(data.sales).toHaveLength(1);
  expect(data.sales[0].totalCents).toBe(100000);
});
