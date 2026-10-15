import { test, expect } from '@playwright/test';
import { openModule } from './navigation-helper';

test('Sidebar: inicio extendido con secciones cerradas, teclado y menú compacto', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('bocha-sidebar-collapsed', 'true'));
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill('jefe');
  await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Módulos' });
  await expect(nav).toBeVisible();
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-collapsed/);
  await expect(nav.getByRole('button', { name: /^Desplegar sección/ })).toHaveCount(4);
  await expect(nav.locator('.nav-item')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('sidebar-initial.png') });
  await openModule(page, 'Caja');
  await openModule(page, 'Productos');
  const merchandise = nav.getByRole('button', { name: 'Colapsar sección Mercadería', exact: true });
  await merchandise.focus();
  await merchandise.press('Enter');
  await expect(nav.getByRole('button', { name: 'Productos', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('button', { name: 'Caja', exact: true })).toBeVisible();
  await expect(
    nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }),
  ).toContainText('Productos');
  await nav.getByRole('button', { name: 'Desplegar sección Negocio', exact: true }).click();
  await page.evaluate(async () => {
    const { value } = await (await fetch('/api/v1/auth/session')).json();
    for (const title of ['Trabajo diario', 'Mercadería', 'Negocio', 'Administración']) {
      localStorage.setItem(`perla:sidebar:${value.user.id}:${title}`, 'true');
    }
  });
  await page.reload();
  await expect(
    nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(
    nav.getByRole('button', { name: 'Desplegar sección Negocio', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Colapsar menú', exact: true }).click();
  await expect(nav.getByRole('button', { name: /^Abrir sección/ })).toHaveCount(4);
  await expect(nav.locator('.nav-item')).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('sidebar-section-icons.png') });
  await page.reload();
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-collapsed/);
  await expect(nav.getByRole('button', { name: /^Desplegar sección/ })).toHaveCount(4);
  await expect(nav.locator('.nav-item')).toHaveCount(0);
  await page.getByRole('button', { name: 'Colapsar menú', exact: true }).click();
  await nav.getByRole('button', { name: 'Abrir sección Negocio', exact: true }).click();
  await expect(page.locator('.app-shell')).not.toHaveClass(/sidebar-collapsed/);
  await nav.getByRole('button', { name: 'Turnos', exact: true }).click();
  await nav.getByRole('button', { name: 'Colapsar sección Negocio', exact: true }).click();
  await expect(
    nav.getByRole('button', { name: 'Desplegar sección Negocio', exact: true }),
  ).toHaveAttribute('aria-expanded', 'false');
  await expect(nav.getByRole('button', { name: 'Productos', exact: true })).toHaveCount(0);
  await nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }).click();
  await nav.getByRole('button', { name: 'Productos', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Productos', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.screenshot({ path: testInfo.outputPath('sidebar-desktop.png') });
  for (const title of ['Trabajo diario', 'Mercadería', 'Administración']) {
    const close = nav.getByRole('button', { name: `Colapsar sección ${title}`, exact: true });
    if (await close.isVisible()) await close.click();
  }
  await page.screenshot({ path: testInfo.outputPath('sidebar-collapsed-desktop.png') });
  await nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Expandir menú', exact: true }).click();
  await nav.getByRole('button', { name: 'Colapsar sección Mercadería', exact: true }).click();
  await expect(
    nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sidebar-mobile.png') });
  await nav.getByRole('button', { name: 'Desplegar sección Mercadería', exact: true }).click();
  await nav.getByRole('button', { name: 'Productos', exact: true }).click();
  await expect(nav).not.toBeVisible();
});
