import { expect, test, type Page } from '@playwright/test';

const password = 'Prueba-Web-Bocha-2026!';
async function login(page: Page, username = 'jefe') {
  await page.goto('/');
  await page.getByLabel('Usuario', { exact: true }).fill(username);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Módulos' })).toBeVisible();
}

test('web adversarial: XSS, CSRF, permisos, importes manipulados e idempotencia', async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  await page.addInitScript(() => {
    const state = window as unknown as Window & {
      __csp: { directive: string; source: string; blocked: string }[];
      __xss?: boolean;
    };
    state.__csp = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      state.__csp.push({
        directive: event.violatedDirective,
        source: event.sourceFile,
        blocked: event.blockedURI,
      }),
    );
  });
  await login(page);
  const fixture = await page.evaluate(async (password) => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    async function post(path: string, body: unknown) {
      const response = await fetch('/api/v1' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(path + ': ' + result.error.message);
      return result.value;
    }
    for (const [username, role] of [
      ['securityseller', 'SELLER'],
      ['securitysuper', 'SUPERVISOR'],
    ])
      await post('/users', { username, name: username, role, active: true, password });
    const terminal = await post('/terminals', { name: 'Caja seguridad', active: true });
    await post('/auth/terminal', { terminalId: terminal.id });
    await post('/cash/open', {
      terminalId: terminal.id,
      openingCashCents: 100000,
      operationKey: crypto.randomUUID(),
    });
    const product = await post('/products', {
      sku: 'SECURITY',
      barcode: '7799900080062',
      name: '<img src=x onerror="window.__xss=true">',
      saleUnit: 'UNIT',
      category: null,
      priceCents: 100000,
      active: true,
      trackStock: false,
      minStockBase: 0,
    });
    return { product, csrf: session.csrfToken };
  }, password);
  await page
    .getByRole('navigation', { name: 'Módulos' })
    .getByRole('button', { name: 'Productos', exact: true })
    .click();
  await expect(page.getByText(fixture.product.name, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as Window & { __xss?: boolean }).__xss)).toBeUndefined();
  expect(await page.locator('img[src="x"]').count()).toBe(0);

  const headers = { origin: new URL(page.url()).origin, 'x-csrf-token': fixture.csrf };
  expect(
    (
      await page.request.post('/api/v1/products', {
        data: fixture.product,
        headers: { origin: headers.origin },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/v1/products', {
        data: fixture.product,
        headers: { ...headers, origin: 'https://intruso.invalid' },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post('/api/v1/products', {
        data: fixture.product,
        headers: { ...headers, 'x-csrf-token': '0'.repeat(64) },
      })
    ).status(),
  ).toBe(403);
  const attempted = await page.evaluate(async (product) => {
    const session = (await (await fetch('/api/v1/auth/session')).json()).value;
    const body = {
      checkoutKey: crypto.randomUUID(),
      lines: [
        {
          lineId: crypto.randomUUID(),
          productId: product.id,
          quantityBase: 1,
          expectedProductRevision: product.revision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'DEBIT', amountCents: 100000 }],
    };
    async function send(input: unknown) {
      const response = await fetch('/api/v1/sales', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': session.csrfToken },
        body: JSON.stringify(input),
      });
      return { status: response.status, result: await response.json() };
    }
    const price = await send({ ...body, lines: [{ ...body.lines[0], expectedPriceCents: 1 }] });
    const negative = await send({ ...body, lines: [{ ...body.lines[0], quantityBase: -1 }] });
    const total = await send({ ...body, totalCents: 1 });
    const insufficient = await send({ ...body, payments: [{ method: 'DEBIT', amountCents: 1 }] });
    const concurrency = await Promise.all(Array.from({ length: 8 }, () => send(body)));
    const reused = await send({
      ...body,
      lines: [{ ...body.lines[0], quantityBase: 2 }],
      payments: [{ method: 'DEBIT', amountCents: 200000 }],
    });
    const sales = (await (await fetch('/api/v1/sales?limit=100')).json()).value.items;
    return { price, negative, total, insufficient, concurrency, reused, sales };
  }, fixture.product);
  expect(attempted.price.status).toBe(409);
  expect(attempted.negative.status).toBe(400);
  expect(attempted.total.status).toBe(400);
  expect(attempted.insufficient.result.ok).toBe(false);
  expect(attempted.concurrency.every((response) => response.status === 200)).toBe(true);
  expect(new Set(attempted.concurrency.map((response) => response.result.value.id)).size).toBe(1);
  expect(attempted.reused.status).toBe(409);
  expect(attempted.sales).toHaveLength(1);
  expect(attempted.sales[0].totalCents).toBe(100000);
  const injection = await page.request.get(
    '/api/v1/products?query=' + encodeURIComponent("' OR 1=1 --"),
  );
  expect(injection.status()).toBe(200);
  expect((await injection.json()).value.items).toHaveLength(0);
  for (const path of [
    '/api/v1/auth/bootstrap',
    '/api/v1/rpc/internal.authorize',
    '/.env',
    '/bocha.sqlite',
  ])
    expect((await page.request.get(path)).status()).not.toBe(200);
  const mainResponse = await page.request.get('/');
  expect(mainResponse.headers()['x-content-type-options']).toBe('nosniff');
  expect(mainResponse.headers()['content-security-policy']).toContain("object-src 'none'");
  expect(mainResponse.headers()['access-control-allow-origin']).toBeUndefined();

  for (const [username, paths] of [
    [
      'securityseller',
      [
        '/api/v1/users',
        '/api/v1/backups',
        '/api/v1/stock',
        '/api/v1/sales',
        '/api/v1/dashboard/monthly?month=2026-10',
      ],
    ],
    [
      'securitysuper',
      ['/api/v1/users', '/api/v1/backups', '/api/v1/dashboard/monthly?month=2026-10'],
    ],
  ] as const) {
    const context = await browser.newContext();
    try {
      const target = await context.newPage();
      await login(target, username);
      for (const path of paths)
        expect((await target.request.get(path)).status(), username + ': ' + path).toBe(403);
      const userResponse = await target.request.get('/api/v1/auth/session');
      const csrf = (await userResponse.json()).value.csrfToken;
      expect(
        (
          await target.request.post('/api/v1/users', {
            headers: { origin: headers.origin, 'x-csrf-token': csrf },
            data: {
              username: 'roleattack',
              name: 'Intruso',
              role: 'OWNER',
              active: true,
              password,
            },
          })
        ).status(),
      ).toBe(403);
      if (username === 'securitysuper')
        expect((await target.request.get('/api/v1/stock')).status()).toBe(200);
    } finally {
      await context.close();
    }
  }
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible();
  expect((await page.request.get('/api/v1/products')).status()).toBe(401);
  // Self-hosted typography must load without relaxing the content security policy.
  expect(
    await page.evaluate(() => (window as unknown as Window & { __csp: unknown[] }).__csp),
  ).toEqual([]);
});
