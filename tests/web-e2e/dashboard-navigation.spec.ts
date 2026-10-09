import { expect, test } from '@playwright/test';

test('el dashboard conserva el mes elegido y permite consultar días con teclado y celular', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('navigation', { name: 'Módulos' }).waitFor();
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
    const terminal = await post('/terminals', { name: 'Caja prueba dashboard', active: true });
    await post('/auth/terminal', { terminalId: terminal.id });
    await post('/cash/open', {
      terminalId: terminal.id,
      openingCashCents: 200000,
      operationKey: crypto.randomUUID(),
    });
    const product = await post('/products', {
      sku: 'DASHBOARD-DAY',
      barcode: 'DASHBOARD-DAY',
      name: 'Artículo para gráfico diario',
      category: null,
      saleUnit: 'UNIT',
      priceCents: 100000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    await post('/sales', {
      checkoutKey: crypto.randomUUID(),
      lines: [
        {
          lineId: crypto.randomUUID(),
          productId: product.id,
          quantityBase: 1,
          expectedProductRevision: product.revision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'DEBIT', amountCents: 100000 }],
    });
  });
  await page
    .getByRole('navigation', { name: 'Módulos' })
    .getByRole('button', { name: 'Resultados', exact: true })
    .click();
  await expect(page.getByTestId('monthly-net')).toBeVisible();
  const month = page.getByLabel('Mes', { exact: true });
  const currentMonth = await month.inputValue();
  await expect(page.getByRole('button', { name: 'Mes siguiente', exact: true })).toBeDisabled();
  const day = page.locator('.daily-chart-day[data-peak=true]').first();
  await day.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-chart-selection')).toContainText('Promedio');
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await month.fill('2000-01');
  await expect(page.getByTestId('monthly-net')).toHaveText('$ 0,00');
  await page.getByRole('button', { name: 'Explorar períodos', exact: true }).click();
  await expect(page.locator('.comparison-result article > strong')).toHaveText('$ 0,00');
  await expect(page.getByLabel('Desde', { exact: true })).toHaveValue('2000-01-01');
  await expect(page.getByLabel('Hasta', { exact: true })).toHaveValue('2000-01-31');
  await expect(page.locator('.comparison-result')).toContainText('ene');
  await expect(page.locator('.daily-chart-selection')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mes anterior', exact: true }).click();
  await expect(month).toHaveValue('1999-12');
  await page.getByRole('button', { name: 'Mes actual', exact: true }).click();
  await expect(month).toHaveValue(currentMonth);
  await expect(page.locator('.daily-chart-day')).not.toHaveCount(0);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'tmp/results-1440.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.daily-chart-day').last().click();
  await expect(page.locator('.daily-chart-selection')).toBeVisible();
  await page.screenshot({ path: 'tmp/results-390.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await page.locator('.daily-chart-day').first().boundingBox())!.width,
  ).toBeGreaterThanOrEqual(44);
  const numberType = await page
    .locator('.dashboard-metrics-secondary strong')
    .first()
    .evaluate((element) => ({
      parent: getComputedStyle(element).fontSize,
      value: getComputedStyle(element.querySelector('.dashboard-animated-value')!).fontSize,
    }));
  expect(numberType.value).toBe(numberType.parent);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reducedMotion = await page
    .locator('.daily-chart-day span')
    .first()
    .evaluate((element) => ({
      transform: getComputedStyle(element).transform,
      durations: getComputedStyle(element)
        .transitionDuration.split(',')
        .map((duration) => parseFloat(duration)),
    }));
  expect(reducedMotion.transform).toBe('none');
  expect(reducedMotion.durations.every((duration) => duration <= 0.02)).toBe(true);
  await page.getByRole('button', { name: 'Cerrar detalle del día', exact: true }).click();
  await page.locator('.daily-chart-day').last().focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-chart-selection')).toHaveAttribute('data-motion', 'instant');
  await page.getByRole('button', { name: 'Semanal', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Resumen semanal', exact: true })).toBeVisible();
  await expect(page.locator('.weekly-totals dd')).toHaveCount(4);
  await expect(page.locator('.weekly-report')).toContainText('Resumen guardado');
  await expect(page.getByRole('button', { name: 'Recalcular conservando versión' })).toBeHidden();
  await page.getByText('Actualizar informe guardado', { exact: true }).click();
  await expect(page.getByRole('button', { name: 'Recalcular conservando versión' })).toBeVisible();
  await expect(page.locator('.weekly-report')).toContainText('conserva las anteriores');
  await page.getByText('Actualizar informe guardado', { exact: true }).click();
  await page.screenshot({ path: 'tmp/weekly-390.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'tmp/weekly-1440.png', fullPage: true });
});
