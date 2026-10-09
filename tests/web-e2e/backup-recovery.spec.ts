import { openModule } from './navigation-helper';
import { expect, test, type Page } from '@playwright/test';

const password = 'Prueba-Web-Bocha-2026!';
async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
}

test('una consulta fallida no se presenta como ausencia de copias y permite reintentar', async ({
  page,
}) => {
  await login(page);
  await page.route('**/api/v1/backups', async (route) => {
    if (route.request().method() === 'GET')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: {
            code: 'INTERNAL',
            message: 'No se pudieron consultar las copias.',
            retryable: false,
          },
        }),
      });
    else await route.continue();
  });
  await openModule(page, 'Backups');
  await expect(page.getByRole('alert')).toContainText('No se pudieron consultar las copias.', {
    timeout: 15000,
  });
  await expect(page.locator('.backup-status')).toContainText('No se pudo consultar');
  await expect(page.locator('.backup-status')).not.toContainText('Sin copias disponibles');
  await page.unroute('**/api/v1/backups');
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.backup-status')).not.toContainText('No se pudo consultar');
  await expect(page.getByRole('button', { name: /^Descargar copia del/ }).first()).toBeVisible();
});

test('copia descargada: restaura venta, stock y cierre y revoca todas las sesiones', async ({
  page,
  browser,
}, testInfo) => {
  test.setTimeout(60000);
  await login(page);
  const fixture = await page.evaluate(async () => {
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
      { expectedRevision: features.revision, enabled: { STOCK_CONTROL: true } },
      'PUT',
    );
    const terminal = await post('/terminals', { name: 'Caja recuperación', active: true });
    await post('/users', {
      username: 'supervisorbackup',
      name: 'Supervisor recuperación',
      role: 'SUPERVISOR',
      active: true,
      password: 'Prueba-Web-Bocha-2026!',
    });
    await post('/auth/terminal', { terminalId: terminal.id });
    const product = await post('/products', {
      sku: 'BACKUP-ARROZ',
      name: 'Arroz protegido',
      barcode: '7799900080031',
      saleUnit: 'UNIT',
      priceCents: 200000,
      category: null,
      active: true,
      trackStock: true,
      minStockBase: 2,
    });
    await post('/stock/opening', {
      productId: product.id,
      operationKey: crypto.randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: product.revision,
      countedBase: 20,
      reason: 'Stock protegido',
    });
    const shift = await post('/cash/open', {
      terminalId: terminal.id,
      openingCashCents: 1000000,
      operationKey: crypto.randomUUID(),
    });
    const currentProduct = (await (await fetch('/api/v1/products/' + product.id)).json()).value;
    const sale = await post('/sales', {
      checkoutKey: crypto.randomUUID(),
      lines: [
        {
          lineId: crypto.randomUUID(),
          productId: product.id,
          quantityBase: 2,
          expectedProductRevision: currentProduct.revision,
          expectedPriceCents: currentProduct.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'CASH', amountCents: 400000, tenderedCents: 400000 }],
    });
    await post('/cash/close', {
      shiftId: shift.id,
      countedCashCents: 1400000,
      operationKey: crypto.randomUUID(),
    });
    return { productId: product.id, saleId: sale.id, terminalId: terminal.id };
  });
  const otherContext = await browser.newContext();
  try {
    const other = await otherContext.newPage();
    await login(other, 'supervisorbackup');
    expect((await other.request.get('/api/v1/products')).status()).toBe(200);
    expect((await other.request.get('/api/v1/backups')).status()).toBe(403);
    await openModule(page, 'Backups');
    await page.getByRole('button', { name: 'Crear copia', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Copia creada.' })).toBeVisible();
    const downloadEvent = page.waitForEvent('download');
    await page
      .getByRole('button', { name: /^Descargar copia del/ })
      .first()
      .click();
    const download = await downloadEvent;
    const filePath = testInfo.outputPath('negocio.backup');
    await download.saveAs(filePath);

    // This mutation must disappear after restoring the downloaded snapshot.
    await page.evaluate(async (productId) => {
      const session = (await (await fetch('/api/v1/auth/session')).json()).value;
      const stock = (await (await fetch('/api/v1/stock/' + productId)).json()).value;
      const product = (await (await fetch('/api/v1/products/' + productId)).json()).value;
      const result = await (
        await fetch('/api/v1/stock/count', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
          body: JSON.stringify({
            productId,
            operationKey: crypto.randomUUID(),
            expectedRevision: stock.revision,
            expectedProductRevision: product.revision,
            countedBase: 5,
            reason: 'Conteo posterior a la copia',
          }),
        })
      ).json();
      if (!result.ok) throw new Error(result.error.message);
      const updated = (await (await fetch('/api/v1/stock/' + productId)).json()).value;
      if (updated.quantityBase !== 5) throw new Error('La modificación previa no se aplicó.');
    }, fixture.productId);

    await page.getByText('Subir una copia existente', { exact: true }).click();
    await page.getByLabel('Archivo de copia').setInputFiles(filePath);
    await expect(
      page.getByRole('status').filter({ hasText: 'Copia subida y validada.' }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: /^Revisar copia del/ })
      .first()
      .click();
    const dialog = page.getByRole('dialog', { name: 'Restaurar copia' });
    await expect(dialog).toContainText('reemplaza los datos actuales');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'tmp/backup-restore-mobile.png', fullPage: true });
    await dialog.getByLabel('Tu contraseña actual').fill(password);
    await dialog.getByRole('button', { name: 'Restaurar y cerrar sesiones', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
    expect((await other.request.get('/api/v1/products')).status()).toBe(401);

    await page.setViewportSize({ width: 1280, height: 720 });
    await login(page);
    const restored = await page.evaluate(async (fixture) => {
      async function get(path: string) {
        const result = await (await fetch('/api/v1' + path)).json();
        if (!result.ok) throw new Error(result.error.message);
        return result.value;
      }
      return {
        stock: await get('/stock/' + fixture.productId),
        sale: await get('/sales/' + fixture.saleId),
        shifts: await get('/cash/shifts?limit=100'),
        backups: await get('/backups'),
      };
    }, fixture);
    expect(restored.stock.quantityBase).toBe(18);
    expect(restored.sale).toMatchObject({ totalCents: 400000, status: 'COMPLETED' });
    expect(restored.sale.items[0]).toMatchObject({ name: 'Arroz protegido', quantityBase: 2 });
    expect(
      restored.shifts.items.find(
        (shift: { terminalId: string }) => shift.terminalId === fixture.terminalId,
      ),
    ).toMatchObject({
      status: 'CLOSED',
      expectedCashCents: 1400000,
      countedCashCents: 1400000,
      differenceCents: 0,
    });
    expect(restored.backups.some((backup: { kind: string }) => backup.kind === 'PRE_RESTORE')).toBe(
      true,
    );
  } finally {
    await otherContext.close();
  }
});
