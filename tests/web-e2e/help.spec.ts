import { expect, test, type Page } from '@playwright/test';

async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
  await page.locator('.sidebar-bottom').getByRole('button', { name: 'Ayuda', exact: true }).click();
}
test('ayuda del jefe: remitos, órdenes, backups y búsqueda sin resultados en móvil', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const search = page.getByRole('searchbox', { name: 'Buscar en la ayuda' });
  await search.fill('ordenes para caja');
  await page
    .getByRole('navigation', { name: 'Temas de ayuda' })
    .getByRole('button', { name: 'Órdenes para caja', exact: true })
    .click();
  await expect(page.locator('#ayuda-ordenes-caja')).toContainText(
    'sin terminal asignada ni caja abierta',
  );
  await expect(page.locator('#ayuda-ordenes-caja')).toContainText('podés dejar los tres apagados');
  await page.screenshot({ path: testInfo.outputPath('ayuda-ordenes.png'), fullPage: true });
  await search.fill('remitos internos');
  await page
    .getByRole('navigation', { name: 'Temas de ayuda' })
    .getByRole('button', { name: 'Remitos', exact: true })
    .click();
  await expect(page.locator('#ayuda-remitos')).toContainText('Apagar internos no desactiva');
  await search.fill('respaldos semanales');
  await expect(page.locator('#ayuda-backups')).toContainText('los sábados');
  await search.fill('vuelto');
  await expect(page.locator('.help-page article h3')).toHaveText('Descuentos y cobro');
  await search.fill('zzzinexistente999');
  await expect(page.locator('.admin-empty')).toContainText('No hay temas');
  await page.getByRole('button', { name: 'Limpiar búsqueda', exact: true }).click();
  await expect(search).toHaveValue('');
  await page.setViewportSize({ width: 390, height: 844 });
  await search.fill('oc');
  await expect(
    page
      .getByRole('navigation', { name: 'Temas de ayuda' })
      .getByRole('button', { name: 'Órdenes para caja', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('vendedor: guía de órdenes accesible con función apagada y administración oculta', async ({
  page,
}) => {
  await login(page);
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const result = await (
      await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({
          username: 'ayudavendedor',
          name: 'Vendedor ayuda',
          role: 'SELLER',
          active: true,
          password: 'Prueba-Web-Bocha-2026!',
        }),
      })
    ).json();
    if (!result.ok) throw new Error(result.error.message);
    await fetch('/api/v1/auth/logout', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
      body: '{}',
    });
  });
  await login(page, 'ayudavendedor');
  const nav = page.getByRole('navigation', { name: 'Temas de ayuda' });
  await expect(nav.getByRole('button', { name: 'Copias de seguridad', exact: true })).toHaveCount(
    0,
  );
  await expect(
    nav.getByRole('button', { name: 'Usuarios y configuración', exact: true }),
  ).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Remitos', exact: true })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Órdenes para caja', exact: true }).click();
  await expect(page.locator('#ayuda-ordenes-caja')).toContainText('sin terminal asignada');
  await expect(
    page.getByRole('heading', { name: 'Activar o desactivar la preparación', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Buscar en la ayuda' }).fill('backups sábados');
  await expect(page.locator('.admin-empty')).toBeVisible();
});
