import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';

test('crear, editar, buscar y desactivar con datos persistidos y teclado', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-catalog-ui-'));
  const application = await electron.launch({
    ...(process.env.BOCHA_E2E_EXECUTABLE
      ? { executablePath: process.env.BOCHA_E2E_EXECUTABLE }
      : { args: ['.'] }),
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      BOCHA_TEST_USER_DATA: directory,
    },
  });
  try {
    const page = await application.firstWindow();
    await expect(page.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible();
    await page.keyboard.press('F3');
    const form = page.getByRole('dialog');
    await form.getByLabel('Código interno').fill('LAC-01');
    await form.getByLabel('Código de barras').fill('0123456789012');
    await form.getByLabel('Nombre del producto').fill('Leche entera 1 L');
    await form.getByLabel('Precio de venta').fill('1.500,50');
    await form.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(form).not.toBeVisible();
    await page.keyboard.press('F2');
    await expect(page.getByRole('searchbox', { name: 'Buscar productos' })).toBeFocused();
    await page.keyboard.type('0123456789012');
    await expect(page.getByRole('button', { name: 'Editar Leche entera 1 L' })).toBeVisible();
    await page.getByRole('button', { name: 'Editar Leche entera 1 L' }).click();
    await form.getByLabel('Precio de venta').fill('1.800,50');
    await form.getByLabel('Activo', { exact: true }).uncheck();
    await page.keyboard.press('Control+s');
    await expect(form).not.toBeVisible();
    await expect(page.getByText('$ 1.800,50', { exact: false })).toBeVisible();
    await expect(page.getByText('Inactivo', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(async () => {
        const result = await window.bocha!.products.search({
          query: 'leche',
          activeOnly: true,
          limit: 20,
        });
        return result.ok ? result.value.total : -1;
      }),
    ).toBe(0);
    await page.keyboard.press('F3');
    await form.getByLabel('Código interno').fill('LAC-02');
    await form.getByLabel('Código de barras').fill('0123456789012');
    await form.getByLabel('Nombre del producto').fill('Otra leche');
    await form.getByLabel('Precio de venta').fill('2000');
    await form.getByRole('button', { name: 'Guardar producto' }).click();
    await expect(form.getByRole('alert')).toContainText('ya existe');
    await expect(form.getByLabel('Nombre del producto')).toHaveValue('Otra leche');
    await page.keyboard.press('Escape');
    await expect(form).not.toBeVisible();
    await expect(page.getByRole('searchbox', { name: 'Buscar productos' })).toBeFocused();
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('elegir CSV, revisar errores y aplicar una carga sin duplicarla', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-import-ui-'));
  const file = join(directory, 'productos.csv');
  writeFileSync(
    file,
    'sku;barcode;nombre;precio_ars;unidad;activo;categoria;stock_inicial;stock_minimo\nFIAM-01;;Jamón cocido;12.000,50;KG;si;Fiambres;;0,500',
  );
  const application = await electron.launch({
    ...(process.env.BOCHA_E2E_EXECUTABLE
      ? { executablePath: process.env.BOCHA_E2E_EXECUTABLE }
      : { args: ['.'] }),
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      BOCHA_TEST_USER_DATA: directory,
    },
  });
  try {
    await application.evaluate(({ dialog }, filePath) => {
      Object.assign(dialog, {
        showOpenDialog: async () => ({ canceled: false, filePaths: [filePath] }),
      });
    }, file);
    const page = await application.firstWindow();
    await page.getByRole('button', { name: 'Importar productos' }).click();
    const preview = page.getByRole('dialog');
    await expect(preview.getByRole('heading', { name: 'Revisar carga' })).toBeVisible();
    await expect(preview.getByText('Jamón cocido', { exact: true })).toBeVisible();
    await preview.getByRole('button', { name: 'Aplicar carga' }).click();
    await expect(preview).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar Jamón cocido' })).toBeVisible();
    await page.getByRole('button', { name: 'Importar productos' }).click();
    await expect(preview.getByText('Este archivo ya fue aplicado.', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    writeFileSync(
      file,
      'sku;barcode;nombre;precio_ars;unidad;activo;categoria;stock_inicial;stock_minimo\nBAD;;Precio inválido;wrong;UNIT;si;;;0',
    );
    await page.getByRole('button', { name: 'Importar productos' }).click();
    await expect(preview.getByText('Fila 2', { exact: true })).toBeVisible();
    await expect(preview.getByRole('button', { name: 'Aplicar carga' })).toBeDisabled();
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
