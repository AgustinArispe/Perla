import { expect, type Page } from '@playwright/test';
export const testPassword = 'Prueba-Bocha-2026!';
export async function signIn(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.bocha));
  const status = await page.evaluate(() => window.bocha!.auth.status());
  if (!status.ok) throw new Error(status.error.message);
  if (status.value.user) return;
  await expect(
    page.getByRole('heading', {
      name: status.value.initialized ? 'Ingresar' : 'Configurar primer jefe',
      exact: true,
    }),
  ).toBeVisible();
  if (!status.value.initialized)
    await page.getByLabel('Nombre', { exact: true }).fill('Jefe de prueba');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill(testPassword);
  await page
    .getByRole('button', {
      name: status.value.initialized ? 'Ingresar' : 'Crear cuenta de jefe',
      exact: true,
    })
    .click();
  await expect(page.getByRole('heading', { name: 'Productos', exact: true })).toBeVisible();
}
