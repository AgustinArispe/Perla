import { expect, test } from '@playwright/test';
import { openModule } from './navigation-helper';

function gate() {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { pending, release };
}

for (const width of [390, 1440]) {
  test(`marca visible antes de JavaScript y durante la conexión a ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const scripts = gate();
    const session = gate();
    await page.route('**/assets/*.js', async (route) => {
      await scripts.pending;
      await route.continue();
    });
    await page.route('**/api/v1/auth/session', async (route) => {
      await session.pending;
      await route.continue();
    });
    try {
      await page.goto('/', { waitUntil: 'commit' });
      const opening = page.getByRole('status', { name: 'Abriendo Perla…' });
      await expect(opening).toBeVisible();
      await expect
        .poll(() => opening.locator('img').evaluate((img: HTMLImageElement) => img.naturalWidth))
        .toBeGreaterThan(0);
      const box = await opening.locator('img').boundingBox();
      expect(box!.width).toBeGreaterThan(140);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`startup-${width}.png`),
        animations: 'disabled',
      });
      scripts.release();
      const connection = page.getByRole('status', { name: 'Conectando con tu negocio…' });
      await expect(connection).toBeVisible();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      expect(
        await connection
          .locator('.perla-loading__emblem')
          .evaluate((el) => getComputedStyle(el).animationName),
      ).toBe('none');
      expect(
        await connection
          .locator('.perla-loading__track')
          .evaluate((el) => getComputedStyle(el, '::after').animationName),
      ).toBe('none');
      session.release();
      await expect(page.getByLabel('Usuario', { exact: true })).toBeVisible();
      await expect(page.locator('.perla-loading')).toHaveCount(0);
    } finally {
      scripts.release();
      session.release();
    }
  });
}

test('carga de Inicio y catálogo; conserva los datos durante una actualización', async ({
  page,
}, info) => {
  const home = gate();
  let updating = false;
  let updateRequested = false;
  const refresh = gate();
  await page.route('**/api/v1/control', async (route) => {
    const payload = route.request().postDataJSON();
    if (payload.area === 'workspace' && payload.action === 'home') {
      if (updating) {
        updateRequested = true;
        await refresh.pending;
      } else await home.pending;
    }
    await route.continue();
  });
  const products = gate();
  await page.route('**/api/v1/products?*', async (route) => {
    await products.pending;
    await route.continue();
  });
  try {
    await page.goto('/');
    await page.getByLabel('Usuario', { exact: true }).fill('jefe');
    await page.getByLabel('Contraseña', { exact: true }).fill('Prueba-Web-Bocha-2026!');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    const summary = page.getByRole('status', { name: 'Preparando el resumen de tu negocio…' });
    await expect(summary).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
    await page.screenshot({
      path: info.outputPath('home-loading.png'),
      fullPage: true,
      animations: 'disabled',
    });
    home.release();
    await expect(page.getByLabel('Ventas de hoy y de la semana')).toBeVisible();
    await expect(summary).toHaveCount(0);
    updating = true;
    await page.getByRole('button', { name: 'Actualizar', exact: true }).click();
    await expect.poll(() => updateRequested).toBe(true);
    await expect(page.getByLabel('Ventas de hoy y de la semana')).toBeVisible();
    await expect(summary).toHaveCount(0);
    refresh.release();
    await openModule(page, 'Productos');
    const catalog = page.getByRole('status', { name: 'Cargando catálogo…' });
    await expect(catalog).toBeVisible();
    products.release();
    await expect(catalog).toHaveCount(0);
  } finally {
    home.release();
    refresh.release();
    products.release();
  }
});

test('una conexión fallida muestra reintento en lugar de una carga perpetua', async ({ page }) => {
  const session = gate();
  let fail = true;
  await page.route('**/api/v1/auth/session', async (route) => {
    if (!fail) return route.continue();
    await session.pending;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { message: 'Conexión de prueba no disponible.', code: 'DB_BUSY', retryable: true },
      }),
    });
  });
  try {
    await page.goto('/');
    await expect(page.getByRole('status', { name: 'Conectando con tu negocio…' })).toBeVisible();
    session.release();
    await expect(page.getByRole('alert')).toContainText('Conexión de prueba no disponible.');
    await expect(page.locator('.perla-loading')).toHaveCount(0);
    fail = false;
    await page.getByRole('button', { name: 'Reintentar conexión' }).click();
    await expect(page.getByLabel('Usuario', { exact: true })).toBeVisible();
  } finally {
    session.release();
  }
});
