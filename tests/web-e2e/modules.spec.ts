import { test, expect } from '@playwright/test';
test('web real: módulos, terminal, venta escaneada y consulta', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
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
  await page
    .getByRole('combobox', { name: 'Terminal', exact: true })
    .selectOption({ label: 'Caja principal' });
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('10000');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  const scanner = page.locator('.scanner-field input');
  await expect(scanner).toBeFocused();
  await scanner.fill('077900001');
  await scanner.press('Enter');
  await expect(page.locator('.checkout-lines')).toContainText('Arroz largo fino');
  await scanner.fill('077900001');
  await scanner.press('Enter');
  await expect(page.locator('.checkout-total')).toContainText('3.000');
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
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  await expect(page.locator('.sale-confirmed')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'tmp/frontend-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
    await page
      .getByRole('navigation', { name: 'Módulos' })
      .getByRole('button', { name, exact: true })
      .click();
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('main [aria-busy="true"]')).toHaveCount(0);
    if (name === 'Resumen mensual') await expect(page.locator('.dashboard-metrics')).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Origen no permitido');
    await page.screenshot({ path: 'tmp/frontend-' + name + '.png', fullPage: true });
  }
  await page.getByRole('navigation').getByRole('button', { name: 'Caja', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
  const closing = page.getByRole('dialog');
  await closing.getByLabel('Efectivo contado', { exact: true }).fill('12900');
  await expect(closing.getByLabel('Efectivo contado', { exact: true })).toBeFocused();
  await closing.getByRole('button', { name: 'Cerrar caja', exact: true }).click();
  await expect(page.locator('main')).toContainText('Caja cerrada · Diferencia $ 0,00');
  await page.getByRole('navigation').getByRole('button', { name: 'Backups', exact: true }).click();
  await page.getByRole('button', { name: 'Crear copia', exact: true }).click();
  const manual = page
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: 'Manual', exact: true }) })
    .first();
  await expect(manual).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await manual.getByRole('button', { name: /Descargar copia/ }).click();
  const file = await downloaded;
  expect(file.suggestedFilename()).toContain('.bocha');
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
  await page.getByRole('navigation').getByRole('button', { name: 'Usuarios', exact: true }).click();
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
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  for (const username of ['vendedor', 'supervisor']) {
    await page.getByLabel('Usuario', { exact: true }).fill(username);
    await page.getByLabel('Contraseña', { exact: true }).fill('Cuenta-Web-Prueba-2026!');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    const nav = page.getByRole('navigation', { name: 'Módulos' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button', { name: 'Resumen mensual', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0);
    if (username === 'vendedor') await expect(nav.getByRole('button')).toHaveCount(1);
    else await expect(nav.getByRole('button', { name: 'Stock', exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        async () => (await fetch('/api/v1/dashboard/monthly?month=2026-09')).status,
      ),
    ).toBe(403);
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
  }
});
