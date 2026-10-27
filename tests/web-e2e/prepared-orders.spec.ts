import { expect, test, type Page } from '@playwright/test';
import { openModule } from './navigation-helper';
const password = 'Prueba-Web-Bocha-2026!';
async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
}
test('especialista prepara sin caja y cajero cobra con remitos internos desactivados; recupera respuesta perdida sin duplicar', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(60000);
  await login(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    async function post(path: string, body: unknown, method = 'POST') {
      const r = await (
        await fetch('/api/v1' + path, {
          method,
          headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
          body: JSON.stringify(body),
        })
      ).json();
      if (!r.ok) throw new Error(path + ': ' + r.error.message);
      return r.value;
    }
    const features = (await (await fetch('/api/v1/settings/features')).json()).value;
    await post(
      '/settings/features',
      {
        expectedRevision: features.revision,
        enabled: {
          PREPARED_ORDERS: true,
          DELIVERY_NOTES_INTERNAL: false,
          DELIVERY_NOTES_SALES: false,
        },
      },
      'PUT',
    );
    await post('/users', {
      username: 'especialista',
      name: 'Especialista de ferretería',
      role: 'SELLER',
      active: true,
      password: 'Prueba-Web-Bocha-2026!',
    });
    const p = await post('/products', {
      sku: 'FER-TOR',
      barcode: null,
      name: 'Tornillos preparados',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: true,
      minStockBase: 0,
    });
    await post('/stock/opening', {
      productId: p.id,
      countedBase: 20,
      expectedRevision: 0,
      expectedProductRevision: p.revision,
      reason: 'Stock inicial',
      operationKey: crypto.randomUUID(),
    });
  });
  const context = await browser.newContext();
  const specialist = await context.newPage();
  try {
    await login(specialist, 'especialista');
    await openModule(specialist, 'Órdenes');
    await expect(
      specialist.getByRole('heading', { name: 'Órdenes para caja', exact: true }),
    ).toBeVisible();
    await specialist.getByLabel('Cliente o referencia').fill('Cliente ferretería');
    await specialist.getByRole('button', { name: 'Agregar artículo', exact: true }).click();
    await specialist
      .getByRole('option', { name: 'Agregar Tornillos preparados', exact: true })
      .click();
    await specialist.getByLabel('Cantidad de Tornillos preparados').fill('3');
    await expect(specialist.locator('.prepared-order-estimate')).toContainText('$ 30,00');
    await specialist.screenshot({
      path: testInfo.outputPath('orden-editor-desktop.png'),
      fullPage: true,
    });
    await specialist.setViewportSize({ width: 390, height: 844 });
    expect(
      await specialist.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await specialist.screenshot({
      path: testInfo.outputPath('orden-editor-mobile.png'),
      fullPage: true,
    });
    await specialist.setViewportSize({ width: 1280, height: 720 });
    await specialist.getByRole('button', { name: 'Enviar orden a caja', exact: true }).click();
    const orderDialog = specialist.getByRole('dialog');
    await expect(orderDialog).toContainText('PENDIENTE DE PAGO');
    await specialist.screenshot({
      path: testInfo.outputPath('orden-preparada.png'),
      fullPage: true,
    });
    const order = await page.evaluate(async () => {
      const orders = (await (await fetch('/api/v1/prepared-orders?status=READY')).json()).value;
      const products = (await (await fetch('/api/v1/stock?query=&limit=20')).json()).value;
      const sales = (await (await fetch('/api/v1/sales?limit=20')).json()).value;
      return { order: orders.items[0], sales: sales.total, stock: products.items[0]?.quantityBase };
    });
    expect(order.sales).toBe(0);
    expect(order.stock).toBe(20);
    await page.evaluate(async () => {
      const session = (await (await fetch('/api/v1/auth/session')).json()).value;
      const post = async (path: string, body: unknown, method = 'POST') => {
        const r = await (
          await fetch('/api/v1' + path, {
            method,
            headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
            body: JSON.stringify(body),
          })
        ).json();
        if (!r.ok) throw new Error(r.error.message);
        return r.value;
      };
      const terminal = await post('/terminals', { name: 'Caja ferretería', active: true });
      await post('/auth/terminal', { terminalId: terminal.id });
      await post('/cash/open', {
        terminalId: terminal.id,
        openingCashCents: 0,
        operationKey: crypto.randomUUID(),
      });
      const features = (await (await fetch('/api/v1/settings/features')).json()).value;
      await post(
        '/settings/features',
        { expectedRevision: features.revision, enabled: { PREPARED_ORDERS: false } },
        'PUT',
      );
    });
    await page.reload();
    await openModule(page, 'Caja');
    await page.getByRole('button', { name: 'Cobrar orden preparada', exact: true }).click();
    await page.getByLabel('Número de orden', { exact: true }).fill(String(order.order.number));
    await page.getByRole('button', { name: 'Buscar orden', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Cliente ferretería');
    await page.getByRole('button', { name: 'Cobrar orden', exact: true }).click();
    let intercepted = false;
    await page.route('**/api/v1/sales', async (route) => {
      if (route.request().method() === 'POST' && !intercepted) {
        intercepted = true;
        await route.fetch();
        await route.abort();
      } else await route.continue();
    });
    await page.getByRole('button', { name: 'Confirmar venta · F8', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Confirmar resultado del cobro' })).toBeVisible();
    await page.reload();
    await openModule(page, 'Caja');
    await page.getByRole('button', { name: 'Cobrar orden preparada', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Confirmar resultado del cobro' })).toBeVisible();
    await page.getByRole('button', { name: 'Consultar resultado', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Comprobante de venta' })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('orden-cobrada.png'), fullPage: true });
    const result = await page.evaluate(async (number: number) => {
      const order = (await (await fetch('/api/v1/prepared-orders/by-number/' + number)).json())
        .value;
      const sales = (await (await fetch('/api/v1/sales?limit=20')).json()).value;
      const stock = (await (await fetch('/api/v1/stock?query=&limit=20')).json()).value;
      const flags = (await (await fetch('/api/v1/settings/features')).json()).value;
      return {
        status: order.status,
        sales: sales.total,
        stock: stock.items[0]?.quantityBase,
        internal: flags.enabled.DELIVERY_NOTES_INTERNAL,
      };
    }, order.order.number);
    expect(result).toEqual({ status: 'PAID', sales: 1, stock: 17, internal: false });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
  }
});
