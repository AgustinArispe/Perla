import { signIn } from './auth-helper';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { _electron as electron, expect, test } from '@playwright/test';
import type { StockRecordInput } from '../../src/shared/stock';

function launch(directory: string) {
  return electron.launch({
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
}

test('recupera un ingreso guardado sin confirmación después de reiniciar y no lo repite', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-stock-recovery-'));
  let application = await launch(directory);
  try {
    const first = await application.firstWindow();
    await signIn(first);
    await expect(first.getByText('Base de datos conectada', { exact: true })).toBeVisible();
    const productId = await first.evaluate(async () => {
      const saved = await window.bocha!.products.save({
        sku: 'RECOVER',
        name: 'Arroz',
        barcode: null,
        saleUnit: 'UNIT',
        priceCents: 200000,
        active: true,
        category: null,
        trackStock: true,
        minStockBase: 2,
      });
      if (!saved.ok) throw new Error(saved.error.message);
      const opened = await window.bocha!.stock.opening({
        productId: saved.value.id,
        countedBase: 3,
        reason: 'Conteo',
        operationKey: crypto.randomUUID(),
        expectedRevision: 0,
        expectedProductRevision: 1,
      });
      if (!opened.ok) throw new Error(opened.error.message);
      const pending = {
        action: 'record',
        name: 'Arroz',
        input: {
          productId: saved.value.id,
          deltaBase: 5,
          kind: 'RECEIPT',
          reason: 'Compra',
          operationKey: crypto.randomUUID(),
          expectedRevision: opened.value.revision,
          expectedProductRevision: opened.value.productRevision,
        },
      };
      // Model the exact commit/ack-loss boundary: intention survives while the SQL commit exists.
      localStorage.setItem('bocha.stock.pending.v1', JSON.stringify(pending));
      const received = await window.bocha!.stock.record(pending.input as StockRecordInput);
      if (!received.ok) throw new Error(received.error.message);
      return saved.value.id;
    });
    await application.close();
    application = await launch(directory);
    const page = await application.firstWindow();
    await signIn(page);
    await page.getByRole('button', { name: 'Stock', exact: true }).click();
    await expect(
      page.getByText('Registro pendiente de confirmar · Arroz', { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Contar Arroz' })).toBeDisabled();
    await page.getByRole('button', { name: 'Reintentar registro', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Contar Arroz' })).toBeEnabled();
    const result = await page.evaluate(
      async (id) => ({
        balance: await window.bocha!.stock.get(id),
        movements: await window.bocha!.stock.movements({ productId: id, limit: 20 }),
        pending: localStorage.getItem('bocha.stock.pending.v1'),
      }),
      productId,
    );
    expect(result.balance.ok && result.balance.value.quantityBase).toBe(8);
    expect(result.movements.ok && result.movements.value.total).toBe(2);
    expect(result.pending).toBeNull();
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('contar, ingresar, registrar merma y revisar movimientos desde Stock', async () => {
  test.setTimeout(45_000);
  const directory = mkdtempSync(join(tmpdir(), 'bocha-stock-ui-'));
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
    await signIn(page);
    await expect(page.getByText('Base de datos conectada', { exact: true })).toBeVisible();
    await page.evaluate(async () => {
      for (const [sku, name, unit, min] of [
        ['FIAM', 'Queso cremoso', 'KG', 1000],
        ['LAC', 'Leche entera', 'UNIT', 5],
      ]) {
        const result = await window.bocha!.products.save({
          sku: sku as string,
          barcode: null,
          name: name as string,
          saleUnit: unit as 'KG' | 'UNIT',
          minStockBase: min as number,
          priceCents: 900000,
          active: true,
          trackStock: true,
          category: null,
        });
        if (!result.ok) throw new Error(result.error.message);
      }
    });
    await page.getByRole('button', { name: 'Stock', exact: true }).click();
    const cheese = page.getByRole('row').filter({ hasText: 'Queso cremoso' });
    const milk = page.getByRole('row').filter({ hasText: 'Leche entera' });
    await expect(cheese.getByText('Sin conteo', { exact: true })).toBeVisible();
    await cheese.getByRole('button', { name: 'Contar Queso cremoso' }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Cantidad contada', { exact: false }).fill('2,500');
    await form.getByLabel('Motivo', { exact: true }).fill('Conteo de estante');
    await page.keyboard.press('Control+s');
    await expect(form).not.toBeVisible();
    await expect(cheese.getByText('2,500 kg', { exact: true })).toBeVisible();
    await cheese.getByRole('button', { name: 'Registrar movimiento de Queso cremoso' }).click();
    await form.getByLabel('Cantidad', { exact: true }).fill('1,000');
    await form.getByLabel('Motivo', { exact: true }).fill('Compra de mercadería');
    await form.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
    await expect(cheese.getByText('3,500 kg', { exact: true })).toBeVisible();
    await cheese.getByRole('button', { name: 'Registrar movimiento de Queso cremoso' }).click();
    await form.getByLabel('Tipo de movimiento', { exact: true }).selectOption('WASTE');
    await form.getByLabel('Cantidad', { exact: true }).fill('4,000');
    await form.getByLabel('Motivo', { exact: true }).fill('Diferencia por mercadería dañada');
    await form.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
    await expect(form.getByRole('alert')).toContainText('Stock insuficiente');
    await form.getByLabel('Confirmar saldo negativo', { exact: true }).check();
    await form.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
    await expect(cheese.getByText('-0,500 kg', { exact: true })).toBeVisible();
    await expect(cheese.getByText('Negativo', { exact: true })).toBeVisible();
    await milk.getByRole('button', { name: 'Contar Leche entera' }).click();
    await form.getByLabel('Cantidad contada', { exact: false }).fill('0');
    await form.getByLabel('Motivo', { exact: true }).fill('Estante vacío');
    await form.getByRole('button', { name: 'Guardar conteo', exact: true }).click();
    await expect(milk.getByText('Agotado', { exact: true })).toBeVisible();
    await milk.getByRole('button', { name: 'Contar Leche entera' }).click();
    await form.getByLabel('Cantidad contada', { exact: false }).fill('3');
    await form.getByLabel('Motivo', { exact: true }).fill('Nuevo conteo de estante');
    await form.getByRole('button', { name: 'Guardar conteo', exact: true }).click();
    await expect(milk.getByText('Bajo mínimo', { exact: true })).toBeVisible();
    await cheese.getByRole('button', { name: 'Ver movimientos de Queso cremoso' }).click();
    await expect(form.getByText('Compra de mercadería', { exact: true })).toBeVisible();
    await expect(form.getByText('Conteo de estante', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('F2');
    await expect(page.getByRole('searchbox', { name: 'Buscar stock' })).toBeFocused();
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
