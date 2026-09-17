import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { _electron as electron, expect, test } from '@playwright/test';
import { signIn, testPassword } from './auth-helper';
test('jefe crea perfiles, vendedor sólo ve Caja y supervisor gestiona sin dashboard', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-users-'));
  const application = await electron.launch({
    ...(process.env.BOCHA_E2E_EXECUTABLE
      ? { executablePath: process.env.BOCHA_E2E_EXECUTABLE }
      : { args: ['.'] }),
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter((e): e is [string, string] => e[1] !== undefined),
      ),
      BOCHA_TEST_USER_DATA: directory,
    },
  });
  try {
    const page = await application.firstWindow();
    await page.waitForFunction(() => Boolean(window.bocha));
    expect(
      await page.evaluate(() =>
        window.bocha!.products.search({ query: '', activeOnly: true, limit: 20 }),
      ),
    ).toMatchObject({ ok: false, error: { code: 'UNAUTHENTICATED' } });
    await signIn(page);
    await page.getByRole('button', { name: 'Usuarios', exact: true }).click();
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
    const form = page.getByRole('dialog');
    await form.getByLabel('Nombre', { exact: true }).fill('Cajero');
    await form.getByLabel('Usuario', { exact: true }).fill('cajero');
    await form.getByLabel('Contraseña', { exact: true }).fill(testPassword);
    await form.getByRole('button', { name: 'Guardar usuario', exact: true }).click();
    await expect(form).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Editar Cajero' })).toBeVisible();
    const created = await page.evaluate(
      async (password) =>
        window.bocha!.users.save({
          username: 'supervisor',
          name: 'Supervisor de prueba',
          role: 'SUPERVISOR',
          active: true,
          password,
        }),
      testPassword,
    );
    expect(created.ok).toBe(true);
    await page.screenshot({ path: 'tmp/users-desktop.png' });
    expect(await page.evaluate(() => Object.keys(window.bocha!.auth))).not.toContain(
      'sessionToken',
    );
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByLabel('Usuario', { exact: true }).fill('cajero');
    await page.getByLabel('Contraseña', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Caja', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Productos', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0);
    const denied = await page.evaluate(() =>
      window.bocha!.products.save({
        sku: 'DENIED',
        barcode: null,
        name: 'No permitido',
        priceCents: 100,
        saleUnit: 'UNIT',
        category: null,
        active: true,
        trackStock: false,
        minStockBase: 0,
      }),
    );
    expect(denied).toMatchObject({ ok: false, error: { code: 'FORBIDDEN' } });
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await page.getByLabel('Usuario', { exact: true }).fill('supervisor');
    await page.getByLabel('Contraseña', { exact: true }).fill(testPassword);
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Stock', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Resumen mensual', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => window.bocha!.users.list())).toMatchObject({
      ok: false,
      error: { code: 'FORBIDDEN' },
    });
  } finally {
    await application.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
