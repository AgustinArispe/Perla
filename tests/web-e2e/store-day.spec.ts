import { expect, test, type Page } from '@playwright/test';

test('jornada real: dos cajeros, promoción, peso, cobro incierto, devolución y cierres', async ({
  browser,
  page,
}) => {
  test.setTimeout(60000);
  const password = 'Jornada2026!';
  async function login(target: Page, username: string, pass: string) {
    await target.goto('/');
    await target.getByLabel('Usuario', { exact: true }).fill(username);
    await target.getByLabel('Contraseña', { exact: true }).fill(pass);
    await target.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(target.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  }
  await login(page, 'jefe', 'Prueba-Web-Bocha-2026!');
  const fixture = await page.evaluate(async (password) => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    async function post(path: string, body: unknown, method = 'POST') {
      const result = await (
        await fetch('/api/v1' + path, {
          method,
          headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
          body: JSON.stringify(body),
        })
      ).json();
      if (!result.ok) throw new Error(path + ': ' + result.error.message);
      return result.value;
    }
    const features = (await (await fetch('/api/v1/settings/features')).json()).value;
    await post(
      '/settings/features',
      {
        expectedRevision: features.revision,
        enabled: { STOCK_CONTROL: true, PROMOTIONS: true, RETURNS: true, RECEIPTS: true },
      },
      'PUT',
    );
    const terminal = await post('/terminals', { name: 'Caja jornada', active: true });
    await post('/auth/terminal', { terminalId: terminal.id });
    for (const [username, name] of [
      ['turnomanana', 'Lucía'],
      ['turnotarde', 'Martín'],
    ])
      await post('/users', { username, name, role: 'SELLER', active: true, password });
    const products = [];
    for (const [sku, name, barcode, saleUnit, priceCents, opening] of [
      ['JORNADA-ARROZ', 'Arroz jornada', '7799900080017', 'UNIT', 200000, 20],
      ['JORNADA-JAMON', 'Jamón jornada', '7799900080024', 'KG', 1000000, 1000],
    ] as const) {
      const product = await post('/products', {
        sku,
        name,
        barcode,
        saleUnit,
        priceCents,
        category: null,
        active: true,
        trackStock: true,
        minStockBase: 1,
      });
      await post('/stock/opening', {
        productId: product.id,
        operationKey: crypto.randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: product.revision,
        countedBase: opening,
        reason: 'Stock inicial de la jornada',
      });
      products.push(product);
    }
    await post('/promotions', {
      name: 'Arroz jornada 3 por 2',
      type: 'X_FOR_Y',
      buyQuantity: 3,
      payQuantity: 2,
      productIds: [products[0]!.id],
      status: 'ACTIVE',
      priority: 100,
      startsAt: null,
      endsAt: null,
    });
    const month = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());
    const report = (await (await fetch('/api/v1/dashboard/monthly?month=' + month)).json()).value;
    return {
      terminalId: terminal.id,
      riceId: products[0]!.id,
      hamId: products[1]!.id,
      month,
      initialNet: report.totals.netCents,
    };
  }, password);
  const morningContext = await browser.newContext();
  const afternoonContext = await browser.newContext();
  const morning = await morningContext.newPage();
  const afternoon = await afternoonContext.newPage();
  async function open(target: Page, user: string) {
    await login(target, user, password);
    await target
      .getByRole('combobox', { name: 'Terminal', exact: true })
      .selectOption(fixture.terminalId);
    await target.getByRole('button', { name: 'Usar terminal', exact: true }).click();
    await target.getByLabel('Efectivo inicial').fill('10000');
    await target.getByRole('button', { name: 'Abrir caja', exact: true }).click();
    await expect(target.getByLabel('Escanear código')).toBeFocused();
    await expect(
      target
        .getByRole('navigation', { name: 'Módulos' })
        .getByRole('button', { name: 'Resumen mensual', exact: true }),
    ).toHaveCount(0);
  }
  async function scan(target: Page, code: string) {
    await target.bringToFront();
    await expect(target.getByLabel('Escanear código')).toBeFocused();
    await target.keyboard.type(code, { delay: 0 });
    await target.keyboard.press('Enter');
  }
  async function closeReceipt(target: Page) {
    const receipt = target.getByRole('dialog', { name: 'Comprobante de venta' });
    await expect(receipt).toBeVisible();
    await receipt
      .locator('.dialog-footer')
      .getByRole('button', { name: 'Cerrar', exact: true })
      .click();
    await expect(receipt).not.toBeVisible();
  }
  async function closeShift(target: Page, amount: string) {
    await target.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
    const dialog = target.getByRole('dialog', { name: 'Cerrar caja' });
    await dialog.getByLabel('Efectivo contado').fill(amount);
    await expect(dialog.locator('.register-close-balance')).toContainText(
      amount === '13240' ? 'Faltan $ 10,00' : 'Sin diferencia',
    );
    if (amount === '13240') {
      await dialog.getByLabel('Efectivo contado').fill('13300');
      await expect(dialog.locator('.register-close-balance')).toContainText('Sobran $ 50,00');
      await dialog.getByLabel('Efectivo contado').fill(amount);
      await dialog.screenshot({ path: 'tmp/day-close-desktop.png' });
      await target.setViewportSize({ width: 390, height: 844 });
      await dialog.screenshot({ path: 'tmp/day-close-mobile.png' });
      expect(await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await target.setViewportSize({ width: 1280, height: 720 });
    }
    await dialog.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  try {
    await open(morning, 'turnomanana');
    for (let n = 0; n < 3; n++) await scan(morning, '7799900080017');
    await scan(morning, '7799900080024');
    await morning.getByRole('dialog').getByLabel('Peso', { exact: true }).fill('250');
    await morning
      .getByRole('dialog')
      .getByRole('button', { name: /Agregar/ })
      .click();
    await expect(morning.locator('.checkout-total')).toContainText('6.500');
    await morning.keyboard.press('F8');
    await morning.getByRole('button', { name: 'Agregar otro medio', exact: true }).click();
    await morning.getByLabel('Efectivo recibido 1').fill('4000');
    // The server commits, but the confirmation is lost on the way back.
    await morning.route(
      '**/api/v1/sales',
      async (route) => {
        await route.fetch();
        await route.fulfill({
          status: 502,
          contentType: 'text/html',
          body: '<html>Gateway temporalmente no disponible</html>',
        });
      },
      { times: 1 },
    );
    await morning.getByRole('button', { name: /Confirmar venta/ }).click();
    await expect(
      morning.getByRole('heading', { name: 'Venta pendiente de confirmar' }),
    ).toBeVisible();
    await expect(morning.getByRole('alert')).toContainText('respuesta del servidor');
    await morning.getByRole('button', { name: 'Consultar venta', exact: true }).click();
    await closeReceipt(morning);
    await expect(morning.getByLabel('Escanear código')).toBeFocused();
    await scan(morning, '7799900080017');
    await expect(
      morning.getByRole('button', { name: 'Cambiar cantidad de Arroz jornada', exact: true }),
    ).toHaveText('1');
    await morning.getByRole('button', { name: 'Cancelar venta en curso', exact: true }).click();
    await morning.getByRole('button', { name: 'Confirmar cancelación', exact: true }).click();
    await closeShift(morning, '13240');

    await open(afternoon, 'turnotarde');
    for (let n = 0; n < 2; n++) await scan(afternoon, '7799900080017');
    await expect(afternoon.locator('.checkout-total')).toContainText('4.000');
    await afternoon.keyboard.press('F8');
    await afternoon.getByRole('button', { name: /Confirmar venta/ }).click();
    await closeReceipt(afternoon);

    const result = await page.evaluate(async (fixture) => {
      const session = (await (await fetch('/api/v1/auth/session')).json()).value;
      async function get(path: string) {
        const result = await (await fetch('/api/v1' + path)).json();
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      }
      const sales = await get('/sales?limit=100');
      const sale = await get('/sales/' + sales.items[0].id);
      const response = await fetch('/api/v1/sales/returns', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({
          saleId: sale.id,
          operationKey: crypto.randomUUID(),
          reason: 'Cliente devuelve una unidad',
          refundMethod: 'CASH',
          items: [{ saleItemId: sale.items[0].id, quantityBase: 1, disposition: 'RESTOCK' }],
        }),
      });
      const returned = await response.json();
      if (!returned.ok) throw new Error(returned.error.message);
      const shifts = await get('/cash/shifts?limit=100');
      return {
        returned: returned.value,
        rice: await get('/stock/' + fixture.riceId),
        ham: await get('/stock/' + fixture.hamId),
        sales: sales.items.filter((s: { id: string }) => s.id === sale.id),
        shifts,
      };
    }, fixture);
    expect(result.returned.refundCents).toBe(200000);
    expect(result.rice.quantityBase).toBe(16);
    expect(result.ham.quantityBase).toBe(750);
    const morningClosed = result.shifts.items.find(
      (shift: { terminalId: string; status: string }) =>
        shift.terminalId === fixture.terminalId && shift.status === 'CLOSED',
    );
    expect(morningClosed).toMatchObject({
      expectedCashCents: 1325000,
      countedCashCents: 1324000,
      differenceCents: -1000,
    });
    await closeShift(afternoon, '12000');
    const final = await page.evaluate(async (fixture) => {
      const shifts = (
        await (await fetch('/api/v1/cash/shifts?limit=100')).json()
      ).value.items.filter((s: { terminalId: string }) => s.terminalId === fixture.terminalId);
      const report = (
        await (await fetch('/api/v1/dashboard/monthly?month=' + fixture.month)).json()
      ).value;
      const sales = (await (await fetch('/api/v1/sales?limit=100')).json()).value;
      const details = await Promise.all(
        sales.items.map(
          async (sale: { id: string }) =>
            (await (await fetch('/api/v1/sales/' + sale.id)).json()).value,
        ),
      );
      return {
        shifts,
        net: report.totals.netCents,
        sales: details.filter((sale) =>
          sale.items.some((item: { productId: string }) => item.productId === fixture.riceId),
        ),
      };
    }, fixture);
    expect(final.sales).toHaveLength(2);
    expect(final.net - fixture.initialNet).toBe(850000);
    expect(final.shifts).toHaveLength(2);
    expect(final.shifts.every((s: { status: string }) => s.status === 'CLOSED')).toBe(true);
    expect(final.shifts.find((s: { id: string }) => s.id === morningClosed.id)).toEqual(
      morningClosed,
    );
    expect(final.shifts.find((s: { id: string }) => s.id !== morningClosed.id)).toMatchObject({
      expectedCashCents: 1200000,
      differenceCents: 0,
    });
  } finally {
    if (!morning.isClosed())
      await morning.screenshot({ path: 'tmp/store-day-last-morning.png', fullPage: true });
    await morningContext.close();
    await afternoonContext.close();
  }
});
