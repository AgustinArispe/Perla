import { z } from 'zod';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Executor } from './runtime';
import type { SessionGrant } from '../worker/auth/service';
export async function createServer(
  config: {
    origin: string;
    production: boolean;
    trustProxy: false | string[];
    logger?: false;
    csrfKey?: Buffer;
    sessionMaxLifetimeMs?: number;
  },
  executor: Executor,
) {
  const app = Fastify({
    trustProxy: config.trustProxy,
    logger: config.logger ?? {
      redact: [
        'req.headers.cookie',
        'req.headers.authorization',
        'req.headers.x-csrf-token',
        'req.body',
      ],
    },
    bodyLimit: 10 * 1024 * 1024,
    requestTimeout: 30000,
    connectionTimeout: 10000,
  });
  await app.register(cookie);
  await app.register(helmet);
  const name = config.production ? '__Host-bocha' : 'bocha_session',
    key = config.csrfKey ?? randomBytes(32),
    host = new URL(config.origin).host;
  // Login limits use the parsed username as part of their key. Running the
  // limiter in preHandler keeps several tills behind the same router from
  // consuming one shared allowance while preserving per-account protection.
  // Authenticated traffic is isolated by session so that terminals sharing a
  // public IP do not consume one another's allowance. The digest keeps the
  // private session token out of the rate-limit store.
  await app.register(rateLimit, {
    max: 1000,
    timeWindow: 60000,
    hook: 'preHandler',
    keyGenerator: (request) => {
      const session = request.cookies[name];
      return session
        ? `${request.ip}:${createHmac('sha256', key).update(session).digest('hex')}`
        : request.ip;
    },
  });
  const csrf = (token: string) => createHmac('sha256', key).update(token).digest('hex');
  const options = {
    httpOnly: true,
    secure: config.production,
    sameSite: 'strict' as const,
    path: '/',
    maxAge: Math.floor((config.sessionMaxLifetimeMs ?? 8 * 60 * 60_000) / 1000),
  };
  app.addHook('onRequest', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    if (req.routeOptions.url === undefined) return;
    if (req.url === '/api/v1/health') return;
    if (req.headers.host !== host)
      return reply.code(403).send({
        ok: false,
        error: { code: 'FORBIDDEN', message: 'Origen no permitido.', retryable: false },
      });
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      if (req.headers.origin !== config.origin)
        return reply.code(403).send({
          ok: false,
          error: { code: 'FORBIDDEN', message: 'Origen no permitido.', retryable: false },
        });
      if (req.url !== '/api/v1/auth/login') {
        const token = req.cookies[name],
          provided = req.headers['x-csrf-token'];
        if (
          !token ||
          !/^[a-f0-9]{64}$/.test(token) ||
          typeof provided !== 'string' ||
          !/^[a-f0-9]{64}$/.test(provided) ||
          !timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(csrf(token), 'hex'))
        )
          return reply.code(403).send({
            ok: false,
            error: {
              code: 'FORBIDDEN',
              message: 'La solicitud no pudo validarse.',
              retryable: false,
            },
          });
      }
    }
  });
  app.setErrorHandler((error, req, reply) => {
    req.log.error({ code: (error as { code?: string }).code }, 'Solicitud rechazada');
    const status = (error as { statusCode?: number }).statusCode;
    const invalid =
      error instanceof z.ZodError || (status !== undefined && status >= 400 && status < 500);
    reply.code(invalid ? (status ?? 400) : 500).send({
      ok: false,
      error: {
        code: status === 429 ? 'AUTH_THROTTLED' : invalid ? 'VALIDATION' : 'INTERNAL',
        message:
          status === 429
            ? 'Demasiados intentos. Esperá un minuto.'
            : invalid
              ? 'La solicitud no es válida.'
              : 'No se pudo completar la operación. Verificá su estado antes de reintentar.',
        retryable: status === 429 || !invalid,
      },
    });
  });
  const statuses: Record<string, number> = {
    VALIDATION: 400,
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    AUTH_THROTTLED: 429,
    NOT_FOUND: 404,
    DB_BUSY: 503,
    DISK_FULL: 503,
    INTERNAL: 500,
  };
  function route(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    operation: string,
    payload: (r: { body: unknown; query: unknown; params: unknown }) => unknown = (r) =>
      r.body ?? null,
  ) {
    app.route({
      method,
      url,
      ...(operation === 'backups.upload' ? { bodyLimit: 128 * 1024 * 1024 } : {}),
      config:
        operation === 'auth.login'
          ? {
              rateLimit: {
                max: 5,
                timeWindow: 60000,
                keyGenerator: (request) => {
                  const username = (request.body as { username?: unknown } | null)?.username;
                  return `${request.ip}:${typeof username === 'string' ? username.trim().toLowerCase() : ''}`;
                },
              },
            }
          : {},
      handler: async (req, reply) => {
        if (method !== 'GET') z.strictObject({}).parse(req.query);
        if (
          method === 'GET' &&
          ![
            'products.search',
            'products.taxonomy',
            'products.labels',
            'sales.list',
            'stock.search',
            'stock.listLow',
            'stock.movements',
            'dashboard.monthly',
            'dashboard.compare',
            'cash.current',
            'shifts.list',
            'shifts.details',
            'audit.list',
            'exports.products',
            'exports.sales',
            'exports.stock',
            'exports.sale-items',
            'exports.shifts',
            'exports.purchases',
            'receipts.list',
            'suppliers.search',
            'purchases.list',
            'customers.search',
            'transfers.list',
            'locations.summary',
            'locations.inventory',
          ].includes(operation)
        )
          z.strictObject({}).parse(req.query);
        if (method === 'GET') z.strictObject({}).parse(req.body ?? {});
        if (['auth.logout', 'backups.create', 'backups.inspect'].includes(operation))
          z.strictObject({}).parse(req.body ?? {});
        const token = req.cookies[name] ?? null,
          result = await executor.request(operation, payload(req), token);
        if (!result.ok) return reply.code(statuses[result.error.code] ?? 409).send(result);
        if (operation === 'auth.login') {
          const grant = result.value as SessionGrant;
          reply.setCookie(name, grant.sessionToken, options);
          return { ok: true, value: { user: grant.user, csrfToken: csrf(grant.sessionToken) } };
        }
        if (operation === 'auth.status') {
          const value = result.value as { user: unknown };
          return {
            ok: true,
            value: { ...value, csrfToken: value.user && token ? csrf(token) : null },
          };
        }
        if (['auth.logout', 'auth.changePassword', 'backups.restore'].includes(operation))
          reply.clearCookie(name, options);
        if (operation === 'backups.download') {
          reply
            .type('application/octet-stream')
            .header('content-disposition', 'attachment; filename="perla-negra.backup"');
          return reply.send(result.value);
        }
        if (operation === 'exports.excel') {
          const value = result.value as { content: Uint8Array; mimeType: string; filename: string };
          return reply
            .type(value.mimeType)
            .header('content-disposition', `attachment; filename="${value.filename}"`)
            .send(Buffer.from(value.content));
        }
        if (operation.startsWith('exports.') && operation !== 'exports.preview') {
          const value = result.value as { content: string; mimeType: string; filename: string };
          return reply
            .type(value.mimeType)
            .header('content-disposition', `attachment; filename="${value.filename}"`)
            .send(value.content);
        }
        return result;
      },
    });
  }
  const query = (r: { query: unknown }) => {
    const raw = r.query as Record<string, string>,
      out: Record<string, unknown> = { ...raw };
    for (const k of ['limit', 'offset']) if (k in raw) out[k] = Number(raw[k]);
    for (const k of ['activeOnly', 'includeInactive'])
      if (k in raw) out[k] = raw[k] === 'true' ? true : raw[k] === 'false' ? false : raw[k];
    return out;
  };
  const params = (r: { params: unknown }) => r.params as Record<string, string>;
  route('GET', '/api/v1/health', 'internal.health', () => null);
  route('POST', '/api/v1/auth/login', 'auth.login');
  route('GET', '/api/v1/auth/session', 'auth.status', () => null);
  route('POST', '/api/v1/auth/logout', 'auth.logout', () => null);
  route('POST', '/api/v1/auth/password', 'auth.changePassword');
  route('POST', '/api/v1/auth/unlock-user', 'auth.unlockUser');
  route('POST', '/api/v1/auth/terminal', 'auth.terminal');
  route('POST', '/api/v1/checkout/calculate-weight', 'checkout.calculateWeight');
  route('GET', '/api/v1/users', 'users.list', () => null);
  route('POST', '/api/v1/users', 'users.save');
  route('GET', '/api/v1/products', 'products.search', (r) => ({
    query: '',
    activeOnly: false,
    limit: 50,
    ...query(r),
  }));
  route('POST', '/api/v1/products', 'products.save');
  route('GET', '/api/v1/products/:id', 'products.get', (r) => ({ productId: params(r).id }));
  route('POST', '/api/v1/products/active', 'products.setActive');
  route('GET', '/api/v1/products/taxonomy', 'products.taxonomy', (r) => query(r));
  route('POST', '/api/v1/products/categories', 'products.saveCategory');
  route('POST', '/api/v1/products/brands', 'products.saveBrand');
  route('GET', '/api/v1/barcodes/:barcode', 'products.findByBarcode', (r) => ({
    barcode: params(r).barcode,
  }));
  route('POST', '/api/v1/products/internal-barcode', 'products.proposeInternalBarcode', () => null);
  route('GET', '/api/v1/products/labels', 'products.labels', query);
  route('POST', '/api/v1/products/labels', 'products.createLabel');
  route('POST', '/api/v1/products/labels/printed', 'products.markLabelPrinted');
  route('POST', '/api/v1/products/import/preview', 'internal.importPreview');
  route('POST', '/api/v1/products/import/apply', 'products.applyImport');
  route('POST', '/api/v1/pricing/preview', 'pricing.preview');
  route('POST', '/api/v1/pricing/confirm', 'pricing.confirm');
  route('GET', '/api/v1/promotions', 'promotions.list', () => null);
  route('GET', '/api/v1/promotions/:id', 'promotions.get', (r) => ({ promotionId: params(r).id }));
  route('POST', '/api/v1/promotions', 'promotions.save');
  route('GET', '/api/v1/checkout/draft', 'checkout.getDraft', () => null);
  route('PUT', '/api/v1/checkout/draft', 'checkout.saveDraft');
  route('POST', '/api/v1/checkout/cancel', 'checkout.cancelDraft');
  route('POST', '/api/v1/sales/quote', 'sales.quote');
  route('GET', '/api/v1/sales', 'sales.list', (r) => ({ limit: 50, ...query(r) }));
  route('POST', '/api/v1/sales', 'sales.complete');
  route('GET', '/api/v1/sales/by-key/:key', 'sales.findByCheckoutKey', (r) => ({
    checkoutKey: params(r).key,
  }));
  route('GET', '/api/v1/sales/:id', 'sales.detail', (r) => ({ saleId: params(r).id }));
  route('GET', '/api/v1/sales/:id/void-preview', 'sales.previewVoid', (r) => ({
    saleId: params(r).id,
  }));
  route('POST', '/api/v1/sales/void', 'sales.void');
  route('GET', '/api/v1/sales/:id/return-preview', 'sales.previewReturn', (r) => ({
    saleId: params(r).id,
  }));
  route('POST', '/api/v1/sales/returns', 'sales.return');
  route('GET', '/api/v1/sales/:id/returns', 'sales.returns', (r) => ({
    saleId: params(r).id,
  }));
  route('GET', '/api/v1/receipts', 'receipts.list', query);
  route('POST', '/api/v1/receipts', 'receipts.create');
  route('POST', '/api/v1/receipts/printed', 'receipts.markPrinted');
  route('GET', '/api/v1/suppliers', 'suppliers.search', (r) => ({ limit: 50, ...query(r) }));
  route('GET', '/api/v1/suppliers/:id', 'suppliers.get', (r) => ({ supplierId: params(r).id }));
  route('POST', '/api/v1/suppliers', 'suppliers.save');
  route('POST', '/api/v1/suppliers/active', 'suppliers.setActive');
  route('GET', '/api/v1/suppliers/:id/account', 'supplierAccounts.detail', (r) => ({
    supplierId: params(r).id,
  }));
  route('POST', '/api/v1/supplier-payments', 'supplierAccounts.pay');
  route('GET', '/api/v1/customers', 'customers.search', (r) => ({ limit: 50, ...query(r) }));
  route('GET', '/api/v1/customers/:id', 'customers.get', (r) => ({ customerId: params(r).id }));
  route('POST', '/api/v1/customers', 'customers.save');
  route('POST', '/api/v1/customers/active', 'customers.setActive');
  route('POST', '/api/v1/customers/credit', 'customers.setCredit');
  route('GET', '/api/v1/customers/:id/account', 'customerAccounts.detail', (r) => ({
    customerId: params(r).id,
  }));
  route('POST', '/api/v1/customer-collections', 'customerAccounts.collect');
  route('GET', '/api/v1/locations/inventory', 'locations.inventory', query);
  route('GET', '/api/v1/locations', 'locations.list', () => ({}));
  route('POST', '/api/v1/locations', 'locations.save');
  route('POST', '/api/v1/locations/terminal', 'locations.assignTerminal');
  route('GET', '/api/v1/locations/summary', 'locations.summary', query);
  route('GET', '/api/v1/transfers', 'transfers.list', (r) => ({ limit: 30, ...query(r) }));
  route('GET', '/api/v1/transfers/:id', 'transfers.detail', (r) => ({ transferId: params(r).id }));
  route('POST', '/api/v1/transfers', 'transfers.dispatch');
  route('POST', '/api/v1/transfers/receive', 'transfers.receive');
  route('POST', '/api/v1/transfers/cancel', 'transfers.cancel');
  route('GET', '/api/v1/purchases/draft', 'purchases.getDraft', () => null);
  route('PUT', '/api/v1/purchases/draft', 'purchases.saveDraft');
  route('POST', '/api/v1/purchases/draft/cancel', 'purchases.cancelDraft');
  route('GET', '/api/v1/purchases', 'purchases.list', (r) => ({ limit: 50, ...query(r) }));
  route('POST', '/api/v1/purchases', 'purchases.receive');
  route('GET', '/api/v1/purchases/by-key/:key', 'purchases.findByReceiptKey', (r) => ({
    receiptKey: params(r).key,
  }));
  route('GET', '/api/v1/purchases/:id/void-preview', 'purchases.previewVoid', (r) => ({
    purchaseId: params(r).id,
  }));
  route('GET', '/api/v1/purchases/:id', 'purchases.detail', (r) => ({
    purchaseId: params(r).id,
  }));
  route('POST', '/api/v1/purchases/void', 'purchases.void');
  route('GET', '/api/v1/products/:id/last-cost', 'purchases.lastCost', (r) => ({
    productId: params(r).id,
  }));
  route('GET', '/api/v1/products/:id/cost', 'costs.get', (r) => ({
    productId: params(r).id,
  }));
  route('PUT', '/api/v1/products/:id/cost', 'costs.setReference', (r) => ({
    ...(r.body as object),
    productId: params(r).id,
  }));
  route('GET', '/api/v1/dashboard/monthly', 'dashboard.monthly', query);
  route('GET', '/api/v1/dashboard/comparison', 'dashboard.compare', query);
  route('POST', '/api/v1/control', 'control.execute');
  route('POST', '/api/v1/control/export', 'control.export');
  route('POST', '/api/v1/control/export-preview', 'control.exportPreview');
  route('GET', '/api/v1/notifications', 'notifications.list', () => null);
  route('POST', '/api/v1/notifications/read', 'notifications.markRead');
  route('GET', '/api/v1/stock', 'stock.search', (r) => ({ limit: 50, ...query(r) }));
  route('GET', '/api/v1/stock/low', 'stock.listLow', (r) => ({ limit: 50, ...query(r) }));
  route('GET', '/api/v1/stock/operations/:key', 'stock.operation', (r) => ({
    operationKey: params(r).key,
  }));
  route('GET', '/api/v1/stock/:id', 'stock.get', (r) => ({ productId: params(r).id }));
  route('GET', '/api/v1/stock/:id/movements', 'stock.movements', (r) => ({
    limit: 50,
    ...query(r),
    productId: params(r).id,
  }));
  route('POST', '/api/v1/stock/opening', 'stock.opening');
  route('POST', '/api/v1/stock/count', 'stock.count');
  route('POST', '/api/v1/stock/movement', 'stock.record');
  route('GET', '/api/v1/products/:id/lots', 'lots.status', (r) => ({
    productId: params(r).id,
  }));
  route('POST', '/api/v1/products/:id/lots/enable', 'lots.enable', (r) => ({
    productId: params(r).id,
  }));
  route('POST', '/api/v1/products/:id/lots/reconcile', 'lots.reconcile', (r) => ({
    ...(r.body as object),
    productId: params(r).id,
  }));
  route('POST', '/api/v1/lots/:id/status', 'lots.setBlocked', (r) => ({
    ...(r.body as object),
    lotId: params(r).id,
  }));
  for (const [method, url, op] of [
    ['GET', 'settings', 'settings.get'],
    ['PUT', 'settings', 'settings.save'],
    ['GET', 'settings/features', 'settings.features.get'],
    ['PUT', 'settings/features', 'settings.features.save'],
    ['GET', 'terminals/active', 'terminals.active'],
    ['GET', 'terminals', 'terminals.list'],
    ['POST', 'terminals', 'terminals.save'],
    ['GET', 'cash/current', 'cash.current'],
    ['POST', 'cash/open', 'cash.open'],
    ['POST', 'cash/close', 'cash.close'],
    ['POST', 'cash/movement', 'cash.movement'],
    ['GET', 'cash/shifts', 'shifts.list'],
    ['GET', 'cash/detail', 'shifts.details'],
    ['GET', 'audit', 'audit.list'],
  ] as const)
    route(method, `/api/v1/${url}`, op, (r) => (method === 'GET' ? query(r) : r.body));
  route('POST', '/api/v1/exports/excel', 'exports.excel');
  route('POST', '/api/v1/exports/preview', 'exports.preview');
  for (const kind of ['products', 'sales', 'stock', 'sale-items', 'shifts', 'purchases'])
    route('GET', `/api/v1/exports/${kind}`, `exports.${kind}`, query);
  route('GET', '/api/v1/backups', 'backups.list', () => ({}));
  route('POST', '/api/v1/backups', 'backups.create', () => ({}));
  route('GET', '/api/v1/backups/:id/download', 'backups.download', (r) => ({ id: params(r).id }));
  route('POST', '/api/v1/backups/:id/preview', 'backups.inspect', (r) => ({ id: params(r).id }));
  route('POST', '/api/v1/backups/restore', 'backups.restore');
  app.addContentTypeParser(
    'application/octet-stream',
    { parseAs: 'buffer', bodyLimit: 128 * 1024 * 1024 },
    (_req, body, done) => done(null, body),
  );
  route('POST', '/api/v1/backups/upload', 'backups.upload');
  return app;
}
