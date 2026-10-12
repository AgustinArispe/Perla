import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
import { openModule } from './navigation-helper';

test('Excel de Perla exporta filas elegidas entre páginas y conserva números y códigos', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page.getByRole('navigation', { name: 'Módulos' }).waitFor({ state: 'attached' });
  await page.evaluate(async () => {
    const auth = (await (await fetch('/api/v1/auth/session')).json()).value;
    for (let i = 0; i < 55; i++) {
      const result = await (
        await fetch('/api/v1/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-csrf-token': auth.csrfToken },
          body: JSON.stringify({
            sku: `PICK-${i}`,
            name: `Artículo Perla ${String(i).padStart(2, '0')}`,
            barcode: `0001234567${String(i).padStart(3, '0')}`,
            category: null,
            saleUnit: 'UNIT',
            priceCents: 12345,
            active: true,
            trackStock: false,
            minStockBase: 0,
          }),
        })
      ).json();
      if (!result.ok) throw new Error(result.error.message);
    }
    const features = (await (await fetch('/api/v1/settings/features')).json()).value;
    const result = await (
      await fetch('/api/v1/settings/features', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-csrf-token': auth.csrfToken },
        body: JSON.stringify({
          expectedRevision: features.revision,
          enabled: { COSTS_MARGIN: true },
        }),
      })
    ).json();
    if (!result.ok) throw new Error(result.error.message);
  });
  await page.reload();
  await openModule(page, 'Productos');
  await page.getByPlaceholder(/Buscar por nombre, código/).fill('Artículo Perla');
  await page.getByRole('button', { name: 'Exportar productos a Excel', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Elegir filas', exact: true }).click();
  await dialog
    .getByRole('checkbox', { name: 'Seleccionar Artículo Perla 00', exact: true })
    .check();
  await dialog.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await dialog
    .getByRole('checkbox', { name: 'Seleccionar Artículo Perla 50', exact: true })
    .check();
  await expect(dialog.getByRole('status')).toHaveText('2 filas seleccionadas');
  await dialog.getByRole('button', { name: 'Anterior', exact: true }).click();
  await expect(
    dialog.getByRole('checkbox', { name: 'Seleccionar Artículo Perla 00', exact: true }),
  ).toBeChecked();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole('button', { name: 'Descargar Excel', exact: true })).toBeInViewport(
    { ratio: 1 },
  );
  const download = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
  const file = await download;
  const path = testInfo.outputPath('perla-seleccion.xlsx');
  await file.saveAs(path);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load((await readFile(path)) as never);
  const sheet = book.getWorksheet('Productos')!;
  expect(sheet.rowCount).toBe(3);
  expect(sheet.getColumn(1).values.filter(Boolean)).toEqual([
    'Producto',
    'Artículo Perla 00',
    'Artículo Perla 50',
  ]);
  expect(sheet.getCell('C2').value).toBe('0001234567000');
  expect(sheet.getCell('G2').value).toBe(123.45);
  expect(book.creator).toBe('Perla');
  expect(book.getWorksheet('Perla')!.getImages()).toHaveLength(1);
  expect(book.getWorksheet('Filtros')!.getColumn(2).values).toContain('Artículo Perla');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByPlaceholder(/Buscar por nombre, código/).fill('Artículo Perla 00');
  await page.getByRole('checkbox', { name: 'Seleccionar Artículo Perla 00', exact: true }).check();
  await page.getByPlaceholder(/Buscar por nombre, código/).fill('Artículo Perla 54');
  await page.getByRole('checkbox', { name: 'Seleccionar Artículo Perla 54', exact: true }).check();
  await expect(page.locator('.catalog-selection-bar')).toContainText('2 productos seleccionados');
  await page.getByPlaceholder(/Buscar por nombre, código/).fill('Artículo Perla 00');
  await expect(
    page.getByRole('checkbox', { name: 'Seleccionar Artículo Perla 00', exact: true }),
  ).toBeChecked();
  const listDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar productos a Excel', exact: true }).click();
  const listPath = testInfo.outputPath('perla-desde-catalogo.xlsx');
  await (await listDownload).saveAs(listPath);
  const listBook = new ExcelJS.Workbook();
  await listBook.xlsx.load((await readFile(listPath)) as never);
  expect(listBook.getWorksheet('Productos')!.getColumn(1).values.filter(Boolean)).toEqual([
    'Producto',
    'Artículo Perla 00',
    'Artículo Perla 54',
  ]);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Limpiar selección', exact: true }).click();
  await expect(page.locator('.catalog-selection-bar')).not.toBeVisible();
  await openModule(page, 'Revisión');
  await page.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
  const control = page.getByRole('dialog', { name: 'Exportar Excel', exact: true });
  await control.getByRole('button', { name: 'Elegir filas', exact: true }).click();
  await control
    .getByRole('checkbox', { name: 'Seleccionar Artículo Perla 00', exact: true })
    .check();
  const controlDownload = page.waitForEvent('download');
  await control.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
  const controlPath = testInfo.outputPath('perla-control.xlsx');
  await (await controlDownload).saveAs(controlPath);
  const controlBook = new ExcelJS.Workbook();
  await controlBook.xlsx.load((await readFile(controlPath)) as never);
  expect(controlBook.getWorksheet('Productos')!.rowCount).toBe(2);
  expect(controlBook.getWorksheet('Productos')!.getCell('A2').value).toBe('Artículo Perla 00');
});
test('Excel: filtros actuales, descarga real y diálogo usable en celular', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Módulos' })
    .getByRole('button', { name: 'Productos', exact: true })
    .click();
  await page.getByRole('button', { name: /Nuevo producto/ }).click();
  await page.getByLabel('Nombre del producto').fill('Exportación Excel QA');
  await page.getByLabel('Precio de venta').fill('123,45');
  await page.getByRole('button', { name: 'Guardar producto' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByPlaceholder(/Buscar por nombre, código/).fill('Exportación Excel QA');
  await expect(
    page
      .locator('.catalog-toolbar')
      .getByRole('button', { name: 'Exportar productos a Excel', exact: true }),
  ).toHaveText('Exportar Excel');
  await page.getByRole('button', { name: 'Exportar productos a Excel', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Ajustar filtros' }).click();
  await expect(dialog.getByLabel('Buscar', { exact: true })).toHaveValue('Exportación Excel QA');
  await dialog.locator('summary').filter({ hasText: 'Estados' }).click();
  await dialog.getByRole('checkbox', { name: 'Activos', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Inactivos', exact: true }).check();
  await dialog.locator('summary').filter({ hasText: 'Estados' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    dialog.getByRole('button', { name: 'Descargar Excel', exact: true }),
  ).toBeInViewport();
  await dialog.locator('summary').filter({ hasText: 'Guardar estos filtros' }).click();
  await dialog.getByLabel('Nombre', { exact: true }).fill('Exportación con ambos estados');
  await dialog.getByRole('button', { name: 'Guardar vista', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Vista guardada' })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Descargar Excel', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
  const path = testInfo.outputPath('productos.xlsx');
  await download.saveAs(path);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await readFile(path)) as never);
  const sheet = workbook.getWorksheet('Productos')!;
  expect(sheet.rowCount).toBe(2);
  expect(sheet.getCell('A2').value).toBe('Exportación Excel QA');
  expect(sheet.getCell('G2').value).toBe(123.45);
  expect(workbook.getWorksheet('Filtros')!.getColumn(2).values).toContain('Exportación Excel QA');
  expect(workbook.getWorksheet('Filtros')!.getColumn(2).values).toContain('Activo, Inactivo');
  await expect(dialog).not.toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Mis vistas', exact: true }).click();
  await page
    .getByRole('button', { name: 'Exportación con ambos estados · Excel', exact: true })
    .click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ajustar filtros' }).click();
  await expect(page.getByRole('dialog').getByLabel('Buscar', { exact: true })).toHaveValue(
    'Exportación Excel QA',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Volver', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Módulos' })
    .getByRole('button', { name: 'Configuración', exact: true })
    .click();
  await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
  await page.getByLabel('Buscar usuarios').fill('jefe');
  await page.getByRole('combobox', { name: 'Rol', exact: true }).selectOption('OWNER');
  await page.getByRole('button', { name: 'Exportar usuarios a Excel', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Ajustar filtros' }).click();
  await expect(page.getByRole('dialog').getByLabel('Buscar', { exact: true })).toHaveValue('jefe');
  await page.getByRole('dialog').locator('summary').filter({ hasText: 'Roles' }).click();
  await expect(
    page.getByRole('dialog').getByRole('checkbox', { name: 'Jefe', exact: true }),
  ).toBeChecked();
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Supervisor', exact: true }).check();
  const userDownload = page.waitForEvent('download');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Descargar Excel', exact: true })
    .click();
  const userPath = testInfo.outputPath('usuarios.xlsx');
  await (await userDownload).saveAs(userPath);
  const userBook = new ExcelJS.Workbook();
  await userBook.xlsx.load((await readFile(userPath)) as never);
  expect(userBook.getWorksheet('Usuarios')!.rowCount).toBe(2);
  expect(userBook.getWorksheet('Usuarios')!.getCell('B2').value).toBe('jefe');
});
