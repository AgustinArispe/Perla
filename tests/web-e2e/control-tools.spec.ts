import { test, expect } from '@playwright/test';
import { openModule } from './navigation-helper';
test('Inicio, vistas, resumen semanal y actividad en escritorio y móvil', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  for (const title of ['Inicio', 'Controles', 'Resumen semanal', 'Actividad']) {
    await openModule(page, title);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  }
  await openModule(page, 'Controles');
  const countButton = await page
    .getByRole('button', { name: 'Iniciar conteo', exact: true })
    .boundingBox();
  const locationControl = await page
    .getByRole('combobox', { name: 'Ubicación', exact: true })
    .boundingBox();
  expect(countButton!.height).toBe(44);
  expect(
    Math.abs(countButton!.y + countButton!.height - locationControl!.y - locationControl!.height),
  ).toBeLessThan(2);
  await page.screenshot({
    path: 'output/ui-ux-implementation/2026-10-07/stock-controls-balanced.png',
  });
  await openModule(page, 'Resumen semanal');
  await expect(page.getByRole('heading', { name: 'Resumen semanal', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'Resumen semanal', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
