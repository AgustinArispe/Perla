import { openModule } from './navigation-helper';
import { test, expect } from '@playwright/test';

test('Alta de productos: escanear no guarda y permite cargar varios sin perder clasificación', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await openModule(page, 'Productos');
  await page.getByRole('button', { name: /Nuevo producto/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Nuevo producto', exact: true });
  const suffix = Date.now().toString();
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/products')
      writes++;
  });
  await dialog.getByLabel('Nombre del producto').fill(`Carga fluida A ${suffix}`);
  await dialog.getByLabel('Precio de venta').fill('1500');
  await dialog.getByLabel('Código de barras', { exact: true }).fill(`SCAN-${suffix}`);
  await dialog.getByLabel('Código de barras', { exact: true }).press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guardar producto', exact: true })).toBeFocused();
  expect(writes).toBe(0);
  await dialog.getByText('Más opciones', { exact: true }).click();
  await dialog.getByRole('button', { name: 'Nueva categoría', exact: true }).click();
  const category = page.getByRole('dialog', { name: 'Nueva categoría', exact: true });
  await category.getByLabel('Nombre', { exact: true }).fill(`Categoría fluida ${suffix}`);
  await category.getByRole('button', { name: 'Guardar y seleccionar', exact: true }).click();
  await expect(category).not.toBeVisible();
  const categoryId = await dialog
    .getByRole('combobox', { name: 'Categoría', exact: true })
    .inputValue();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole('button', { name: 'Guardar producto', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    dialog.getByRole('button', { name: 'Guardar y cargar otro', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await dialog.getByRole('button', { name: 'Guardar y cargar otro', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('guardado');
  await expect(dialog.getByLabel('Nombre del producto')).toHaveValue('');
  await expect(dialog.getByLabel('Nombre del producto')).toBeFocused();
  await expect(dialog.getByLabel('Precio de venta')).toHaveValue('');
  await expect(dialog.getByLabel('Código de barras', { exact: true })).toHaveValue('');
  await expect(dialog.getByRole('combobox', { name: 'Categoría', exact: true })).toHaveValue(
    categoryId,
  );
  await dialog.getByLabel('Nombre del producto').fill(`Carga fluida B ${suffix}`);
  await dialog.getByLabel('Precio de venta').fill('1700');
  await dialog.getByRole('button', { name: 'Guardar y cargar otro', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText(`Carga fluida B ${suffix}`);
  await dialog.getByLabel('Nombre del producto').fill(`Carga fluida C ${suffix}`);
  await dialog.getByLabel('Precio de venta').fill('1800');
  await dialog.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(writes).toBe(3);
  const saved = await page.evaluate(async (query) => {
    const result = await (
      await fetch(`/api/v1/products?query=${encodeURIComponent(query)}&limit=50`)
    ).json();
    return result.value.items as { id: string; sku: string; categoryId: string }[];
  }, suffix);
  expect(saved).toHaveLength(3);
  expect(new Set(saved.map((product) => product.sku)).size).toBe(3);
  expect(saved.every((product) => product.categoryId === categoryId)).toBe(true);
});

test('Excel conserva el alcance al abrir y cerrar el ajuste de filtros', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await openModule(page, 'Productos');
  await page.getByRole('button', { name: 'Exportar productos a Excel', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(
    dialog.getByText('Incluye todos los resultados de los filtros, no solo esta página.'),
  ).toBeVisible();
  await expect(dialog.getByLabel('Buscar', { exact: true })).not.toBeVisible();
  await dialog.getByRole('button', { name: 'Ajustar filtros' }).click();
  await dialog.getByLabel('Buscar', { exact: true }).fill('arroz');
  await dialog.locator('summary').filter({ hasText: 'Estados' }).click();
  await dialog.getByRole('checkbox', { name: 'Activos', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Inactivos', exact: true }).check();
  await dialog.getByRole('button', { name: 'Cerrar ajuste de filtros' }).click();
  await expect(dialog.getByText('arroz', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Activos, Inactivos', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Ajustar filtros' }).click();
  await expect(dialog.getByLabel('Buscar', { exact: true })).toHaveValue('arroz');
  await expect(dialog.getByRole('checkbox', { name: 'Activos', exact: true })).toBeChecked();
  await expect(dialog.getByRole('checkbox', { name: 'Inactivos', exact: true })).toBeChecked();
});

test('Caja selecciona con teclado, conserva búsqueda en error y devuelve foco', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  const terminalId = await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const post = async (path: string, body: unknown) => {
      const result = await (
        await fetch('/api/v1' + path, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
          body: JSON.stringify(body),
        })
      ).json();
      if (!result.ok) throw new Error(path + ': ' + result.error.message);
      return result.value;
    };
    const terminal = await post('/terminals', { name: 'Caja búsqueda UI', active: true });
    for (const [sku, name] of [
      ['SEARCH-UI-A', 'Arroz búsqueda A'],
      ['SEARCH-UI-B', 'Arroz búsqueda B'],
    ]) {
      await post('/products', {
        sku,
        name,
        barcode: null,
        category: null,
        saleUnit: 'UNIT',
        priceCents: 12345,
        active: true,
        trackStock: false,
        minStockBase: 1,
      });
    }
    return terminal.id;
  });
  await page.reload();
  await openModule(page, 'Caja');
  await page.getByRole('combobox', { name: 'Terminal', exact: true }).selectOption(terminalId);
  await page.getByRole('button', { name: 'Usar terminal', exact: true }).click();
  await page.getByLabel('Efectivo inicial').fill('0');
  await page.getByRole('button', { name: 'Abrir caja', exact: true }).click();
  const opener = page.getByRole('button', { name: 'Buscar producto · F3', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Buscar producto', exact: true });
  const input = dialog.getByRole('combobox', { name: 'Nombre o código', exact: true });
  await expect(input).toBeFocused();
  await input.fill('Arroz búsqueda');
  await expect(dialog.getByRole('option')).toHaveCount(2);
  await input.press('ArrowDown');
  await expect(dialog.getByRole('option', { name: 'Agregar Arroz búsqueda B' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await input.press('Enter');
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de Arroz búsqueda B', exact: true }),
  ).toBeVisible();
  await opener.click();
  await page.route(
    '**/api/v1/products?**',
    (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: false,
          error: {
            code: 'INTERNAL',
            retryable: true,
            message: 'Búsqueda temporalmente no disponible',
          },
        }),
      }),
    { times: 1 },
  );
  await input.fill('consulta fallida');
  await expect(dialog.getByRole('alert')).toContainText('Búsqueda temporalmente no disponible');
  await expect(input).toHaveValue('consulta fallida');
  await dialog.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(
    dialog.getByText('No hay productos con esa búsqueda.', { exact: true }),
  ).toBeVisible();
  await input.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByLabel('Escanear código', { exact: true })).toBeFocused();
});

test('El alta de categoría y marca conserva el producto y los filtros al volver', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await openModule(page, 'Productos');
  await page.getByRole('button', { name: /Nuevo producto/ }).click();
  const product = page.getByRole('dialog', { name: 'Nuevo producto', exact: true });
  await product.getByLabel('Nombre del producto').fill('Producto que no debe perderse');
  await product.getByLabel('Precio de venta').fill('100');
  await product.getByText('Más opciones', { exact: true }).click();
  for (const [kind, name] of [
    ['categoría', 'Categoría contextual'],
    ['marca', 'Marca contextual'],
  ] as const) {
    await product.getByRole('button', { name: `Nueva ${kind}`, exact: true }).click();
    const child = page.getByRole('dialog', { name: `Nueva ${kind}`, exact: true });
    await child.getByLabel('Nombre', { exact: true }).fill(name);
    await child.getByRole('button', { name: 'Guardar y seleccionar', exact: true }).click();
    await expect(child).not.toBeVisible();
    await expect(
      product.getByRole('combobox', {
        name: kind === 'categoría' ? 'Categoría' : 'Marca',
        exact: true,
      }),
    ).toHaveValue(/.+/);
    await expect(product.getByLabel('Nombre del producto')).toHaveValue(
      'Producto que no debe perderse',
    );
    await expect(product.getByLabel('Precio de venta')).toHaveValue('100');
  }
  await product.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const search = page.getByPlaceholder('Buscar por nombre, código o código interno');
  await search.fill('consulta que se conserva');
  await openModule(page, 'Stock');
  await openModule(page, 'Productos');
  await expect(search).toHaveValue('consulta que se conserva');
  await page.getByRole('button', { name: 'Ayuda', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Buscar en la ayuda' }).fill('caja scanner');
  await expect(page.getByRole('heading', { name: 'Escanear y buscar', exact: true })).toBeVisible();
});
