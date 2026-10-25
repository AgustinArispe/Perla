import { test, expect, type Page } from '@playwright/test';
import { openModule } from './navigation-helper';

async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
}
async function flags(page: Page, enabled: Record<string, boolean>) {
  await page.evaluate(async (enabled) => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const current = (await (await fetch('/api/v1/settings/features')).json()).value;
    const result = await (
      await fetch('/api/v1/settings/features', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({ expectedRevision: current.revision, enabled }),
      })
    ).json();
    if (!result.ok) throw new Error(result.error.message);
  }, enabled);
}

test('sidebar reorganizado: Inicio directo, categorías cerradas, subopciones y teclado', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('bocha-sidebar-collapsed', 'true'));
  await login(page);
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-collapsed/);
  await expect(nav.getByRole('button', { name: /^Desplegar sección/ })).toHaveCount(4);
  await expect(nav.getByRole('button', { name: 'Inicio', exact: true })).toBeVisible();
  await expect(nav.locator('.nav-item')).toHaveCount(1);
  await expect(nav.locator('.sidebar-subitem')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('sidebar-initial.png') });
  await openModule(page, 'Caja');
  await openModule(page, 'Productos');
  const catalog = nav.getByRole('button', { name: 'Productos: Catálogo', exact: true });
  await expect(catalog).toHaveAttribute('aria-current', 'page');
  const close = nav.getByRole('button', { name: 'Ocultar opciones de Productos', exact: true });
  await close.focus();
  await close.press('Enter');
  await expect(catalog).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Productos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  const expand = nav.getByRole('button', { name: 'Mostrar opciones de Productos', exact: true });
  await expand.focus();
  await expand.press('Enter');
  await nav.getByRole('button', { name: 'Productos: Revisión', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-module', 'Revisión');
  await nav.getByRole('button', { name: 'Colapsar sección Mercadería', exact: true }).click();
  await expect(
    nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }),
  ).toContainText('Productos · Revisión');
  await page.getByRole('button', { name: 'Colapsar menú', exact: true }).click();
  await expect(nav.getByRole('button', { name: /^Abrir sección/ })).toHaveCount(4);
  await nav.getByRole('button', { name: 'Abrir sección Ventas y caja', exact: true }).click();
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-collapsed/);
  await nav.getByRole('button', { name: 'Turnos', exact: true }).click();
  await nav.getByRole('button', { name: 'Turnos: Diferencias de caja', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-module', 'Controles');
  await openModule(page, 'Usuarios');
  await expect(nav.getByRole('button', { name: 'Usuarios', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(nav.getByRole('button', { name: 'Copias de seguridad', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sidebar-desktop.png') });
  await page.reload();
  await expect(nav.getByRole('button', { name: /^Desplegar sección/ })).toHaveCount(4);
  await expect(nav.locator('.sidebar-subitem')).toHaveCount(0);
});

test('Reposición agrupa sugerencias y pedidos sin mezclarlos con la recepción de compras', async ({
  page,
}) => {
  await login(page);
  await flags(page, { STOCK_CONTROL: true, SUPPLIERS_PURCHASES: true, REPLENISHMENT: true });
  await page.reload();
  await openModule(page, 'Reposición');
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(
    nav.getByRole('button', { name: 'Reposición: Sugerencias', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('button', { name: 'Reposición: Pedidos', exact: true }).click();
  await expect(
    nav.getByRole('button', { name: 'Reposición: Pedidos', exact: true }),
  ).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: 'Descargar pedidos', exact: true })).toBeVisible();
  await openModule(page, 'Compras');
  await expect(nav.getByRole('button', { name: 'Compras: Recibir', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await nav.getByRole('button', { name: 'Compras: Proveedores', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-module', 'Proveedores');
});

test('módulos opcionales y vendedor sin enlaces de administración; caja no depende de Stock', async ({
  page,
  browser,
}) => {
  await login(page);
  await flags(page, {
    STOCK_CONTROL: false,
    LOTS: false,
    LOCATIONS_TRANSFERS: false,
    REPLENISHMENT: false,
    PREPARED_ORDERS: true,
    DELIVERY_NOTES_INTERNAL: false,
  });
  await page.evaluate(async () => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const result = await (
      await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify({
          username: 'sidebarvendedor',
          name: 'Vendedor',
          role: 'SELLER',
          active: true,
          password: 'Prueba-Web-Bocha-2026!',
        }),
      })
    ).json();
    if (!result.ok) throw new Error(result.error.message);
  });
  await page.reload();
  await openModule(page, 'Turnos');
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(
    nav.getByRole('button', { name: 'Turnos: Diferencias de caja', exact: true }),
  ).toBeVisible();
  await nav.getByRole('button', { name: 'Turnos: Diferencias de caja', exact: true }).click();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-module', 'Controles');
  const context = await browser.newContext();
  const seller = await context.newPage();
  try {
    await login(seller, 'sidebarvendedor');
    const sellerNav = seller.getByRole('navigation', { name: 'Módulos' });
    await expect(sellerNav.getByRole('button', { name: /^Desplegar sección/ })).toHaveCount(1);
    await expect(sellerNav.getByRole('button', { name: 'Inicio', exact: true })).toHaveCount(0);
    await openModule(seller, 'Órdenes');
    await expect(
      seller.getByRole('heading', { name: 'Órdenes para caja', exact: true }),
    ).toBeVisible();
    await expect(sellerNav.getByRole('button', { name: 'Caja', exact: true })).toBeVisible();
    await expect(sellerNav.getByRole('button', { name: 'Usuarios', exact: true })).toHaveCount(0);
    await expect(sellerNav.getByRole('button', { name: 'Remitos', exact: true })).toHaveCount(0);
    await flags(page, { PREPARED_ORDERS: false });
    await seller.reload();
    await openModule(seller, 'Caja');
    await expect(
      sellerNav.getByRole('button', { name: 'Órdenes para caja', exact: true }),
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('subcategorías en móvil: expandir no navega y elegir una tarea cierra el menú', async ({
  page,
}, testInfo) => {
  await login(page);
  await flags(page, { STOCK_CONTROL: true });
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  await nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }).click();
  await nav.getByRole('button', { name: 'Mostrar opciones de Stock', exact: true }).click();
  await expect(nav).toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-module', 'Inicio');
  await page.screenshot({ path: testInfo.outputPath('sidebar-mobile.png') });
  await nav.getByRole('button', { name: 'Stock: Conteos', exact: true }).click();
  await expect(nav).not.toBeVisible();
  await expect(page.locator('.app-shell')).toHaveAttribute('data-module', 'Controles');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Stock: Conteos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.keyboard.press('Escape');
  await expect(nav).not.toBeVisible();
});
