import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Only the local Docker development preview. Never run against a production database.
const origin = 'http://localhost:5173';
const password = process.env.BOCHA_PREVIEW_PASSWORD;
if (!password) throw new Error('BOCHA_PREVIEW_PASSWORD is required.');
let cookie = '',
  csrf = '';
async function api(path, body, method = body === undefined ? 'GET' : 'POST') {
  const response = await fetch(origin + '/api/v1' + path, {
    method,
    headers: { origin, cookie, 'content-type': 'application/json', 'x-csrf-token': csrf },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
  const result = await response.json();
  if (!result.ok) throw new Error(path + ': ' + result.error.message);
  return result.value;
}
csrf = (await api('/auth/login', { username: 'jefe', password })).csrfToken;
const existingProducts = (await api('/products?limit=100')).items;
if (
  existingProducts.some((p) => !p.sku.startsWith('DEMO-')) ||
  (await api('/sales?limit=1')).total
) {
  throw new Error(
    'Preview must have an empty catalog and sales history; no existing data overwritten.',
  );
}
await api('/backups', {});
const settings = await api('/settings');
await api(
  '/settings',
  {
    expectedRevision: settings.revision,
    businessName: 'Perla Negra · Demo',
    currency: 'ARS',
    paymentMethods: ['CASH', 'DEBIT', 'CREDIT', 'TRANSFER'],
  },
  'PUT',
);
const users = await api('/users');
for (const [username, name, role] of [
  ['vendedor', 'Lucía · Demo', 'SELLER'],
  ['supervisor', 'Martín · Demo', 'SUPERVISOR'],
]) {
  if (users.some((u) => u.username === username)) continue;
  await api('/users', { username, name, role, active: true, password: 'Bocha-Demo-2026!' });
}
const terminals = await api('/terminals');
const terminal =
  terminals.find((t) => t.name === 'Caja principal') ??
  (await api('/terminals', { name: 'Caja principal', active: true }));
if (!terminals.some((t) => t.name === 'Caja auxiliar'))
  await api('/terminals', { name: 'Caja auxiliar', active: true });
await api('/auth/terminal', { terminalId: terminal.id });
const rows = [
  ['Arroz largo fino 1 kg', 1800, 'Almacén'],
  ['Fideos tallarines 500 g', 1450, 'Almacén'],
  ['Yerba mate 1 kg', 6500, 'Almacén'],
  ['Azúcar 1 kg', 1600, 'Almacén'],
  ['Harina 000 1 kg', 1200, 'Almacén'],
  ['Aceite girasol 900 ml', 3900, 'Almacén'],
  ['Leche entera 1 L', 2200, 'Lácteos'],
  ['Yogur frutilla 190 g', 1100, 'Lácteos'],
  ['Gaseosa cola 2,25 L', 4800, 'Bebidas'],
  ['Agua mineral 1,5 L', 1500, 'Bebidas'],
  ['Cerveza lata 473 ml', 2300, 'Bebidas'],
  ['Jugo naranja 1 L', 2100, 'Bebidas'],
  ['Galletitas chocolate 170 g', 1900, 'Golosinas'],
  ['Alfajor triple', 1300, 'Golosinas'],
  ['Chocolate con leche 100 g', 3200, 'Golosinas'],
  ['Papas fritas 120 g', 2800, 'Snacks'],
  ['Detergente 500 ml', 2400, 'Limpieza'],
  ['Lavandina 1 L', 1300, 'Limpieza'],
  ['Papel higiénico 4 rollos', 3200, 'Limpieza'],
  ['Servilletas 100 unidades', 900, 'Limpieza'],
  ['Jamón cocido', 14500, 'Fiambrería', 'KG'],
  ['Queso cremoso', 9800, 'Fiambrería', 'KG'],
  ['Salame tipo Milán', 19000, 'Fiambrería', 'KG'],
  ['Pan francés', 3600, 'Panadería', 'KG'],
  ['Sal fina 500 g · sin contar', 950, 'Almacén', 'UNKNOWN'],
  ['Bolsa reutilizable', 600, 'Accesorios', 'UNTRACKED'],
  ['Galletitas edición anterior', 1200, 'Golosinas', 'INACTIVE'],
];
const products = [];
for (const [index, [name, pesos, category, kind]] of rows.entries()) {
  const sku = 'DEMO-' + String(index + 1).padStart(3, '0');
  const p =
    existingProducts.find((p) => p.sku === sku) ??
    (await api('/products', {
      sku,
      barcode: '779000000' + String(index + 1).padStart(4, '0'),
      name,
      category,
      saleUnit: kind === 'KG' ? 'KG' : 'UNIT',
      priceCents: pesos * 100,
      active: kind !== 'INACTIVE',
      trackStock: kind !== 'UNTRACKED',
      minStockBase: kind === 'KG' ? 1500 : 8,
    }));
  if (!['UNKNOWN', 'UNTRACKED'].includes(kind) && !(await api('/stock/' + p.id)).initialized)
    await api('/stock/opening', {
      productId: p.id,
      operationKey: randomUUID(),
      expectedRevision: 0,
      expectedProductRevision: p.revision,
      reason: 'Stock inicial de demostración',
      countedBase: kind === 'KG' ? 30000 : 120,
    });
  products.push(await api('/products/' + p.id));
}
const dates = [],
  shifts = [];
const day = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
function line(p, quantityBase) {
  return {
    lineId: randomUUID(),
    productId: p.id,
    quantityBase,
    expectedProductRevision: p.revision,
    expectedPriceCents: p.priceCents,
    nameSnapshot: p.name,
    unitSnapshot: p.saleUnit,
  };
}
for (let batch = 0; batch < 8; batch++) {
  const date = day(49 - batch * 7);
  const shift =
    (await api('/cash/current?terminalId=' + terminal.id)) ??
    (await api('/cash/open', {
      terminalId: terminal.id,
      openingCashCents: 2000000,
      operationKey: randomUUID(),
    }));
  shifts.push({ id: shift.id, date });
  await api('/cash/movement', {
    shiftId: shift.id,
    kind: 'IN',
    amountCents: 500000,
    reason: 'Cambio de demostración',
    operationKey: randomUUID(),
  });
  for (let n = 0; n < 8; n++) {
    const k = batch * 8 + n;
    const selected = [products[k % 20], products[(k * 3 + 5) % 20]];
    if (selected[0].id === selected[1].id) selected[1] = products[(k + 1) % 20];
    const lines = selected.map((p, i) => line(p, 1 + ((k + i) % 3)));
    if (n % 3 === 0) lines.push(line(products[20 + (n % 4)], 250 + n * 50));
    const gross = lines.reduce((s, l) => {
      const p = products.find((x) => x.id === l.productId);
      return s + Math.round((l.quantityBase * p.priceCents) / (p.saleUnit === 'KG' ? 1000 : 1));
    }, 0);
    const discount =
      k % 7 === 0
        ? { type: 'PERCENT', basisPoints: 1000 }
        : k % 11 === 0
          ? { type: 'FIXED', amountCents: 20000 }
          : { type: 'NONE' };
    const total =
      gross -
      (discount.type === 'PERCENT'
        ? Math.round(gross / 10)
        : discount.type === 'FIXED'
          ? 20000
          : 0);
    const method = ['CASH', 'CASH', 'DEBIT', 'CREDIT', 'TRANSFER'][k % 5];
    const payments =
      n === 7
        ? [
            { method: 'CASH', amountCents: Math.floor(total / 2) },
            { method: 'DEBIT', amountCents: total - Math.floor(total / 2) },
          ]
        : [
            {
              method,
              amountCents: total,
              ...(method === 'CASH' ? { tenderedCents: Math.ceil(total / 100000) * 100000 } : {}),
            },
          ];
    const sale = await api('/sales', { checkoutKey: randomUUID(), lines, discount, payments });
    dates.push({ id: sale.id, date });
    if (k === 9 || k === 37)
      await api('/sales/void', {
        saleId: sale.id,
        operationKey: randomUUID(),
        reason: 'Anulación de demostración',
        acknowledgeRecount: true,
      });
  }
  await api('/cash/movement', {
    shiftId: shift.id,
    kind: 'OUT',
    amountCents: 300000,
    reason: 'Retiro de demostración',
    operationKey: randomUUID(),
  });
  const detail = await api('/cash/detail?shiftId=' + shift.id);
  await api('/cash/close', {
    shiftId: shift.id,
    countedCashCents: detail.expectedCashCents + (batch === 3 ? -10000 : 0),
    operationKey: randomUUID(),
  });
}
for (const [index, countedBase] of [
  [3, 3],
  [7, 0],
  [13, 5],
  [21, 650],
]) {
  const balance = await api('/stock/' + products[index].id);
  await api('/stock/count', {
    productId: balance.productId,
    operationKey: randomUUID(),
    expectedRevision: balance.revision,
    expectedProductRevision: balance.productRevision,
    countedBase,
    reason: 'Conteo de demostración: alerta de reposición',
  });
}
for (const [kind, deltaBase] of [
  ['RECEIPT', 24],
  ['WASTE', -2],
]) {
  const balance = await api('/stock/' + products[6].id);
  await api('/stock/movement', {
    productId: balance.productId,
    operationKey: randomUUID(),
    expectedRevision: balance.revision,
    expectedProductRevision: balance.productRevision,
    kind,
    deltaBase,
    reason: kind === 'RECEIPT' ? 'Entrega de proveedor · demo' : 'Envases dañados · demo',
  });
}
// Change historical dates only on the known development volume, while API is stopped.
execFileSync('docker', ['compose', 'stop', 'api'], { stdio: 'inherit' });
try {
  const sqlScript = `const Database=require('better-sqlite3');const db=new Database('/data/bocha.sqlite');const data=${JSON.stringify({ dates, shifts })};db.transaction(()=>{for(const r of data.dates){db.prepare('UPDATE sales SET created_at_utc=?,business_date=?,local_month=? WHERE id=?').run(r.date+'T15:00:00.000Z',r.date,r.date.slice(0,7),r.id);db.prepare('UPDATE sale_events SET created_at_utc=? WHERE sale_id=?').run(r.date+'T15:05:00.000Z',r.id);db.prepare('UPDATE stock_movements SET created_at_utc=?,business_date=? WHERE sale_id=?').run(r.date+'T15:00:00.000Z',r.date,r.id);}for(const r of data.shifts){db.prepare('UPDATE register_shifts SET opened_at_utc=?,closed_at_utc=? WHERE id=?').run(r.date+'T12:00:00.000Z',r.date+'T22:00:00.000Z',r.id);db.prepare('UPDATE register_movements SET created_at_utc=? WHERE shift_id=?').run(r.date+'T16:00:00.000Z',r.id);}})();console.log('Integrity:',db.pragma('integrity_check'), 'Foreign keys:',db.pragma('foreign_key_check'));db.close();`;
  execFileSync(
    'docker',
    ['compose', 'run', '--no-deps', '--rm', '-T', '--entrypoint', 'node', 'api', '-e', sqlScript],
    { stdio: 'inherit' },
  );
} finally {
  execFileSync('docker', ['compose', 'up', '-d', 'api'], { stdio: 'inherit' });
}
for (let i = 0; i < 30; i++) {
  try {
    await api('/health');
    break;
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
csrf = (await api('/auth/login', { username: 'jefe', password })).csrfToken;
await api('/auth/terminal', { terminalId: terminal.id });
await api('/cash/open', {
  terminalId: terminal.id,
  openingCashCents: 3000000,
  operationKey: randomUUID(),
});
const current = await api('/checkout/draft');
await api(
  '/checkout/draft',
  {
    expectedRevision: current?.revision ?? 0,
    body: {
      checkoutKey: randomUUID(),
      lines: [line(products[0], 2), line(products[6], 1), line(products[20], 250)],
      discount: { type: 'PERCENT', basisPoints: 500 },
    },
  },
  'PUT',
);
await api('/backups', {});
console.log(
  JSON.stringify({
    products: products.length,
    historicalSales: dates.length,
    closedShifts: shifts.length,
    preparedSale: '2 arroz + leche + 250 g jamón; 5% descuento; $8.953,75',
    demoUsers: ['vendedor', 'supervisor'],
  }),
);
