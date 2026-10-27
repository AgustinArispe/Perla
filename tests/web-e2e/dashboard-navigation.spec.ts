import { expect, test } from '@playwright/test';
import { openModule } from './navigation-helper';

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
  await openModule(page, 'Resultados');
  await expect(page.getByTestId('monthly-net')).toBeVisible();
  const month = page.getByLabel('Mes', { exact: true });
  const currentMonth = await month.inputValue();
  await expect(page.getByRole('button', { name: 'Mes siguiente', exact: true })).toBeDisabled();
  const day = page.locator('.daily-chart-day[data-peak=true]').first();
  await day.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.daily-chart-selection')).toContainText('Promedio');
  await expect(day).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ver ventas del día', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Estado', exact: true })).toHaveValue(
    'COMPLETED',
  );
  await page.getByRole('button', { name: 'Volver a Resultados', exact: true }).click();
  await expect(month).toHaveValue(currentMonth);
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

test('Resultados limita la dona a 25, compara meses y conserva negativos fuera del resumen', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Mostrar contraseña', exact: true }).click();
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña', exact: true }).click();
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.route('**/api/v1/dashboard/monthly?*', async (route) => {
    const response = await route.fetch();
    const payload = await response.json();
    const report = payload.value;
    const month = new URL(route.request().url()).searchParams.get('month')!;
    const negative = month === '2026-01';
    const rowCount = month === '2026-02' ? 28 : 31;
    report.definitionVersion = 2;
    report.daily = Array.from({ length: rowCount }, (_, i) => ({
      date: `${month}-${String(i + 1).padStart(2, '0')}`,
      netCents: i === 2 && negative ? -180000 : 100000 + (i % 7) * 20000,
      saleCount: i === 2 && negative ? 0 : 3,
    }));
    report.previousDaily = Array.from({ length: 31 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      netCents: 70000 + (i % 5) * 18000,
      saleCount: 2,
    }));
    report.period = {
      from: `${month}-01`,
      to: `${month}-${rowCount}`,
      previousFrom: '2026-01-01',
      previousTo: '2026-01-31',
      open: false,
    };
    const productCount = negative ? 8 : 40;
    report.rankings.revenue = Array.from({ length: productCount }, (_, i) => ({
      productId: String(i),
      name:
        i === 7 && negative
          ? 'Devolución fuera del Top 5'
          : ([
              'Merluza fresca',
              'Langostino pelado',
              'Filet de salmón',
              'Calamar limpio',
              'Mejillones',
              'Cornalitos',
              'Abadejo',
              'Otros pescados',
            ][i] ?? `Artículo ${i + 1}`),
      unit: 'KG',
      quantityBase: i === 7 && negative ? -1000 : (productCount - i) * 1000,
      netCents: i === 7 && negative ? -100000 : (productCount - i) * 110000,
    }));
    report.categorySales = Array.from({ length: 14 }, (_, i) => ({
      name: `Categoría ${i + 1}`,
      netCents: negative && i === 13 ? -100000 : (14 - i) * 110000,
    }));
    report.totals.netCents = report.rankings.revenue.reduce(
      (sum: number, row: { netCents: number }) => sum + row.netCents,
      0,
    );
    report.payments = [
      {
        method: 'CASH',
        amountCents: 2400000,
        saleCount: 28,
        refundCount: 0,
        shareBasisPoints: 0,
        saleShareBasisPoints: 10000,
      },
      {
        method: 'DEBIT',
        amountCents: negative ? -100000 : 1400000,
        saleCount: 0,
        refundCount: negative ? 1 : 0,
        shareBasisPoints: 0,
        saleShareBasisPoints: 0,
      },
    ];
    await route.fulfill({ response, json: payload });
  });
  await openModule(page, 'Resumen mensual');
  await page.getByLabel('Mes', { exact: true }).fill('2026-02');
  const products = page.locator('.results-products');
  const categories = page.locator('.results-categories');
  await expect(products.locator('.results-donut')).toBeVisible();
  await expect(products.locator('.results-share-legend li')).toHaveCount(25);
  await expect(products.locator('.results-donut circle')).toHaveCount(26);
  await expect(products.locator('.results-donut-center')).toContainText('Top 25');
  await expect(products.locator('.results-share-legend li').last()).toContainText('Artículo 25');
  await expect(products.locator('.results-share-legend')).not.toContainText('Artículo 26');
  await expect(categories.locator('.results-share-legend li')).toHaveCount(10);
  await expect(categories.locator('.results-donut circle')).toHaveCount(11);
  await expect(categories.locator('.results-donut-center')).toContainText('Top 10');
  await expect(page.locator('.results-products')).toContainText('no se incluyen en esta dona');
  await expect(page.locator('.ranking-table tbody tr')).toHaveCount(0);
  await page.getByText('Ver detalle de los 25 productos principales', { exact: true }).click();
  await expect(page.locator('.ranking-table tbody tr')).toHaveCount(25);
  await expect(page.locator('.ranking-table')).not.toContainText('Artículo 26');
  await page.getByText('Ver detalle de los 25 productos principales', { exact: true }).click();
  await expect(page.locator('.ranking-table tbody tr')).toHaveCount(0);
  const legend = page.getByRole('list', { name: 'Participación de los productos principales' });
  await legend.focus();
  await legend.press('End');
  await expect.poll(() => legend.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page
    .locator('.results-products')
    .screenshot({ path: testInfo.outputPath('top-25-desktop.png') });
  await page.getByLabel('Comparar con el mes anterior').check();
  await expect(page.locator('.results-day')).toHaveCount(31);
  await page.locator('.results-day').last().click();
  await expect(page.locator('.daily-chart-selection')).toContainText(
    'No existe un día equivalente',
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.screenshot({
    path: testInfo.outputPath('results-comparison-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('results-comparison-mobile.png'),
    fullPage: true,
  });
  for (const width of [1920, 1366, 1024, 768]) {
    await page.setViewportSize({ width, height: 1080 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByLabel('Mes', { exact: true }).fill('2026-01');
  await expect(page.locator('.results-donut')).toHaveCount(0);
  await expect(page.locator('.results-product-bars')).toContainText('Devolución fuera del Top 5');
  await expect(page.locator('.results-payments')).toContainText('Reembolsos mayores que pagos');
});
