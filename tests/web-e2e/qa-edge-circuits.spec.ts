import { openModule } from './navigation-helper';
import { test, expect, type Page } from '@playwright/test';

const password = 'Prueba-Web-Bocha-2026!';
async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
}
async function post(page: Page, path: string, body: unknown, method = 'POST') {
  const session = (await (await page.request.get('/api/v1/auth/session')).json()).value;
  const response = await page.request.fetch('/api/v1' + path, {
    method,
    headers: {
      origin: new URL(page.url()).origin,
      'x-csrf-token': session.csrfToken,
    },
    data: body,
  });
  expect(response.status(), await response.text()).toBe(200);
  return (await response.json()).value;
}
async function setup(page: Page, suffix: string, stock = false) {
  await login(page);
  const draft = (await (await page.request.get('/api/v1/checkout/draft')).json()).value;
  if (draft) await post(page, '/checkout/cancel', { expectedRevision: draft.revision });
  const terminal = await post(page, '/terminals', { name: 'Caja QA ' + suffix, active: true });
  if (stock) {
    const features = (await (await page.request.get('/api/v1/settings/features')).json()).value;
    await post(
      page,
      '/settings/features',
      { expectedRevision: features.revision, enabled: { STOCK_CONTROL: true } },
      'PUT',
    );
  }
  const product = await post(page, '/products', {
    sku: 'QA-' + suffix,
    barcode: 'QA-' + suffix,
    name: 'Producto QA ' + suffix,
    category: null,
    saleUnit: 'UNIT',
    priceCents: 100000,
    active: true,
    trackStock: stock,
    minStockBase: 0,
  });
  if (stock)
    await post(page, '/stock/opening', {
      productId: product.id,
      countedBase: 1,
      expectedRevision: 0,
      expectedProductRevision: product.revision,
      reason: 'Única unidad para probar límite de stock',
      operationKey: crypto.randomUUID(),
    });
  await post(page, '/auth/terminal', { terminalId: terminal.id });
  const shift = await post(page, '/cash/open', {
    terminalId: terminal.id,
    openingCashCents: 1000000,
    operationKey: crypto.randomUUID(),
  });
  await page.reload();
  await openModule(page, 'Caja');
  await expect(page.getByLabel('Escanear código')).toBeFocused();
  await page.keyboard.type(product.barcode, { delay: 0 });
  await page.keyboard.press('Enter');
  await expect(page.locator('.checkout-total')).toContainText('1.000');
  return { product, shift };
}
async function closeReceipt(page: Page) {
  const receipt = page.getByRole('dialog', { name: 'Comprobante de venta' });
  await expect(receipt).toBeVisible();
  await receipt
    .locator('.dialog-footer')
    .getByRole('button', { name: 'Cerrar', exact: true })
    .click();
  await expect(receipt).not.toBeVisible();
}

test('precio cambiado durante carrito: revisión visible, actualización explícita e histórico intacto', async ({
  page,
}) => {
  const { product, shift } = await setup(page, 'PRECIO');
  await post(page, '/products', {
    id: product.id,
    expectedRevision: product.revision,
    sku: product.sku,
    barcode: product.barcode,
    name: product.name,
    category: null,
    saleUnit: 'UNIT',
    priceCents: 150000,
    active: true,
    trackStock: false,
    minStockBase: 0,
  });
  await page.keyboard.press('F8');
  await expect(page.getByRole('alert')).toContainText('Cambió el producto');
  await expect(page.getByRole('button', { name: 'Actualizar precios', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cobrar · F8', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Actualizar precios', exact: true }).click();
  await expect(page.locator('.checkout-total')).toContainText('1.500');
  await expect(page.getByLabel('Escanear código')).toBeFocused();
  await page.keyboard.type(product.barcode, { delay: 0 });
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de ' + product.name, exact: true }),
  ).toHaveText('2');
  await expect(page.locator('.checkout-total')).toContainText('3.000');
  await page.keyboard.press('F8');
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  await closeReceipt(page);
  const current = (await (await page.request.get('/api/v1/products/' + product.id)).json()).value;
  await post(page, '/products', {
    id: product.id,
    expectedRevision: current.revision,
    sku: product.sku,
    barcode: product.barcode,
    name: 'Producto renombrado después de vender',
    category: null,
    saleUnit: 'UNIT',
    priceCents: 220000,
    active: true,
    trackStock: false,
    minStockBase: 0,
  });
  const sales = (await (await page.request.get('/api/v1/sales?limit=100')).json()).value.items;
  const sale = (await (await page.request.get('/api/v1/sales/' + sales[0].id)).json()).value;
  expect(sale.totalCents).toBe(300000);
  expect(sale.items[0].unitPriceCents).toBe(150000);
  expect(sale.items[0].name).toBe(product.name);
  await post(page, '/cash/close', {
    shiftId: shift.id,
    countedCashCents: 1300000,
    operationKey: crypto.randomUUID(),
  });
});

test('cobro sin conexión antes de guardar: reintento explícito y doble clic no duplican', async ({
  page,
}) => {
  const { product, shift } = await setup(page, 'REINTENTO');
  await page.keyboard.press('F8');
  await page.route('**/api/v1/sales', (route) => route.abort('internetdisconnected'), { times: 1 });
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  await expect(page.getByRole('heading', { name: 'Venta pendiente de confirmar' })).toBeVisible();
  await page.getByRole('button', { name: 'Consultar venta', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('todavía no figura');
  await page.getByRole('button', { name: 'Reintentar misma venta', exact: true }).dblclick();
  await closeReceipt(page);
  const sales = (await (await page.request.get('/api/v1/sales?limit=100')).json()).value.items;
  const details = await Promise.all(
    sales.map(
      async (sale: { id: string }) =>
        (await (await page.request.get('/api/v1/sales/' + sale.id)).json()).value,
    ),
  );
  expect(
    details.filter((sale) =>
      sale.items.some((item: { productId: string }) => item.productId === product.id),
    ),
  ).toHaveLength(1);
  await post(page, '/cash/close', {
    shiftId: shift.id,
    countedCashCents: 1100000,
    operationKey: crypto.randomUUID(),
  });
});

test('revocación de usuario con sesión abierta: bloquea nuevas operaciones desde su sesión', async ({
  page,
  browser,
}) => {
  await login(page);
  const user = await post(page, '/users', {
    username: 'qarevocado',
    name: 'Usuario QA revocado',
    role: 'SELLER',
    active: true,
    password,
  });
  const context = await browser.newContext();
  try {
    const seller = await context.newPage();
    await login(seller, 'qarevocado');
    expect((await seller.request.get('/api/v1/products')).status()).toBe(200);
    await post(page, '/users', {
      id: user.id,
      expectedRevision: user.revision,
      username: user.username,
      name: user.name,
      role: 'SELLER',
      active: false,
    });
    expect((await seller.request.get('/api/v1/products')).status()).toBe(401);
    await seller.reload();
    await expect(seller.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
    await seller.getByLabel('Usuario', { exact: true }).fill('qarevocado');
    await seller.getByLabel('Contraseña', { exact: true }).fill(password);
    await seller.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(seller.getByRole('alert')).toContainText('incorrectos');
  } finally {
    await context.close();
  }
});

test('stock insuficiente: rechazo conserva carrito y saldo; corregir cantidad permite cobrar', async ({
  page,
}) => {
  const { product, shift } = await setup(page, 'STOCK', true);
  await expect(page.getByLabel('Escanear código')).toBeFocused();
  await page.keyboard.type(product.barcode, { delay: 0 });
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de ' + product.name, exact: true }),
  ).toHaveText('2');
  await page.keyboard.press('F8');
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  await expect(page.getByRole('alert')).toContainText(/stock|existencias|disponib/i);
  expect(
    (await (await page.request.get('/api/v1/stock/' + product.id)).json()).value.quantityBase,
  ).toBe(1);
  await expect(page.getByRole('dialog', { name: 'Comprobante de venta' })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Cambiar cantidad de ' + product.name, exact: true }),
  ).toHaveText('2');
  await page.getByRole('button', { name: 'Restar ' + product.name, exact: true }).click();
  await expect(page.locator('.checkout-total')).toContainText('1.000');
  await page.keyboard.press('F8');
  await page.getByRole('button', { name: /Confirmar venta/ }).click();
  await closeReceipt(page);
  expect(
    (await (await page.request.get('/api/v1/stock/' + product.id)).json()).value.quantityBase,
  ).toBe(0);
  await post(page, '/cash/close', {
    shiftId: shift.id,
    countedCashCents: 1100000,
    operationKey: crypto.randomUUID(),
  });
});

test('producto desactivado durante carrito: retirar y reescanear no reutiliza datos activos antiguos', async ({
  page,
}) => {
  const { product, shift } = await setup(page, 'INACTIVO');
  await post(page, '/products/active', {
    productId: product.id,
    expectedRevision: product.revision,
    active: false,
  });
  await page.keyboard.press('F8');
  await expect(page.getByRole('alert')).toContainText('inactivo');
  await page.getByRole('button', { name: 'Quitar ' + product.name, exact: true }).click();
  await expect(page.locator('.checkout-lines tbody tr')).toHaveCount(0);
  await expect(page.getByLabel('Escanear código')).toBeFocused();
  await page.keyboard.type(product.barcode, { delay: 0 });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toContainText('inactivo');
  await expect(page.locator('.checkout-lines tbody tr')).toHaveCount(0);
  await post(page, '/cash/close', {
    shiftId: shift.id,
    countedCashCents: 1000000,
    operationKey: crypto.randomUUID(),
  });
});
