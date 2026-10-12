import { openModule } from './navigation-helper';
import { test, expect } from '@playwright/test';
test('web real: módulos, terminal, venta escaneada y consulta', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'tmp/frontend-login.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'tmp/frontend-login-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  const sidebar = page.locator('.sidebar');
  await page.getByRole('button', { name: 'Colapsar menú', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Expandir menú', exact: true })).toHaveAttribute(
    'aria-expanded',
    'false',
  );
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeLessThan(100);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Expandir menú', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  await expect.poll(async () => (await sidebar.boundingBox())!.width).toBeGreaterThan(200);
  const shellGeometry = await page.evaluate(() => {
    const sidebarRect = document.querySelector('.sidebar')!.getBoundingClientRect();
    const workspaceRect = document.querySelector('.workspace')!.getBoundingClientRect();
    return { sidebarRight: sidebarRect.right, workspaceLeft: workspaceRect.left };
  });
  expect(shellGeometry.workspaceLeft).toBe(shellGeometry.sidebarRight);
  expect(await sidebar.evaluate((el) => getComputedStyle(el).borderRightWidth)).toBe('1px');
  const seed = await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    async function post(path: string, body: unknown) {
      const response = await fetch('/api/v1' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    }
    await post('/terminals', { name: 'Caja principal', active: true });
    return post('/products', {
      sku: 'ARROZ',
      barcode: '077900001',
      name: 'Arroz largo fino',
      category: 'Almacén',
      saleUnit: 'UNIT',
      priceCents: 150000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
  });
  expect(seed.name).toBe('Arroz largo fino');
  await page.reload();
  await openModule(page, 'Caja');
  await page
    .getByRole('combobox', { name: 'Terminal', exact: true })
    .selectOption({ label: 'Caja principal' });
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('10000');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  const scanner = page.locator('.scanner-field input');
  await expect(scanner).toBeFocused();
  await expect(page.locator('.checkout-scan')).toHaveClass(/scanner-ready/);
  await scanner.fill('077900001');
  await scanner.press('Enter');
  await expect(page.locator('.checkout-lines')).toContainText('Arroz largo fino');
  await scanner.fill('077900001');
  await scanner.press('Enter');
  await expect(page.locator('.checkout-total')).toContainText('3.000');
  expect(
    await page
      .getByRole('button', { name: 'Quitar Arroz largo fino', exact: true })
      .evaluate((button) => {
        const buttonRect = button.getBoundingClientRect();
        const cartRect = button.closest('.checkout-cart')!.getBoundingClientRect();
        return buttonRect.left >= cartRect.left && buttonRect.right <= cartRect.right;
      }),
  ).toBe(true);
  await page.route('**/api/v1/cash/current?*', (route) => route.abort());
  await page.getByRole('button', { name: 'Ingreso / retiro', exact: true }).click();
  const cashDialog = page.getByRole('dialog');
  await cashDialog.getByLabel('Importe', { exact: true }).fill('100');
  await expect(cashDialog.getByLabel('Importe', { exact: true })).toBeFocused();
  await cashDialog.getByLabel('Motivo', { exact: true }).fill('Retiro de prueba');
  await cashDialog.getByRole('button', { name: 'Registrar movimiento', exact: true }).click();
  await expect(cashDialog).not.toBeVisible();
  await expect(page.locator('main').getByRole('alert')).toContainText('conexión');
  await expect(page.locator('.checkout-lines')).toContainText('Arroz largo fino');
  await page.unroute('**/api/v1/cash/current?*');
  await page.getByRole('button', { name: 'Reintentar conexión', exact: true }).click();
  await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
  await page.screenshot({ path: 'tmp/frontend-caja.png', fullPage: true });
  await page.keyboard.press('F8');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Efectivo recibido 1' })).toBeFocused();
  await expect(page.locator('.payment-balance')).toHaveCount(0);
  await page.getByRole('button', { name: 'Dividir pago' }).click();
  await expect(page.getByRole('textbox', { name: 'Importe aplicado 1' })).toHaveValue('1500,00');
  await expect(page.getByRole('textbox', { name: 'Importe aplicado 2' })).toHaveValue('1500,00');
  await expect(page.locator('.payment-balance')).toContainText('Pago completo');
  await page.getByRole('button', { name: 'Quitar pago 2' }).click();
  await expect(page.getByRole('textbox', { name: 'Importe aplicado 1' })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Efectivo recibido 1' })).toHaveValue('3000,00');
  await page.getByRole('textbox', { name: 'Efectivo recibido 1' }).fill('2500');
  await expect(page.locator('.payment-balance')).toContainText('Falta efectivo $ 500,00');
  await page.getByRole('textbox', { name: 'Efectivo recibido 1' }).fill('3000');
  expect((await page.getByRole('dialog').boundingBox())!.width).toBeGreaterThanOrEqual(600);
  await page.screenshot({ path: 'tmp/frontend-cobrar.png', fullPage: false });
  const debit = page.getByRole('button', { name: 'Débito', exact: true });
  await debit.click();
  await expect(debit).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Efectivo', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'tmp/frontend-cobrar-mobile.png', fullPage: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('textbox', { name: 'Efectivo recibido 1' }).fill('4000');
  await expect(page.locator('.payment-change-inline')).toContainText('Vuelto $ 1.000');
  await expect(page.locator('.payment-balance-change')).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Efectivo recibido 1' }).fill('3000');
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  await expect(page.locator('.sale-confirmed')).toBeVisible();
  const receiptDialog = page.getByRole('dialog', { name: 'Comprobante de venta' });
  await expect(receiptDialog).toBeVisible();
  await receiptDialog
    .locator('.dialog-footer')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await expect(receiptDialog).not.toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Expandir menú' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Expandir menú' }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  await page.getByRole('button', { name: 'Colapsar menú' }).click();
  await page.screenshot({ path: 'tmp/frontend-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const mobileCheckout = await page.locator('.checkout-layout').evaluate((layout) => {
    const cart = layout.querySelector('.checkout-cart')!.getBoundingClientRect();
    const totals = layout.querySelector('.checkout-totals')!.getBoundingClientRect();
    return { cartBottom: cart.bottom, totalsTop: totals.top };
  });
  expect(mobileCheckout.totalsTop).toBeGreaterThanOrEqual(mobileCheckout.cartBottom);
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const name of [
    'Productos',
    'Stock',
    'Histórico',
    'Resumen mensual',
    'Usuarios',
    'Turnos',
    'Actividad',
    'Configuración',
    'Backups',
  ]) {
    await openModule(page, name);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
    if (name === 'Resumen mensual') {
      await expect(page.locator('.dashboard-metrics')).toBeVisible();
      await expect(page.locator('.dashboard-metrics article')).toHaveCount(3);
      await expect(page.locator('.unused-payment-methods')).toContainText(
        'Medios sin movimientos (4)',
      );
      await expect(page.getByRole('button', { name: /^Ver inventario actual/ })).toBeVisible();
      const monthInput = page.getByLabel('Mes', { exact: true });
      const activeMonth = await monthInput.inputValue();
      await monthInput.fill('2025-01');
      await expect(page.locator('.dashboard-empty-chart')).toContainText('Todavía no hay ventas');
      await expect(page.locator('.results-plot-scroll')).toHaveCount(0);
      await monthInput.fill(activeMonth);
      await expect(page.locator('.results-plot-scroll')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      const chartOverflows = await page
        .locator('.results-plot-scroll')
        .evaluate((chart) => chart.scrollWidth > chart.clientWidth);
      if (chartOverflows)
        await expect
          .poll(() => page.locator('.results-plot-scroll').evaluate((chart) => chart.scrollLeft))
          .toBeGreaterThan(0);
      await page.screenshot({ path: 'tmp/frontend-dashboard-mobile.png', fullPage: true });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    await expect(page.locator('main')).not.toContainText('Origen no permitido');
    if (name === 'Configuración') {
      await expect(page.locator('.workspace-tabs')).toHaveCount(1);
      const businessTab = page.getByRole('tab', { name: 'Negocio', exact: true });
      await businessTab.focus();
      await businessTab.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Funciones', exact: true })).toBeFocused();
      await page.getByRole('tab', { name: 'Funciones', exact: true }).press('ArrowRight');
      await page.getByRole('tab', { name: 'Terminales', exact: true }).press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Lector', exact: true })).toBeFocused();
      await expect(page.locator('.workspace-tabs')).toHaveCount(1);
      await page.getByRole('tab', { name: 'Lector', exact: true }).press('Home');
      await expect(businessTab).toBeFocused();
      await expect(businessTab).toHaveAttribute('aria-selected', 'true');
    }
    await page.screenshot({ path: 'tmp/frontend-' + name + '.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('main h1')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: 'tmp/frontend-mobile-' + name + '.png', fullPage: true });
    await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
    await expect(
      page.locator('.sidebar-bottom').getByRole('button', { name: 'Ayuda', exact: true }),
    ).toHaveAccessibleName('Ayuda');
    await expect(
      page
        .getByRole('navigation', { name: 'Módulos' })
        .getByRole('button', { name: 'Productos', exact: true })
        .locator('span')
        .last(),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Colapsar menú', exact: true }).click();
    if (name === 'Productos') {
      await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
      await expect(page.locator('.workspace')).toHaveAttribute('inert', '');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Expandir menú', exact: true })).toBeFocused();
      await expect(page.locator('.workspace')).not.toHaveAttribute('inert', '');
      await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
      await page
        .getByRole('button', { name: 'Cerrar menú', exact: true })
        .click({ position: { x: 365, y: 100 } });
      await expect(page.getByRole('button', { name: 'Expandir menú', exact: true })).toBeVisible();
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    if (name === 'Productos') {
      await page.getByRole('button', { name: /Nuevo producto/ }).click();
      const productDialog = page.getByRole('dialog');
      await expect(productDialog.getByLabel('Nombre del producto')).toBeVisible();
      await expect(productDialog.getByLabel('Nombre del producto')).toBeFocused();
      await expect(productDialog.getByLabel('Código interno')).not.toBeVisible();
      await page.screenshot({ path: 'tmp/frontend-producto-nuevo.png' });
      await productDialog.getByText('Más opciones').click();
      await expect(productDialog.getByLabel('Código interno')).toBeVisible();
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: 'tmp/frontend-producto-mobile.png' });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.setViewportSize({ width: 1280, height: 720 });
      await productDialog.getByRole('button', { name: 'Cancelar' }).click();
    }
  }
  await page.locator('.sidebar').getByRole('button', { name: 'Ayuda', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar en la ayuda' }).fill('vuelto');
  await expect(page.locator('.help-page article h3')).toHaveText('Descuentos y cobro');
  await page.getByRole('navigation').getByRole('button', { name: 'Caja', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
  const closing = page.getByRole('dialog');
  await closing.getByLabel('Efectivo contado', { exact: true }).fill('12900');
  await expect(closing.getByLabel('Efectivo contado', { exact: true })).toBeFocused();
  await closing.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
  await expect(page.locator('main')).toContainText('Caja cerrada · Diferencia $ 0,00');
  await expect(page.locator('.status-message')).toContainText('Caja cerrada · Diferencia $ 0,00');
  await openModule(page, 'Backups');
  await page.getByRole('button', { name: 'Crear copia', exact: true }).click();
  const manual = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Manual', exact: true }) })
    .first();
  await expect(manual).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await manual.getByRole('button', { name: /Descargar copia/ }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toContain('.backup');
  const filePath = await file.path();
  expect(filePath).not.toBeNull();
  await page.getByLabel('Archivo de copia', { exact: true }).setInputFiles(filePath!);
  await expect(page.getByRole('status')).toHaveText('Copia subida y validada.');
  await manual.getByRole('button', { name: /Revisar copia/ }).click();
  await page.getByLabel('Tu contraseña actual').fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Restaurar y cerrar sesiones', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
});

test('web: permisos de vendedor y supervisor', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  await openModule(page, 'Usuarios');
  for (const [username, role] of [
    ['vendedor', 'SELLER'],
    ['supervisor', 'SUPERVISOR'],
  ] as const) {
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('[name="name"]').fill(username);
    await dialog.locator('[name="username"]').fill(username);
    await dialog.locator('[name="role"]').selectOption(role);
    await dialog.locator('[name="password"]').fill('Cuenta-Web-Prueba-2026!');
    await dialog.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  }
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  for (const username of ['vendedor', 'supervisor']) {
    await page.getByLabel('Usuario', { exact: true }).fill(username);
    await page.getByLabel('Contraseña', { exact: true }).fill('Cuenta-Web-Prueba-2026!');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Módulos' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Resultados', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0);
    await page.locator('.sidebar').getByRole('button', { name: 'Ayuda', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Caja y ventas', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Usuarios y configuración', exact: true }),
    ).toHaveCount(0);
    if (username === 'vendedor') await expect(nav.locator('.nav-item')).toHaveCount(1);
    else await expect(nav.getByRole('button', { name: 'Stock', exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        async () => (await fetch('/api/v1/dashboard/monthly?month=2026-09')).status,
      ),
    ).toBe(403);
    await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
  }
});
