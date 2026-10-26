import { test, expect, type Page } from '@playwright/test';
import { openModule } from './navigation-helper';
const password = 'Prueba-Web-Bocha-2026!';
async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
}
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
}
test('BiEmpresa opcional: configurar, asignar usuario, cobrar identificado y conservar historial al pausar', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await login(page);
  await expect(page.locator('.app-shell')).not.toHaveAttribute('data-business-unit', /./);
  await openModule(page, 'Configuración');
  await expect(page.getByRole('tab', { name: 'BiEmpresa', exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Funciones', exact: true }).click();
  await page.getByRole('switch', { name: 'BiEmpresa · unidades operativas', exact: true }).click();
  await page.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
  await page.getByRole('button', { name: 'Confirmar cambios', exact: true }).click();
  await page.getByRole('tab', { name: 'BiEmpresa', exact: true }).click();
  await page.getByRole('button', { name: 'Cambiar nombre de Segunda unidad', exact: true }).click();
  await page.getByLabel('Nombre de la unidad', { exact: true }).fill('Empresa Y');
  await page.getByRole('button', { name: 'Guardar nombre', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Empresa Y', exact: true })).toBeVisible();
  await openModule(page, 'Usuarios');
  await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
  const user = page.getByRole('dialog');
  await user.locator('[name=name]').fill('Caja Empresa Y');
  await user.locator('[name=username]').fill('bimostrador');
  await user.locator('[name=password]').fill(password);
  await user
    .getByRole('combobox', { name: 'Unidad operativa', exact: true })
    .selectOption({ label: 'Empresa Y' });
  await user.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
  await expect(user).not.toBeVisible();
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    async function post(path: string, body: unknown) {
      const result = await (
        await fetch('/api/v1' + path, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
          body: JSON.stringify(body),
        })
      ).json();
      if (!result.ok) throw new Error(result.error.message);
      return result.value;
    }
    await post('/terminals', { name: 'Caja BiEmpresa', active: true });
    await post('/products', {
      sku: 'BI-PROD',
      name: 'Artículo compartido',
      barcode: '7791112223334',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 1000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
  });
  await logout(page);
  await login(page, 'bimostrador');
  await expect(page.locator('.app-shell')).toHaveAttribute('data-business-unit', 'secondary');
  await expect(page.getByLabel('Unidad operativa activa')).toContainText('Empresa Y');
  await openModule(page, 'Caja');
  await page
    .getByRole('combobox', { name: 'Terminal', exact: true })
    .selectOption({ label: 'Caja BiEmpresa' });
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('0');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  const scan = page.getByLabel('Escanear código', { exact: true });
  await scan.fill('7791112223334');
  await scan.press('Enter');
  await expect(page.locator('.checkout-lines')).toContainText('Artículo compartido');
  await page.screenshot({ path: testInfo.outputPath('biempresa-dorado.png') });
  await page.keyboard.press('F8');
  await expect(page.getByRole('dialog', { name: 'Cobrar venta', exact: true })).toContainText(
    'Venta de Empresa Y',
  );
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  const receipt = page.getByRole('dialog', { name: 'Comprobante de venta', exact: true });
  await expect(receipt).toContainText('Unidad operativa: Empresa Y');
  await receipt
    .locator('.dialog-footer')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('biempresa-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await logout(page);
  await login(page);
  await openModule(page, 'Histórico');
  await page
    .getByRole('combobox', { name: 'Unidad operativa', exact: true })
    .selectOption({ label: 'Empresa Y' });
  await expect(page.getByRole('row').filter({ hasText: 'Empresa Y' })).toHaveCount(1);
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const current = (await (await fetch('/api/v1/settings/features')).json()).value;
    const result = await (
      await fetch('/api/v1/settings/features', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({
          expectedRevision: current.revision,
          enabled: { BUSINESS_UNITS: false },
        }),
      })
    ).json();
    if (!result.ok) throw new Error(result.error.message);
  });
  await page.reload();
  await expect(page.locator('.app-shell')).not.toHaveAttribute('data-business-unit', /./);
  await openModule(page, 'Histórico');
  await expect(page.getByRole('combobox', { name: 'Unidad operativa', exact: true })).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Unidad operativa', exact: true })
    .selectOption({ label: 'Empresa Y' });
  await expect(page.getByRole('row').filter({ hasText: 'Empresa Y' })).toHaveCount(1);
});
