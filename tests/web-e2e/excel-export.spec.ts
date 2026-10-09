import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';
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
    .getByRole('button', { name: 'Administración', exact: true })
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
