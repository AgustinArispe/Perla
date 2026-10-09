import { build } from 'esbuild';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';

// Isolated, persistent development fixture. Never opens an existing store database.
const RealDate = Date;
const today = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Argentina/Buenos_Aires',
}).format(new RealDate());
const end = new RealDate(`${today}T12:00:00Z`);
const start = new RealDate(end);
start.setUTCMonth(start.getUTCMonth() - 4);
const directory = resolve('.data', `market-history-${today}-${randomUUID().slice(0, 8)}`);
await mkdir(directory, { recursive: true });
const databasePath = join(directory, 'market.sqlite');
assert(!existsSync(databasePath));
const bundle = join(directory, 'fixture-runtime.cjs');
await build({
  stdin: {
    contents:
      "export { ServerRuntime } from './src/server/runtime'; export { AuthService } from './src/worker/auth/service';",
    resolveDir: resolve('.'),
    loader: 'ts',
  },
  outfile: bundle,
  bundle: true,
  platform: 'node',
  target: 'node24',
  packages: 'external',
  plugins: [
    {
      name: 'migrations',
      setup(b) {
        b.onResolve({ filter: /\.sql\?raw$/ }, (a) => ({
          path: resolve(a.resolveDir, a.path.slice(0, -4)),
          namespace: 'sql',
        }));
        b.onLoad({ filter: /.*/, namespace: 'sql' }, async (a) => ({
          contents: await readFile(a.path, 'utf8'),
          loader: 'text',
        }));
      },
    },
  ],
});
const { ServerRuntime, AuthService } = createRequire(import.meta.url)(bundle);
let clock = start.getTime() - 3 * 3600000;
// Only this offline process uses a simulated clock; production code is untouched.
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clock]));
  }
  static now() {
    return clock;
  }
};
const at = (date, hour, minute = 0) => {
  clock = RealDate.parse(
    `${date}T${String(hour + 3).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
  );
};
const key = randomBytes(32).toString('hex');
const runtime = new ServerRuntime({
  databasePath,
  backupDirectory: join(directory, 'backups'),
  backupKey: Buffer.from(key, 'hex'),
  appVersion: '0.1.0',
  sessionIdleTimeoutMs: 24 * 3600000,
  sessionMaxLifetimeMs: 48 * 3600000,
});
const db = runtime.database;
let token;
const ownerPassword = 'Prueba-Web-Bocha-2026!';
const employeePassword = 'Mercado2026!';
async function call(operation, payload = {}, session = token) {
  const result = await runtime.request(operation, payload, session);
  if (!result.ok)
    throw new Error(`${operation} ${new Date().toISOString()}: ${JSON.stringify(result.error)}`);
  return result.value;
}
const auth = new AuthService(db);
token = auth.bootstrap({
  username: 'jefe',
  name: 'Andrea · Jefa del mercado',
  password: ownerPassword,
}).sessionToken;
const credentials = [
  ['caja1', 'Lucía Fernández · Caja mañana', 'SELLER'],
  ['caja2', 'Martín López · Caja tarde', 'SELLER'],
  ['fiambreria', 'Diego Gómez · Fiambrería', 'SUPERVISOR'],
];
let state = 20261005;
function random() {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return state / 4294967296;
}
const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
const choose = (items) => items[integer(0, items.length - 1)];
const dateAfter = (date, days) =>
  new RealDate(RealDate.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
function ean(index) {
  // Syntactically valid synthetic EAN-13; these are fixture identifiers, not registered brand GTINs.
  const body = `779990${String(index).padStart(6, '0')}`;
  const sum = [...body].reduce((n, digit, i) => n + Number(digit) * (i % 2 ? 3 : 1), 0);
  return body + ((10 - (sum % 10)) % 10);
}
const catalog = [];
function group(category, brand, unit, rows) {
  for (const [name, price] of rows) catalog.push({ name, price, category, brand, unit });
}
group('Almacén', 'Del Mercado', 'UNIT', [
  ['Arroz largo fino 1 kg', 1800],
  ['Arroz integral 1 kg', 2400],
  ['Fideos tallarines 500 g', 1500],
  ['Fideos tirabuzón 500 g', 1500],
  ['Fideos spaghetti 500 g', 1600],
  ['Harina 000 1 kg', 1300],
  ['Harina leudante 1 kg', 1700],
  ['Azúcar 1 kg', 1700],
  ['Sal fina 500 g', 900],
  ['Aceite de girasol 900 ml', 3600],
  ['Aceite de oliva 500 ml', 9200],
  ['Polenta 500 g', 1200],
  ['Lentejas 400 g', 1900],
  ['Porotos 400 g', 1800],
  ['Puré de tomate 520 g', 1400],
  ['Tomate triturado 400 g', 1600],
  ['Atún al natural 170 g', 3800],
  ['Arvejas lata 300 g', 1200],
  ['Choclo lata 300 g', 1500],
  ['Mayonesa 250 g', 2300],
  ['Mostaza 250 g', 1700],
  ['Ketchup 250 g', 2200],
  ['Vinagre 500 ml', 1400],
  ['Caldo verduras x12', 1800],
]);
group('Infusiones y desayuno', 'La Estancia', 'UNIT', [
  ['Yerba suave 1 kg', 6200],
  ['Yerba tradicional 500 g', 3400],
  ['Yerba con hierbas 500 g', 3600],
  ['Café molido 250 g', 5400],
  ['Café instantáneo 100 g', 6800],
  ['Té negro x25', 1900],
  ['Mate cocido x25', 1600],
  ['Cacao 180 g', 3200],
  ['Mermelada frutilla 390 g', 2900],
  ['Dulce de leche 400 g', 3800],
  ['Miel 500 g', 4800],
]);
group('Lácteos', 'Campos del Sur', 'UNIT', [
  ['Leche entera 1 L', 2100],
  ['Leche descremada 1 L', 2100],
  ['Yogur frutilla 190 g', 1000],
  ['Yogur vainilla 190 g', 1000],
  ['Yogur bebible 1 L', 3300],
  ['Manteca 200 g', 3600],
  ['Crema de leche 200 ml', 2700],
  ['Queso untable 290 g', 3600],
]);
group('Bebidas', 'Sierra Azul', 'UNIT', [
  ['Agua mineral 1,5 L', 1400],
  ['Agua mineral 2 L', 1700],
  ['Soda 2 L', 1700],
  ['Gaseosa cola 2,25 L', 4600],
  ['Gaseosa naranja 2,25 L', 3900],
  ['Gaseosa lima limón 2,25 L', 3900],
  ['Jugo naranja 1 L', 2300],
  ['Agua saborizada pomelo 1,5 L', 2600],
  ['Cerveza lata 473 ml', 2400],
  ['Cerveza botella 1 L', 3800],
  ['Vino tinto 750 ml', 4900],
  ['Vino blanco 750 ml', 4500],
]);
group('Galletitas y golosinas', 'Dulce Momento', 'UNIT', [
  ['Galletitas de agua 200 g', 1700],
  ['Galletitas surtidas 400 g', 3200],
  ['Galletitas chocolate 170 g', 2100],
  ['Galletitas vainilla 170 g', 2000],
  ['Bizcochos salados 200 g', 1800],
  ['Alfajor chocolate triple', 1500],
  ['Alfajor dulce de leche', 1200],
  ['Chocolate con leche 100 g', 3400],
  ['Caramelos surtidos 150 g', 1700],
  ['Papas fritas 120 g', 3100],
  ['Maní salado 100 g', 1800],
  ['Palitos salados 100 g', 1600],
]);
group('Limpieza', 'Hogar Claro', 'UNIT', [
  ['Detergente 500 ml', 2200],
  ['Lavandina 1 L', 1300],
  ['Jabón para ropa 800 g', 3800],
  ['Suavizante 900 ml', 3200],
  ['Limpiador pisos 900 ml', 2100],
  ['Esponja cocina x2', 1600],
  ['Bolsas residuos x10', 1800],
  ['Papel higiénico x4', 3400],
  ['Rollo cocina x3', 2900],
  ['Servilletas x100', 1100],
  ['Jabón tocador 90 g', 1400],
  ['Shampoo 400 ml', 4900],
  ['Pasta dental 90 g', 3100],
]);
group('Congelados', 'Buen Plato', 'UNIT', [
  ['Hamburguesas x4', 4900],
  ['Milanesas de soja x4', 3900],
  ['Papas congeladas 1 kg', 5900],
  ['Verduras congeladas 500 g', 3800],
  ['Helado 1 L', 6900],
  ['Pizza muzzarella', 4800],
]);
group('Fiambrería', 'La Casona', 'KG', [
  ['Jamón cocido', 14500],
  ['Paleta cocida', 9900],
  ['Salame Milán', 18500],
  ['Mortadela', 8900],
  ['Bondiola', 21900],
  ['Queso cremoso', 10800],
  ['Queso tybo', 12500],
  ['Muzzarella', 11900],
  ['Queso reggianito', 19800],
  ['Queso sardo', 16900],
  ['Queso azul', 18900],
  ['Panceta ahumada', 17500],
]);
group('Verdulería', 'Productores de Tandil', 'KG', [
  ['Papa', 1400],
  ['Cebolla', 1200],
  ['Tomate', 2300],
  ['Zanahoria', 1300],
  ['Zapallo', 1500],
  ['Batata', 1900],
  ['Manzana roja', 2700],
  ['Banana', 3100],
  ['Naranja', 1700],
  ['Mandarina', 2200],
  ['Limón', 1800],
  ['Pera', 2600],
  ['Morrón rojo', 4900],
  ['Lechuga', 2300],
]);
group('Panadería y huevos', 'Del Mercado', 'KG', [
  ['Pan francés', 3500],
  ['Pan integral', 4800],
  ['Facturas por kilo', 8200],
]);
group('Panadería y huevos', 'Del Mercado', 'UNIT', [
  ['Huevos docena', 4600],
  ['Pan lactal 500 g', 3300],
  ['Tapas empanadas x12', 2600],
  ['Tapas pascualina x2', 2500],
]);

let saleCount = 0,
  openDays = 0;
const products = [],
  suppliers = new Map(),
  customers = [];
const lots = new Set();
const salesByMonth = new Map();
async function login(username, password) {
  const grant = await call('auth.login', { username, password }, null);
  return grant.sessionToken;
}
let ownerToken = token;
let deliToken;
const balance = (p) =>
  db
    .prepare('SELECT quantity_base AS quantity FROM inventory_balances WHERE product_id=?')
    .get(p.id)?.quantity ?? 0;
const line = (p, quantityBase) => ({
  lineId: randomUUID(),
  productId: p.id,
  quantityBase,
  expectedProductRevision: p.revision,
  expectedPriceCents: p.priceCents,
  nameSnapshot: p.name,
  unitSnapshot: p.saleUnit,
});
async function purchase(category, date, initial = false) {
  const selected = products.filter(
    (p) =>
      p.category === category &&
      p.active &&
      p.trackStock &&
      (initial || balance(p) < (p.saleUnit === 'KG' ? 25000 : 45)),
  );
  if (!selected.length) return;
  const receipt = await call(
    'purchases.receive',
    {
      receiptKey: randomUUID(),
      supplierId: suppliers.get(category).id,
      businessDate: date,
      lines: selected.map((p) => ({
        lineId: randomUUID(),
        productId: p.id,
        quantityBase: p.saleUnit === 'KG' ? integer(30, 48) * 1000 : integer(65, 100),
        unitCostCents: Math.round(p.priceCents * (p.saleUnit === 'KG' ? 0.62 : 0.69)),
        expectedProductRevision: p.revision,
        ...(lots.has(p.id)
          ? { lotCode: `SIM-${date}-${saleCount}`, expiresOn: dateAfter(date, 180) }
          : {}),
      })),
    },
    ownerToken,
  );
  await call(
    'supplierAccounts.pay',
    {
      operationKey: randomUUID(),
      supplierId: suppliers.get(category).id,
      amountCents: Math.floor(receipt.totalCents * (initial ? 1 : 0.85)),
      businessDate: date,
      method: 'TRANSFER',
      note: 'Pago de mercadería recibida · simulación',
    },
    ownerToken,
  );
}
try {
  at(start.toISOString().slice(0, 10), 7, 0);
  for (const [username, name, role] of credentials)
    await call('users.save', { username, name, role, active: true, password: employeePassword });
  const settings = await call('settings.get');
  await call('settings.save', {
    expectedRevision: settings.revision,
    businessName: 'Mercado · Simulación de cuatro meses',
    currency: 'ARS',
    paymentMethods: ['CASH', 'DEBIT', 'CREDIT', 'TRANSFER'],
  });
  const features = await call('settings.features.get');
  await call('settings.features.save', {
    expectedRevision: features.revision,
    enabled: Object.fromEntries(
      features.features.map((f) => [f.key, f.key !== 'LOCATIONS_TRANSFERS']),
    ),
  });
  const terminal = await call('terminals.save', { name: 'Caja principal', active: true });
  await call('auth.terminal', { terminalId: terminal.id });
  const categories = new Map(),
    brands = new Map();
  for (const category of new Set(catalog.map((p) => p.category))) {
    categories.set(category, await call('products.saveCategory', { name: category, active: true }));
    suppliers.set(
      category,
      await call('suppliers.save', {
        name: `${category} · Distribuidor local`,
        contactName: 'Contacto de demostración',
        notes: 'Proveedor ficticio para la simulación de un mercado.',
      }),
    );
  }
  for (const brand of new Set(catalog.map((p) => p.brand)))
    brands.set(brand, await call('products.saveBrand', { name: brand, active: true }));
  for (const [index, item] of catalog.entries()) {
    let p = await call('products.save', {
      sku: `SIM-${String(index + 1).padStart(4, '0')}`,
      barcode: item.unit === 'KG' ? null : ean(index + 1),
      generateInternalBarcode: item.unit === 'KG',
      name: item.name,
      category: item.category,
      categoryId: categories.get(item.category).id,
      brand: item.brand,
      brandId: brands.get(item.brand).id,
      saleUnit: item.unit,
      priceCents: item.price * 100,
      active: true,
      trackStock: true,
      minStockBase: item.unit === 'KG' ? 4000 : 12,
    });
    const stock = await call('stock.get', { productId: p.id });
    await call('stock.opening', {
      productId: p.id,
      operationKey: randomUUID(),
      expectedRevision: stock.revision,
      expectedProductRevision: stock.productRevision,
      countedBase: 0,
      reason: 'Inicio del negocio: inventario previo a recepción de proveedores',
    });
    p = await call('products.get', { productId: p.id });
    if (['Atún al natural 170 g', 'Arvejas lata 300 g', 'Choclo lata 300 g'].includes(item.name)) {
      await call('lots.enable', { productId: p.id });
      lots.add(p.id);
    }
    products.push(p);
  }
  for (const category of categories.keys())
    await purchase(category, start.toISOString().slice(0, 10), true);
  for (const name of [
    'María López',
    'Jorge Fernández',
    'Carolina Suárez',
    'Roberto Pérez',
    'Elena Martínez',
    'Pablo Díaz',
    'Ana Torres',
    'Sofía Romero',
    'Carlos García',
    'Laura Gómez',
    'Daniel Castro',
    'Valeria Molina',
  ]) {
    const customer = await call('customers.save', {
      name,
      notes: 'Cliente habitual ficticio del barrio',
    });
    await call('customers.setCredit', {
      customerId: customer.id,
      expectedRevision: customer.revision,
      creditEnabled: true,
      creditLimitCents: 150000000,
    });
    customers.push(customer);
  }
  await call('promotions.save', {
    name: 'Galletitas de agua: llevá 3, pagá 2',
    status: 'ACTIVE',
    priority: 20,
    type: 'X_FOR_Y',
    buyQuantity: 3,
    payQuantity: 2,
    productIds: [products.find((p) => p.name === 'Galletitas de agua 200 g').id],
    startsAt: null,
    endsAt: null,
  });
  await call('promotions.save', {
    name: 'Verdulería: 5% de descuento',
    status: 'ACTIVE',
    priority: 10,
    type: 'PERCENT',
    basisPoints: 500,
    categoryIds: [categories.get('Verdulería').id],
    startsAt: null,
    endsAt: null,
  });
  const units = products.filter((p) => p.saleUnit === 'UNIT');
  const deli = products.filter((p) => p.category === 'Fiambrería');
  const vegetables = products.filter((p) => p.category === 'Verdulería');
  let lastMonth = start.toISOString().slice(0, 7);
  for (let day = new RealDate(start); day < end; day = new RealDate(day.getTime() + 86400000)) {
    if (day.getUTCDay() === 0) continue;
    const date = day.toISOString().slice(0, 10);
    at(date, 7, 30);
    ownerToken = await login('jefe', ownerPassword);
    await call('auth.terminal', { terminalId: terminal.id }, ownerToken);
    deliToken = await login('fiambreria', employeePassword);
    await call('auth.terminal', { terminalId: terminal.id }, deliToken);
    if (date.slice(0, 7) !== lastMonth) {
      const preview = await call(
        'pricing.preview',
        {
          productIds: products.map((p) => p.id),
          change: { type: 'PERCENT', basisPoints: integer(180, 350) },
        },
        ownerToken,
      );
      await call(
        'pricing.confirm',
        { previewToken: preview.previewToken, operationKey: randomUUID() },
        ownerToken,
      );
      for (let i = 0; i < products.length; i++)
        Object.assign(
          products[i],
          await call('products.get', { productId: products[i].id }, ownerToken),
        );
      lastMonth = date.slice(0, 7);
    }
    for (const category of categories.keys()) await purchase(category, date);
    if (openDays % 6 === 0) {
      for (const p of [choose(deli), choose(vegetables)]) {
        const s = await call('stock.get', { productId: p.id }, deliToken);
        await call(
          'stock.record',
          {
            productId: p.id,
            operationKey: randomUUID(),
            expectedRevision: s.revision,
            expectedProductRevision: s.productRevision,
            kind: 'WASTE',
            deltaBase: -integer(2, 8) * 100,
            reason:
              p.category === 'Fiambrería'
                ? 'Merma por corte y limpieza de pieza'
                : 'Retiro de mercadería deteriorada',
          },
          deliToken,
        );
      }
    }
    for (let shiftIndex = 0; shiftIndex < 2; shiftIndex++) {
      const username = shiftIndex === 0 ? 'caja1' : 'caja2';
      at(date, shiftIndex === 0 ? 8 : 14);
      const seller = await login(username, employeePassword);
      await call('auth.terminal', { terminalId: terminal.id }, seller);
      const shift = await call(
        'cash.open',
        { terminalId: terminal.id, openingCashCents: 6000000, operationKey: randomUUID() },
        seller,
      );
      const count =
        integer(20, 31) + (day.getUTCDay() === 6 ? 12 : 0) + Math.floor(openDays / 30) * 2;
      for (let n = 0; n < count; n++) {
        at(
          date,
          (shiftIndex === 0 ? 8 : 14) + Math.floor((n * 310) / count / 60),
          Math.floor((n * 310) / count) % 60,
        );
        const basket = new Map();
        for (let k = 0; k < integer(2, 7); k++) {
          const p = choose(units);
          basket.set(p.id, { p, q: integer(1, 3) });
        }
        if (random() < 0.6) {
          const p = choose(deli);
          basket.set(p.id, { p, q: integer(2, 12) * 50 });
        }
        if (random() < 0.65) {
          for (let k = 0; k < integer(1, 3); k++) {
            const p = choose(vegetables);
            basket.set(p.id, { p, q: integer(5, 25) * 100 });
          }
        }
        const lines = [...basket.values()].map(({ p, q }) => line(p, q));
        const discount =
          saleCount % 37 === 0
            ? { type: 'PERCENT', basisPoints: 500 }
            : saleCount % 67 === 0
              ? { type: 'FIXED', amountCents: 30000 }
              : { type: 'NONE' };
        const body = { checkoutKey: randomUUID(), lines, discount };
        if (n === 2 && openDays % 8 === 0) {
          await call('checkout.saveDraft', { body, expectedRevision: 0 }, seller);
          await call('checkout.cancelDraft', { expectedRevision: 1 }, seller);
        }
        const quote = await call('sales.quote', body, seller);
        const credit = saleCount % 29 === 0;
        const method = choose([
          'CASH',
          'CASH',
          'CASH',
          'CASH',
          'DEBIT',
          'DEBIT',
          'DEBIT',
          'TRANSFER',
          'TRANSFER',
          'CREDIT',
        ]);
        const payments = credit
          ? []
          : saleCount % 23 === 0
            ? [
                { method: 'CASH', amountCents: Math.floor(quote.totalCents / 2) },
                {
                  method: 'DEBIT',
                  amountCents: quote.totalCents - Math.floor(quote.totalCents / 2),
                },
              ]
            : [
                {
                  method,
                  amountCents: quote.totalCents,
                  ...(method === 'CASH'
                    ? { tenderedCents: Math.ceil(quote.totalCents / 100000) * 100000 }
                    : {}),
                },
              ];
        const customer = credit ? choose(customers) : null;
        const sale = await call(
          'sales.complete',
          {
            ...body,
            payments,
            expectedQuoteHash: quote.quoteHash,
            ...(customer ? { customerId: customer.id, onAccountCents: quote.totalCents } : {}),
          },
          seller,
        );
        saleCount++;
        salesByMonth.set(date.slice(0, 7), (salesByMonth.get(date.slice(0, 7)) ?? 0) + 1);
        if (saleCount % 19 === 0) {
          const receipt = await call(
            'receipts.create',
            { saleId: sale.id, format: saleCount % 95 === 0 ? 'A4' : 'THERMAL_80' },
            seller,
          );
          await call('receipts.markPrinted', { receiptId: receipt.id }, seller);
        }
        if (saleCount % 127 === 0 && !credit)
          await call(
            'sales.void',
            {
              saleId: sale.id,
              operationKey: randomUUID(),
              reason: 'Cobro duplicado detectado y corregido en el turno',
              acknowledgeRecount: true,
            },
            ownerToken,
          );
        else if (saleCount % 83 === 0 && !credit) {
          const item = sale.items.find((i) => i.unit === 'UNIT' && !lots.has(i.productId));
          if (item)
            await call(
              'sales.return',
              {
                saleId: sale.id,
                operationKey: randomUUID(),
                reason: 'Cambio solicitado por cliente por envase dañado',
                refundMethod: method,
                items: [
                  {
                    saleItemId: item.id,
                    quantityBase: 1,
                    disposition: saleCount % 2 ? 'RESTOCK' : 'WASTE',
                  },
                ],
              },
              ownerToken,
            );
        }
      }
      at(date, shiftIndex === 0 ? 13 : 19, 30);
      if (openDays % 5 === 0 && shiftIndex === 1) {
        for (const customer of customers) {
          const account = await call(
            'customerAccounts.detail',
            { customerId: customer.id },
            ownerToken,
          );
          if (account.balanceCents > 0)
            await call(
              'customerAccounts.collect',
              {
                operationKey: randomUUID(),
                customerId: customer.id,
                amountCents: Math.max(1, Math.floor(account.balanceCents * 0.8)),
                businessDate: date,
                method: 'TRANSFER',
                note: 'Pago semanal de cuenta del barrio',
              },
              ownerToken,
            );
        }
      }
      const detail = await call('shifts.details', { shiftId: shift.id }, seller);
      const withdrawal = Math.max(0, detail.expectedCashCents - 6000000);
      if (withdrawal)
        await call(
          'cash.movement',
          {
            shiftId: shift.id,
            kind: 'OUT',
            amountCents: withdrawal,
            reason: 'Retiro de recaudación para resguardo',
            operationKey: randomUUID(),
          },
          seller,
        );
      const current = await call('shifts.details', { shiftId: shift.id }, seller);
      await call(
        'cash.close',
        {
          shiftId: shift.id,
          countedCashCents:
            current.expectedCashCents + (openDays % 17 === 0 ? choose([-30000, 15000, -10000]) : 0),
          operationKey: randomUUID(),
        },
        seller,
      );
    }
    openDays++;
    if (openDays % 12 === 0)
      console.log(`Simulados ${openDays} días abiertos · ${saleCount} ventas · hasta ${date}`);
  }
  clock = RealDate.now();
  ownerToken = await login('jefe', ownerPassword);
  token = ownerToken;
  await call('auth.terminal', { terminalId: terminal.id });
  for (const [i, count] of [
    [0, 3],
    [12, 0],
    [30, 5],
    [100, 1800],
  ]) {
    const p = products[i];
    if (!p || lots.has(p.id)) continue;
    const s = await call('stock.get', { productId: p.id });
    await call('stock.count', {
      productId: p.id,
      operationKey: randomUUID(),
      expectedRevision: s.revision,
      expectedProductRevision: s.productRevision,
      countedBase: count,
      reason: 'Conteo de estantería al inicio de la jornada',
    });
    Object.assign(p, await call('products.get', { productId: p.id }));
  }
  const inactive = products.at(-1);
  await call('products.setActive', {
    productId: inactive.id,
    expectedRevision: inactive.revision,
    active: false,
  });
  // Demonstrate near-expiry lots on an existing non-lot dairy product.
  const milk = products.find((p) => p.name === 'Leche entera 1 L');
  await call('lots.enable', { productId: milk.id });
  const milkStatus = await call('lots.status', { productId: milk.id });
  if (milkStatus.stockQuantityBase > 0)
    await call('lots.reconcile', {
      productId: milk.id,
      operationKey: randomUUID(),
      lots: [
        {
          code: 'SIM-LECHE-ULTIMA-ENTREGA',
          expiresOn: dateAfter(today, 3),
          quantityBase: milkStatus.stockQuantityBase,
        },
      ],
    });
  await call('cash.open', {
    terminalId: terminal.id,
    openingCashCents: 6000000,
    operationKey: randomUUID(),
  });
  const prepared = [
    line(products[0], 2),
    line(
      products.find((p) => p.name === 'Jamón cocido'),
      250,
    ),
    line(
      products.find((p) => p.name === 'Tomate'),
      1200,
    ),
  ];
  await call('checkout.saveDraft', {
    expectedRevision: 0,
    body: { checkoutKey: randomUUID(), lines: prepared, discount: { type: 'NONE' } },
  });
  assert.equal(db.pragma('integrity_check', { simple: true }), 'ok');
  assert.equal(db.pragma('foreign_key_check').length, 0);
  assert.equal(
    db.prepare("SELECT COUNT(*) n FROM sales WHERE strftime('%w',business_date)='0'").get().n,
    0,
  );
  assert.equal(
    db
      .prepare(
        'SELECT COUNT(*) n FROM sales WHERE register_shift_id IS NULL OR terminal_id IS NULL',
      )
      .get().n,
    0,
  );
  assert.equal(
    db
      .prepare(
        `SELECT COUNT(*) n FROM inventory_balances b WHERE b.quantity_base<>(SELECT COALESCE(SUM(delta_base),0) FROM stock_movements m WHERE m.product_id=b.product_id)`,
      )
      .get().n,
    0,
  );
  assert.equal(
    db
      .prepare(
        `SELECT COUNT(*) n FROM inventory_balances b WHERE b.quantity_base<>(SELECT COALESCE(SUM(quantity_base),0) FROM location_inventory_balances l WHERE l.product_id=b.product_id)`,
      )
      .get().n,
    0,
  );
  assert.equal(
    db
      .prepare(
        `SELECT COUNT(*) n FROM register_shifts WHERE status='CLOSED' AND difference_cents<>counted_cash_cents-expected_cash_cents`,
      )
      .get().n,
    0,
  );
  assert.equal(
    db
      .prepare(
        `SELECT COUNT(*) n FROM sales s WHERE s.total_cents<>(SELECT COALESCE(SUM(amount_cents),0) FROM sale_payments p WHERE p.sale_id=s.id)+s.on_account_cents`,
      )
      .get().n,
    0,
  );
  for (const month of salesByMonth.keys()) {
    const report = await call('dashboard.monthly', { month });
    assert(report.totals.saleCount > 0);
    assert(report.totals.netCents > 0);
  }
  const backup = await call('backups.create');
  const scalar = (table) => db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
  const summary = {
    business: 'Mercado · Simulación de cuatro meses',
    from: start.toISOString().slice(0, 10),
    to: today,
    openDays,
    products: products.length,
    users: scalar('users'),
    sales: saleCount,
    closedShifts: scalar('register_shifts') - 1,
    purchases: scalar('purchases'),
    returns: scalar('sale_returns'),
    voidedSales: db.prepare("SELECT COUNT(*) n FROM sales WHERE status='VOIDED'").get().n,
    stockMovements: scalar('stock_movements'),
    receipts: scalar('sale_receipts'),
    salesByMonth: Object.fromEntries(salesByMonth),
    backup,
    checks: 'Integridad, relaciones, calendario, stock, pagos, diferencias y reportes verificados',
  };
  await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
  await writeFile(
    resolve('.data/market-demo.json'),
    JSON.stringify(
      {
        databasePath,
        backupDirectory: join(directory, 'backups'),
        backupKey: key,
        summaryPath: join(directory, 'summary.json'),
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  runtime.close();
  globalThis.Date = RealDate;
}
