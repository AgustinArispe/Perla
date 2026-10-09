import { openModule } from './navigation-helper';
import { test, expect } from '@playwright/test';

test('web real: crea una promoción responsive y cotiza el ahorro', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(nav).toBeVisible();
  const barcode = `7798${String(Date.now()).slice(-9)}`;
  await openModule(page, 'Productos');
  await page.getByRole('button', { name: /Nuevo producto/ }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre del producto').fill('Langostinos para promoción');
  await dialog.getByLabel('Precio de venta').fill('1000');
  await dialog.getByLabel('Código de barras').fill(barcode);
  await dialog.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await openModule(page, 'Configuración');
  await page.getByRole('tab', { name: 'Funciones', exact: true }).click();
  const promotionSwitch = page.getByRole('switch', { name: 'Promociones', exact: true });
  if ((await promotionSwitch.getAttribute('aria-checked')) !== 'true') {
    await promotionSwitch.click();
    await page.getByRole('button', { name: 'Aplicar cambios', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Confirmar cambios', exact: true })
      .click();
    await expect(promotionSwitch).toHaveAttribute('aria-checked', 'true');
  }
  await page.getByRole('tab', { name: 'Terminales', exact: true }).click();
  const terminalName = `Caja promo ${String(Date.now()).slice(-5)}`;
  await page.getByRole('button', { name: 'Crear terminal', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nombre', { exact: true }).fill(terminalName);
  await dialog.getByRole('button', { name: 'Guardar terminal', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await openModule(page, 'Promociones');
  await expect(page.getByRole('heading', { name: 'Promociones', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nueva promoción', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Tipo de promoción')).toHaveValue('PERCENT');
  await expect(dialog.getByLabel('Nombre')).toHaveValue('10% de ahorro');
  await dialog.getByLabel('Nombre').fill('Semana del langostino');
  await dialog.getByPlaceholder('Buscar productos').fill('Langostinos para promoción');
  await dialog.getByRole('button', { name: /Langostinos para promoción/ }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/frontend-promocion-mobile.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Activar promoción', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.promotion-card')).toContainText('Semana del langostino');
  await page.setViewportSize({ width: 1280, height: 720 });
  await openModule(page, 'Caja');
  await page.locator('.register-setup select').selectOption({ label: terminalName });
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('0');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  const scanner = page.locator('.scanner-field input');
  await scanner.fill(barcode);
  await scanner.press('Enter');
  await expect(page.locator('.checkout-promotions')).toContainText('Semana del langostino');
  await expect(page.locator('.checkout-total')).toContainText('$ 900,00');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'tmp/frontend-caja-promocion-mobile.png', fullPage: true });
});
