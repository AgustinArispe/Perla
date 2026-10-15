import { openModule } from './navigation-helper';
import { expect, test } from '@playwright/test';

test('web real: avisa stock bajo y compara períodos en celular', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await openModule(page, 'Configuración');
  await page.getByRole('tab', { name: 'Funciones', exact: true }).click();
  const notifications = page.getByRole('switch', { name: 'Notificaciones' });
  if ((await notifications.getAttribute('aria-checked')) !== 'true') {
    await notifications.click();
    await page.getByRole('button', { name: 'Aplicar cambios' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirmar cambios' }).click();
  }
  await openModule(page, 'Productos');
  await page.getByRole('button', { name: /Nuevo producto/ }).click();
  await page.getByLabel('Nombre del producto').fill('Salmón alerta web');
  await page.getByLabel('Precio de venta').fill('12500,00');
  await page.getByLabel('Código de barras').fill('7799999000019');
  await page.getByText('Más opciones', { exact: true }).click();
  await page.getByLabel('Mínimo para reponer (unidades)').fill('5');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await openModule(page, 'Stock');
  await page.getByPlaceholder('Buscar por nombre o código').fill('Salmón alerta web');
  await page.getByRole('button', { name: 'Contar Salmón alerta web' }).click();
  await page.getByLabel('Cantidad contada').fill('2');
  await page.getByLabel('Motivo').fill('Conteo de prueba web');
  await page.getByRole('button', { name: 'Guardar conteo' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();

  const bell = page.getByRole('button', { name: /Notificaciones/ });
  await bell.click();
  await expect(page.getByText('Salmón alerta web con poco stock')).toBeVisible();
  await page.getByText('Salmón alerta web con poco stock').click();
  await expect(page.getByRole('heading', { name: 'Stock', exact: true })).toBeVisible();

  await openModule(page, 'Resumen mensual');
  await page.getByRole('button', { name: 'Explorar períodos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Explorar períodos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await expect(page.locator('.comparison-result')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Rango', exact: true }).click();
  await expect(page.getByLabel('Desde')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
