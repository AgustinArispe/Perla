import { signIn } from './auth-helper';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';

test('abre el escritorio con SQLite en worker y renderer aislado', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-desktop-'));
  try {
    // Open twice using the same path to verify persistence and migration on restart.
    for (let attempt = 0; attempt < 2; attempt++) {
      const env: Record<string, string> = Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      );
      env.BOCHA_TEST_USER_DATA = directory;
      delete env.ELECTRON_RUN_AS_NODE;
      const application = await electron.launch({
        ...(process.env.BOCHA_E2E_EXECUTABLE
          ? { executablePath: process.env.BOCHA_E2E_EXECUTABLE }
          : { args: ['.'] }),
        env,
      });
      try {
        await application.context().setOffline(true);
        const page = await application.firstWindow();
        await signIn(page);
        await expect(page.getByText('Base de datos conectada', { exact: true })).toBeVisible();
        expect(
          await page.evaluate(() => typeof (globalThis as { require?: unknown }).require),
        ).toBe('undefined');
        const result = await page.evaluate(() => window.bocha!.system.health());
        expect(result.ok).toBe(true);
        if (!result.ok) throw new Error(result.error.message);
        expect(result.value.database).toBe('ready');
        expect(result.value.environment).toBe('test');
        expect(result.value.schemaVersion).toBe(6);
        if (attempt === 0) {
          const saved = await page.evaluate(() =>
            window.bocha!.products.save({
              sku: 'RESTART-01',
              barcode: '0123456789012',
              name: 'Producto persistente',
              priceCents: 250050,
              saleUnit: 'UNIT',
              category: null,
              active: true,
              trackStock: true,
              minStockBase: 5,
            }),
          );
          expect(saved.ok).toBe(true);
        } else {
          await expect(
            page.getByRole('button', { name: 'Editar Producto persistente' }),
          ).toBeVisible();
          const found = await page.evaluate(() =>
            window.bocha!.products.findByBarcode('0123456789012'),
          );
          expect(found.ok).toBe(true);
          if (found.ok) expect(found.value.priceCents).toBe(250050);
        }
        expect(await page.evaluate(() => Object.keys(window.bocha!))).toEqual([
          'dashboard',
          'auth',
          'users',
          'system',
          'products',
          'checkout',
          'stock',
          'sales',
        ]);
      } finally {
        await application.close();
      }
    }
    expect(existsSync(join(directory, 'data', 'bocha.sqlite'))).toBe(true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
