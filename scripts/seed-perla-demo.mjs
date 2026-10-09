import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import Database from 'better-sqlite3';

// Local development sample. All created records are identified by PN-DEMO-*.
const origin = process.env.PERLA_DEMO_ORIGIN ?? 'http://localhost:3090';
const password = process.env.PERLA_DEMO_PASSWORD;
const dbPath = resolve('.data/web/bocha.sqlite');
if (!password) throw new Error('Definí PERLA_DEMO_PASSWORD para la cuenta jefe local.');
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  throw new Error('La carga ficticia solo admite un servidor localhost.');

let cookie = '';
let csrf = '';
async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(`${origin}/api/v1${path}`, {
    method,
    headers: { origin, cookie, 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';', 1)[0];
  const result = await response.json();
  if (!result.ok) throw new Error(`${path}: ${result.error?.message ?? response.status}`);
  return result.value;
}

const health = await api('/health');
if (!health) throw new Error('La API local no está lista.');
csrf = (await api('/auth/login', { username: 'jefe', password })).csrfToken;
const previousSession = await api('/auth/session');
await api('/backups', {});
const featureStatus = await api('/settings/features');
if (!featureStatus.enabled.SUPPLIERS_PURCHASES || !featureStatus.enabled.COSTS_MARGIN || !featureStatus.enabled.LOTS) {
  await api(
    '/settings/features',
    {
      expectedRevision: featureStatus.revision,
      enabled: { SUPPLIERS_PURCHASES: true, COSTS_MARGIN: true, LOTS: true, RETURNS: true },
    },
    'PUT',
  );
}

const taxonomy = await api('/products/taxonomy');
const categories = ['Pescados frescos', 'Mariscos', 'Congelados', 'Preparados', 'Conservas'];
const brands = ['Perla Negra', 'Costa Azul', 'Mar del Plata'];
const categoryIds = new Map(taxonomy.categories.map((item) => [item.name, item.id]));
const brandIds = new Map(taxonomy.brands.map((item) => [item.name, item.id]));
for (const name of categories) {
  if (!categoryIds.has(name))
    categoryIds.set(name, (await api('/products/categories', { name, active: true })).id);
}
for (const name of brands) {
  if (!brandIds.has(name))
    brandIds.set(name, (await api('/products/brands', { name, active: true })).id);
}

// Prices and quantities are deliberately illustrative, not commercial prices.
const catalog = [
  ['Filet de merluza fresco', 8900, 'Pescados frescos', 'Perla Negra', 'KG', 24000, 6000],
  ['Merluza entera', 6500, 'Pescados frescos', 'Perla Negra', 'KG', 29000, 6000],
  ['Corvina fresca', 9800, 'Pescados frescos', 'Perla Negra', 'KG', 18000, 4000],
  ['Pescadilla fresca', 7400, 'Pescados frescos', 'Perla Negra', 'KG', 21000, 4000],
  ['Salmón rosado', 24500, 'Pescados frescos', 'Costa Azul', 'KG', 13000, 3000],
  ['Lenguado', 19800, 'Pescados frescos', 'Perla Negra', 'KG', 11000, 3000],
  ['Atún fresco', 16900, 'Pescados frescos', 'Costa Azul', 'KG', 10000, 2500],
  ['Calamar entero', 10800, 'Mariscos', 'Mar del Plata', 'KG', 15000, 3500],
  ['Anillas de calamar', 14900, 'Mariscos', 'Mar del Plata', 'KG', 12500, 3000],
  ['Langostinos pelados', 21500, 'Mariscos', 'Costa Azul', 'KG', 13000, 3500],
  ['Langostinos enteros', 17800, 'Mariscos', 'Costa Azul', 'KG', 14500, 3000],
  ['Mejillones', 11900, 'Mariscos', 'Mar del Plata', 'KG', 11000, 3000],
  ['Mix de mariscos', 16200, 'Mariscos', 'Perla Negra', 'KG', 12000, 2500],
  ['Filet de merluza congelado 1 kg', 9400, 'Congelados', 'Costa Azul', 'UNIT', 36, 8],
  ['Bastones de merluza 500 g', 6800, 'Congelados', 'Costa Azul', 'UNIT', 36, 8],
  ['Rabas congeladas 500 g', 11400, 'Congelados', 'Mar del Plata', 'UNIT', 28, 7],
  ['Langostinos congelados 500 g', 13500, 'Congelados', 'Costa Azul', 'UNIT', 30, 7],
  ['Hamburguesas de pescado x4', 5900, 'Preparados', 'Perla Negra', 'UNIT', 34, 8],
  ['Milanesas de merluza x4', 7900, 'Preparados', 'Perla Negra', 'UNIT', 32, 8],
  ['Empanadas de vigilia x6', 9200, 'Preparados', 'Perla Negra', 'UNIT', 30, 8],
  ['Escabeche de pescado 350 g', 7200, 'Conservas', 'Perla Negra', 'UNIT', 24, 6],
  ['Atún al natural lata 170 g', 3900, 'Conservas', 'Mar del Plata', 'UNIT', 50, 10],
  ['Sardinas en aceite lata 125 g', 3300, 'Conservas', 'Mar del Plata', 'UNIT', 40, 10],
  ['Sal marina fina 500 g', 1800, 'Conservas', 'Perla Negra', 'UNIT', 35, 8],
];
const list = (await api('/products?limit=100')).items;
const products = [];
for (const [
  index,
  [name, pesos, category, brand, saleUnit, opening, minimum],
] of catalog.entries()) {
  const sku = `PN-DEMO-${String(index + 1).padStart(3, '0')}`;
  let product = list.find((item) => item.sku === sku);
  if (!product) {
    product = await api('/products', {
      sku,
      barcode: null,
      generateInternalBarcode: true,
      name,
      category,
      categoryId: categoryIds.get(category),
      brand,
      brandId: brandIds.get(brand),
      saleUnit,
      priceCents: pesos * 100,
      active: true,
      trackStock: true,
      minStockBase: minimum,
    });
  }
  const stock = await api(`/stock/${product.id}`);
  if (!stock.initialized) {
    await api('/stock/opening', {
      productId: product.id,
      operationKey: randomUUID(),
      expectedRevision: stock.revision,
      expectedProductRevision: stock.productRevision,
      countedBase: opening,
      reason: 'Existencia ficticia de demostración',
    });
  }
  products.push(await api(`/products/${product.id}`));
}

const productsWithoutCost = [];
for (const product of products) {
  if (!(await api(`/products/${product.id}/cost`))) productsWithoutCost.push(product);
}
if (productsWithoutCost.length) {
  const suppliers = await api('/suppliers?query=demo&status=ALL&limit=50');
  const supplier =
    suppliers.items.find((item) => item.name === 'Proveedor demo Perla Negra') ??
    (await api('/suppliers', { name: 'Proveedor demo Perla Negra' }));
  await api('/purchases', {
    receiptKey: randomUUID(),
    supplierId: supplier.id,
    businessDate: new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()),
    lines: productsWithoutCost.map((product) => ({
      lineId: randomUUID(),
      productId: product.id,
      quantityBase: product.saleUnit === 'KG' ? 1000 : 5,
      unitCostCents: Math.max(1, Math.round(product.priceCents * 0.55)),
      expectedProductRevision: product.revision,
    })),
  });
}

// Un producto de la demo muestra el circuito completo sin obligar a usar lotes en todo el catálogo.
const lotProduct = products[0];
const lotStatus = await api(`/products/${lotProduct.id}/lots`);
if (!lotStatus.enabled) await api(`/products/${lotProduct.id}/lots/enable`, {});
const pendingLotStatus = await api(`/products/${lotProduct.id}/lots`);
if (!pendingLotStatus.reconciled && pendingLotStatus.stockQuantityBase > 0) {
  const first = Math.floor(pendingLotStatus.stockQuantityBase * 0.6);
  await api(`/products/${lotProduct.id}/lots/reconcile`, {
    operationKey: randomUUID(),
    lots: [
      { code: 'PN-DEMO-FRESCO', expiresOn: new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10), quantityBase: first },
      { code: 'PN-DEMO-RESERVA', expiresOn: null, quantityBase: pendingLotStatus.stockQuantityBase - first },
    ],
  });
}

const terminals = await api('/terminals');
let terminal = terminals.find((item) => item.name === 'Caja demostración');
if (!terminal) terminal = await api('/terminals', { name: 'Caja demostración', active: true });
const db = new Database(dbPath);
const hasDemoSales =
  db
    .prepare(
      "SELECT COUNT(*) AS total FROM sale_items i JOIN products p ON p.id=i.product_id WHERE p.sku LIKE 'PN-DEMO-%'",
    )
    .get().total > 0;
db.close();
if (hasDemoSales) {
  console.log(
    JSON.stringify({ products: products.length, sales: 'ya cargadas; no se duplicaron' }),
  );
  process.exit(0);
}

await api('/auth/terminal', { terminalId: terminal.id });
const baseDate = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Argentina/Buenos_Aires',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
const day = (offset) => new Date(`${baseDate}T12:00:00Z`).getTime() - offset * 86_400_000;
const date = (offset) => new Date(day(offset)).toISOString().slice(0, 10);
const historical = [];
function line(product, quantityBase) {
  return {
    lineId: randomUUID(),
    productId: product.id,
    quantityBase,
    expectedProductRevision: product.revision,
    expectedPriceCents: product.priceCents,
    nameSnapshot: product.name,
    unitSnapshot: product.saleUnit,
  };
}
for (const [batch, offset] of [35, 22, 8, 0].entries()) {
  let shift = await api(`/cash/current?terminalId=${terminal.id}`);
  if (!shift)
    shift = await api('/cash/open', {
      terminalId: terminal.id,
      openingCashCents: 1500000,
      operationKey: randomUUID(),
    });
  const saleIds = [];
  for (let n = 0; n < 8; n++) {
    const a = products[(batch * 5 + n * 2) % products.length];
    const b = products[(batch * 5 + n * 2 + 3) % products.length];
    const lines = [
      line(a, a.saleUnit === 'KG' ? 350 + n * 40 : 1 + (n % 2)),
      line(b, b.saleUnit === 'KG' ? 450 + n * 25 : 1),
    ];
    const gross = lines.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      return (
        total +
        Math.round(
          (item.quantityBase * product.priceCents) / (product.saleUnit === 'KG' ? 1000 : 1),
        )
      );
    }, 0);
    const discount = n === 3 ? { type: 'PERCENT', basisPoints: 500 } : { type: 'NONE' };
    const total = gross - (discount.type === 'PERCENT' ? Math.round(gross * 0.05) : 0);
    const method = ['CASH', 'DEBIT', 'TRANSFER', 'CREDIT'][n % 4];
    const sale = await api('/sales', {
      checkoutKey: randomUUID(),
      lines,
      discount,
      payments: [
        {
          method,
          amountCents: total,
          ...(method === 'CASH' ? { tenderedCents: Math.ceil(total / 100000) * 100000 } : {}),
        },
      ],
    });
    saleIds.push(sale.id);
  }
  const detail = await api(`/cash/detail?shiftId=${shift.id}`);
  await api('/cash/close', {
    shiftId: shift.id,
    countedCashCents: detail.expectedCashCents + (batch === 2 ? -15000 : 0),
    operationKey: randomUUID(),
  });
  historical.push({ shiftId: shift.id, saleIds, date: date(offset) });
}
// Keep the sale, movement and shift dates together, in one transaction. Only
// newly created demo IDs are touched; the existing store records stay intact.
const writable = new Database(dbPath);
writable.pragma('busy_timeout = 10000');
writable.transaction(() => {
  for (const batch of historical) {
    const timestamp = `${batch.date}T16:00:00.000Z`;
    for (const id of batch.saleIds) {
      writable
        .prepare('UPDATE sales SET created_at_utc=?, business_date=?, local_month=? WHERE id=?')
        .run(timestamp, batch.date, batch.date.slice(0, 7), id);
      writable
        .prepare('UPDATE sale_events SET created_at_utc=? WHERE sale_id=?')
        .run(timestamp, id);
      writable
        .prepare('UPDATE stock_movements SET created_at_utc=?, business_date=? WHERE sale_id=?')
        .run(timestamp, batch.date, id);
    }
    writable
      .prepare('UPDATE register_shifts SET opened_at_utc=?, closed_at_utc=? WHERE id=?')
      .run(`${batch.date}T12:00:00.000Z`, `${batch.date}T22:00:00.000Z`, batch.shiftId);
    writable
      .prepare('UPDATE register_movements SET created_at_utc=? WHERE shift_id=?')
      .run(timestamp, batch.shiftId);
  }
})();
const integrity = writable.pragma('integrity_check');
writable.close();
if (integrity[0]?.integrity_check !== 'ok')
  throw new Error('La verificación de integridad no pasó.');
if (previousSession.terminalId)
  await api('/auth/terminal', { terminalId: previousSession.terminalId });
await api('/backups', {});
console.log(
  JSON.stringify({
    products: products.length,
    sales: historical.reduce((n, group) => n + group.saleIds.length, 0),
    closedShifts: historical.length,
    dates: historical.map((group) => group.date),
    backup: 'creado antes y después',
  }),
);
