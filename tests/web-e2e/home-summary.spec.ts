import { test, expect } from '@playwright/test';
import { openModule } from './navigation-helper';

test('Inicio: resumen útil, pendientes bajo demanda y accesos correctos en escritorio y móvil', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible();
  await expect(page.getByLabel('Ventas de hoy y de la semana')).toBeVisible();
  await expect(page.getByLabel('Estado de las cajas')).toBeVisible();
  await page.getByRole('button', { name: 'Ver resultados', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resultados', exact: true })).toBeVisible();
  await openModule(page, 'Inicio');
  await page.route('**/api/v1/control', async (route) => {
    const request = route.request().postDataJSON();
    if (request.area !== 'workspace' || request.action !== 'home') return route.continue();
    const response = await route.fetch();
    const result = await response.json();
    result.value.groups = [
      {
        key: 'qa-expiries',
        title: 'Revisar vencimientos',
        total: 12,
        area: 'operations',
        action: 'expiries',
        sample: [{ id: 'qa-lot', name: 'Leche entera 1 L', detail: '2026-10-12' }],
      },
    ];
    result.value.overview.today = {
      ...result.value.overview.today,
      saleCount: 42,
      netCents: 135600000,
      averageCents: 3228571,
    };
    result.value.overview.week = {
      ...result.value.overview.week,
      saleCount: 234,
      netCents: 768900000,
    };
    result.value.overview.lastSaleDate = result.value.overview.businessDate;
    result.value.registers = [
      { id: 'qa-register', name: 'Caja 1', operator: 'Andrea', openedAt: new Date().toISOString() },
    ];
    result.value.accounts = {
      receivableCents: 42000000,
      payableCents: 68000000,
      overdueReceivableCents: 1000000,
      overduePayableCents: 0,
    };
    await route.fulfill({ response, json: result });
  });
  await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await expect(page.getByText('Te deben clientes', { exact: true })).toBeVisible();
  await expect(page.getByText('Leche entera 1 L', { exact: true })).not.toBeVisible();
  await page.locator('.home-pending summary').click();
  await expect(page.getByText('Leche entera 1 L', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('home-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByText('Vendido hoy', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('home-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Vender', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Elegir terminal', exact: true })).toBeVisible();
});
