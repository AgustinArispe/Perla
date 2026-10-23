import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS, SCHEMA_VERSION } from '../../src/worker/db/migrations';
import { Application } from '../../src/worker/application';
import { AuthService } from '../../src/worker/auth/service';
import type { Product } from '../../src/shared/catalog';
import type { SaleDetail } from '../../src/shared/sales';
import type { SaleReturnDetail } from '../../src/shared/returns';

const databases: Database.Database[] = [];
const now = '2026-10-02T12:34:56.000Z';
const date = '2026-10-02';
const actor = { actor_user_id: 'owner', actor_name: 'Owner' };
const projections = [
  'product_cost_states',
  'lot_product_settings',
  'replenishment_product_rules',
  'replenishment_calendars',
  'replenishment_receipts',
  'commercial_settings',
  'control_cash_reviews',
  'customer_receivables',
  'supplier_payables',
  'sale_returns',
  'sale_return_items',
  'sale_return_refunds',
  'sale_return_events',
  'sale_return_item_lots',
  'customers',
  'suppliers',
  'customer_collections',
  'supplier_payments',
  'customer_collection_allocations',
  'supplier_payment_allocations',
  'customer_credits',
  'supplier_credits',
  'control_audit_details',
  'control_cash_review_history',
  'control_due_history',
  'checkout_drafts',
  'purchase_drafts',
  'lot_operations',
  'control_operation_results',
  'price_change_previews',
] as const;

// Identifiers below come exclusively from fixture constants / SQLite metadata.
const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
function insert(db: Database.Database, table: string, values: Record<string, unknown>) {
  const columns = Object.keys(values);
  db.prepare(
    `INSERT INTO ${quote(table)} (${columns.map(quote).join(',')}) VALUES (${columns.map(() => '?').join(',')})`,
  ).run(...Object.values(values));
}
function rows(db: Database.Database, table: string) {
  return db
    .prepare(`SELECT * FROM ${quote(table)}`)
    .all()
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}
function tableNames(db: Database.Database) {
  return (
    db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[]
  ).map((row) => row.name);
}
function snapshot(db: Database.Database) {
  return {
    schema: db.prepare('SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name').all(),
    data: Object.fromEntries(
      [...tableNames(db), 'sqlite_sequence'].map((name) => [name, rows(db, name)]),
    ),
  };
}
function through(db: Database.Database, version: number) {
  migrate(
    db,
    MIGRATIONS.filter((migration) => migration.version <= version),
  );
}

// Services write the current schema, so the populated v31 fixture uses SQL only.
// Costs, return and lot values follow the web-backup integration fixture.
function legacy() {
  const db = new Database(':memory:');
  databases.push(db);
  db.pragma('foreign_keys=ON');
  through(db, 31);
  insert(db, 'users', {
    id: 'owner',
    username: 'owner',
    name: 'Owner',
    role: 'OWNER',
    active: 1,
    password_hash: 'hash',
    revision: 7,
    created_at_utc: now,
    updated_at_utc: now,
  });
  insert(db, 'terminals', {
    id: 'terminal',
    name: 'Caja',
    active: 1,
    revision: 1,
    created_at_utc: now,
    updated_at_utc: now,
  });
  insert(db, 'register_shifts', {
    id: 'shift',
    terminal_id: 'terminal',
    status: 'OPEN',
    opening_cash_cents: 5000,
    opened_by: 'owner',
    opened_at_utc: now,
    open_key: 'open',
    open_hash: 'hash',
  });
  for (const id of ['product', 'unconfigured']) {
    insert(db, 'products', {
      id,
      sku: id,
      name: 'Producto con costo',
      search_name: 'producto con costo',
      sale_unit: 'UNIT',
      price_cents: 5000,
      active: 1,
      track_stock: 1,
      stock_initialized: 1,
      min_stock_base: 0,
      revision: 11,
      created_at_utc: now,
      updated_at_utc: now,
    });
  }
  insert(db, 'product_cost_states', {
    product_id: 'product',
    method: 'REFERENCE',
    rate_micros_per_base: 20000000,
    covered_quantity_base: 0,
    revision: 3,
    effective_at_utc: now,
    ...actor,
  });
  insert(db, 'product_cost_events', {
    id: 'cost-event',
    product_id: 'product',
    kind: 'REFERENCE',
    after_method: 'REFERENCE',
    after_rate_micros_per_base: 20000000,
    after_covered_quantity_base: 0,
    after_revision: 3,
    reason: 'Costo inicial',
    ...actor,
    created_at_utc: now,
  });
  insert(db, 'lot_product_settings', {
    product_id: 'product',
    enabled: 1,
    reconciled: 1,
    revision: 5,
    updated_at_utc: now,
    ...actor,
  });
  insert(db, 'replenishment_product_rules', {
    product_id: 'product',
    revision: 4,
    purchase_multiple_base: 6,
  });
  const location = (
    db.prepare('SELECT id FROM locations WHERE is_default=1').get() as { id: string }
  ).id;
  insert(db, 'replenishment_calendars', {
    location_id: location,
    revision: 8,
    weekdays_json: '[1,3,5]',
    closed_dates_json: '["2026-12-25"]',
  });
  db.exec('UPDATE commercial_settings SET margin_basis_points=2345,stale_days=45,revision=6');
  insert(db, 'control_cash_reviews', {
    shift_id: 'shift',
    revision: 9,
    note: 'Caja revisada',
    ...actor,
    reviewed_at_utc: now,
  });
  insert(db, 'customers', {
    id: 'customer',
    name: 'Mismo nombre',
    search_name: 'mismo nombre',
    phone: '123',
    email: 'test@example.com',
    notes: 'Cliente',
    active: 1,
    credit_enabled: 1,
    credit_limit_cents: 50000,
    revision: 4,
    created_at_utc: now,
    updated_at_utc: now,
  });
  insert(db, 'suppliers', {
    id: 'supplier',
    name: 'Mismo nombre',
    search_name: 'mismo nombre',
    phone: '456',
    contact_name: 'Contacto',
    address: 'Dirección',
    notes: 'Proveedor',
    active: 1,
    revision: 3,
    created_at_utc: now,
    updated_at_utc: now,
  });
  for (const [index, suffix] of ['', '-paid', '-none'].entries()) {
    insert(db, 'sales', {
      id: `sale${suffix}`,
      number: index + 1,
      checkout_key: `checkout${suffix}`,
      payload_hash: 'hash',
      status: 'COMPLETED',
      created_at_utc: now,
      business_date: date,
      local_month: '2026-10',
      subtotal_cents: 5000,
      discount_cents: 0,
      total_cents: 5000,
      discount_json: '{"type":"NONE","value":0}',
      ...actor,
      terminal_id: 'terminal',
      register_shift_id: 'shift',
      customer_id: 'customer',
      customer_name: 'Mismo nombre',
      on_account_cents: suffix === '-none' ? 0 : 4000,
      location_id: location,
    });
    insert(db, 'purchases', {
      id: `purchase${suffix}`,
      number: index + 1,
      receipt_key: `receipt${suffix}`,
      payload_hash: 'hash',
      supplier_id: 'supplier',
      supplier_name: 'Mismo nombre',
      supplier_phone: '456',
      status: 'RECEIVED',
      received_at_utc: now,
      business_date: date,
      total_cents: 2500,
      stock_applied: 1,
      ...actor,
    });
    if (suffix !== '-none') {
      const debt = {
        original_cents: 2000,
        balance_cents: suffix ? 0 : 1500,
        status: suffix ? 'PAID' : 'OPEN',
        created_at_utc: now,
        updated_at_utc: now,
        due_on: '2026-11-01',
        due_revision: 5,
      };
      insert(db, 'customer_receivables', {
        sale_id: `sale${suffix}`,
        customer_id: 'customer',
        ...debt,
      });
      insert(db, 'supplier_payables', {
        purchase_id: `purchase${suffix}`,
        supplier_id: 'supplier',
        ...debt,
      });
    }
  }
  insert(db, 'sale_items', {
    id: 'sale-item',
    sale_id: 'sale',
    line_id: 'line',
    position: 0,
    product_id: 'product',
    sku: 'product',
    barcode: '7790001',
    name: 'Producto con costo',
    unit: 'UNIT',
    unit_price_cents: 1000,
    quantity_base: 5,
    gross_cents: 5000,
    discount_cents: 0,
    net_cents: 5000,
    cost_method: 'REFERENCE',
    cost_rate_micros_per_base: 20000000,
    cost_cents: 2000,
    cost_effective_at_utc: now,
    category_name: 'Almacén',
  });
  insert(db, 'sale_payments', {
    id: 'payment',
    sale_id: 'sale',
    position: 0,
    method: 'CASH',
    amount_cents: 1000,
    tendered_cents: 1500,
    change_cents: 500,
  });
  insert(db, 'sale_events', {
    id: 'sale-event',
    sale_id: 'sale',
    kind: 'COMPLETED',
    reason: 'Venta',
    operation_key: 'sale-operation',
    payload_hash: 'hash',
    created_at_utc: now,
    ...actor,
  });
  insert(db, 'purchase_items', {
    id: 'purchase-item',
    purchase_id: 'purchase',
    position: 0,
    line_id: 'line',
    product_id: 'product',
    sku: 'product',
    name: 'Producto con costo',
    unit: 'UNIT',
    quantity_base: 5,
    unit_cost_cents: 500,
    subtotal_cents: 2500,
    product_revision: 11,
  });
  insert(db, 'replenishment_orders', {
    id: 'order',
    number: 1,
    supplier_id: 'supplier',
    location_id: location,
    status: 'PARTIAL',
    expected_date: date,
    revision: 2,
    actor_user_id: 'owner',
    created_at_utc: now,
  });
  insert(db, 'replenishment_order_lines', {
    id: 'order-line',
    order_id: 'order',
    product_id: 'product',
    name: 'Producto',
    unit: 'UNIT',
    product_revision: 11,
    stock_revision: 1,
    ordered_base: 10,
    received_base: 5,
  });
  insert(db, 'replenishment_receipts', {
    line_id: 'order-line',
    purchase_item_id: 'purchase-item',
    quantity_base: 5,
  });
  insert(db, 'sale_returns', {
    id: 'return',
    number: 1,
    sale_id: 'sale',
    operation_key: 'return-operation',
    payload_hash: 'return-hash',
    input_json: '{}',
    status: 'CONFIRMED',
    reason: 'Devolución de prueba',
    total_cents: 1000,
    cost_cents: 400,
    ...actor,
    created_at_utc: now,
    business_date: date,
    local_month: '2026-10',
  });
  insert(db, 'sale_return_items', {
    id: 'return-item',
    return_id: 'return',
    sale_item_id: 'sale-item',
    product_id: 'product',
    quantity_base: 1,
    gross_cents: 1000,
    discount_cents: 0,
    net_cents: 1000,
    cost_cents: 400,
    disposition: 'RESTOCK',
  });
  insert(db, 'sale_return_events', {
    id: 'return-event',
    return_id: 'return',
    kind: 'CONFIRMED',
    reason: 'Devolución de prueba',
    ...actor,
    created_at_utc: now,
  });
  insert(db, 'register_movements', {
    id: 'refund-movement',
    shift_id: 'shift',
    kind: 'REFUND',
    amount_cents: 1000,
    reason: 'Devolución',
    actor_user_id: 'owner',
    created_at_utc: now,
    operation_key: 'refund-cash',
    payload_hash: 'hash',
    return_id: 'return',
  });
  insert(db, 'sale_return_refunds', {
    id: 'refund',
    return_id: 'return',
    method: 'CASH',
    amount_cents: 1000,
    register_shift_id: 'shift',
    register_movement_id: 'refund-movement',
  });
  for (const [table, id, partyColumn, party, direction] of [
    ['customer_collections', 'collection', 'customer_id', 'customer', 'IN'],
    ['supplier_payments', 'supplier-payment', 'supplier_id', 'supplier', 'OUT'],
  ]) {
    insert(db, table!, {
      id,
      operation_key: 'shared-account-operation',
      payload_hash: 'hash',
      [partyColumn!]: party,
      business_date: date,
      method: 'CASH',
      amount_cents: 500,
      note: 'Pago parcial',
      ...actor,
      shift_id: 'shift',
      register_movement_id: `${id}-movement`,
      created_at_utc: now,
    });
    insert(db, 'register_movements', {
      id: `${id}-movement`,
      shift_id: 'shift',
      kind: direction,
      amount_cents: 500,
      reason: 'Pago parcial',
      actor_user_id: 'owner',
      created_at_utc: now,
      operation_key: `${id}-cash`,
      payload_hash: 'hash',
      [direction === 'IN' ? 'customer_collection_id' : 'supplier_payment_id']: id,
    });
  }
  insert(db, 'customer_collection_allocations', {
    collection_id: 'collection',
    sale_id: 'sale',
    amount_cents: 500,
  });
  insert(db, 'supplier_payment_allocations', {
    payment_id: 'supplier-payment',
    purchase_id: 'purchase',
    amount_cents: 500,
  });
  insert(db, 'customer_credits', {
    id: 'customer-credit',
    customer_id: 'customer',
    sale_id: 'sale-paid',
    amount_cents: 100,
    reason: 'Crédito cliente',
    created_at_utc: now,
  });
  insert(db, 'supplier_credits', {
    id: 'supplier-credit',
    supplier_id: 'supplier',
    purchase_id: 'purchase-paid',
    amount_cents: 100,
    reason: 'Crédito proveedor',
    created_at_utc: now,
  });
  insert(db, 'inventory_lots', {
    id: 'lot',
    product_id: 'product',
    code: 'LOTE-PRUEBA',
    expires_on: '2026-12-31',
    status: 'ACTIVE',
    quantity_base: 4,
    revision: 1,
    created_at_utc: now,
    updated_at_utc: now,
  });
  insert(db, 'lot_operations', {
    operation_key: 'lot-operation',
    payload_hash: 'lot-hash',
    kind: 'ALLOCATION',
    result_json: '[]',
    created_at_utc: now,
  });
  insert(db, 'sale_item_lots', { sale_item_id: 'sale-item', lot_id: 'lot', quantity_base: 5 });
  insert(db, 'sale_return_item_lots', {
    return_item_id: 'return-item',
    lot_id: 'lot',
    quantity_base: 1,
  });
  insert(db, 'lot_movements', {
    id: 'lot-movement',
    lot_id: 'lot',
    delta_base: 1,
    balance_after_base: 4,
    kind: 'RETURN',
    reason: 'Reingreso',
    operation_key: 'lot-operation',
    return_item_id: 'return-item',
    ...actor,
    created_at_utc: now,
  });
  insert(db, 'stock_movements', {
    id: 'stock-movement',
    product_id: 'product',
    delta_base: 1,
    balance_after_base: 4,
    kind: 'ADJUSTMENT',
    reason: 'Reingreso',
    operation_key: 'stock-operation',
    payload_hash: 'hash',
    result_json: '{}',
    created_at_utc: now,
    business_date: date,
    return_id: 'return',
    return_item_id: 'return-item',
    location_id: location,
    ...actor,
  });
  insert(db, 'audit_events', {
    id: 'shared-history',
    operation: 'sale.complete',
    entity_id: 'sale',
    ...actor,
    created_at_utc: now,
  });
  insert(db, 'control_audit_details', {
    id: 'shared-history',
    entity_type: 'PRODUCT',
    entity_id: 'product',
    operation: 'product.edit',
    before_json: '{"revision":10}',
    after_json: '{"revision":11}',
    reason: 'Actualización',
    ...actor,
    created_at_utc: now,
  });
  insert(db, 'control_cash_review_history', {
    id: 'shared-history',
    shift_id: 'shift',
    revision: 9,
    note: 'Caja revisada',
    ...actor,
    created_at_utc: now,
  });
  for (const [kind, obligation] of [
    ['CUSTOMER', 'sale'],
    ['SUPPLIER', 'purchase'],
  ]) {
    insert(db, 'control_due_history', {
      id: kind === 'CUSTOMER' ? 'shared-history' : 'supplier-due',
      kind,
      obligation_id: obligation,
      previous_due_on: null,
      due_on: '2026-11-01',
      revision: 5,
      reason: 'Plazo pactado',
      ...actor,
      created_at_utc: now,
    });
  }
  insert(db, 'checkout_drafts', {
    id: 'owner',
    owner_user_id: 'owner',
    revision: 3,
    body_json: '{"lines":[1]}',
    updated_at_utc: now,
  });
  insert(db, 'checkout_drafts', {
    id: 'legacy-unowned',
    owner_user_id: null,
    revision: 1,
    body_json: '{}',
    updated_at_utc: now,
  });
  insert(db, 'purchase_drafts', {
    user_id: 'owner',
    terminal_id: 'terminal',
    revision: 4,
    body_json: '{"lines":[2]}',
    updated_at_utc: now,
  });
  insert(db, 'control_operation_results', {
    operation_key: 'lot-operation',
    payload_hash: 'control-hash',
    result_json: '{"control":true}',
    created_at_utc: now,
  });
  insert(db, 'price_change_previews', {
    id: 'preview',
    input_json: '{"percent":10}',
    result_json: '{"count":1}',
    expires_at_ms: 9999999999999,
  });
  insert(db, 'price_change_batches', {
    id: 'batch',
    operation_key: 'price-operation',
    payload_hash: 'price-hash',
    change_json: '{"percent":10}',
    item_count: 1,
    ...actor,
    created_at_utc: now,
  });
  insert(db, 'price_change_items', {
    batch_id: 'batch',
    product_id: 'product',
    product_name: 'Producto con costo',
    before_cents: 4500,
    after_cents: 5000,
    before_revision: 10,
    after_revision: 11,
  });
  expect(db.pragma('foreign_key_check')).toEqual([]);
  return db;
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

describe('simplificación desde v31 poblada', () => {
  it('conserva todas las columnas legacy de atributos, deudas, devoluciones, pagos e IDs', () => {
    const db = legacy();
    const before = Object.fromEntries(projections.map((name) => [name, rows(db, name)]));
    const stable = [
      'product_cost_events',
      'purchases',
      'sale_payments',
      'sale_events',
      'price_change_items',
      'purchase_items',
      'replenishment_order_lines',
      'register_movements',
      'stock_movements',
      'lot_movements',
    ];
    const stableBefore = Object.fromEntries(stable.map((name) => [name, rows(db, name)]));
    const sales = rows(db, 'sales') as Record<string, unknown>[];
    const saleItems = rows(db, 'sale_items') as Record<string, unknown>[];
    const audit = rows(db, 'audit_events');
    const prices = rows(db, 'price_change_batches');
    migrate(db);
    for (const name of projections) expect(rows(db, name), name).toEqual(before[name]);
    expect(rows(db, 'audit_actions')).toEqual(audit);
    expect(rows(db, 'price_change_applications')).toEqual(prices);
    for (const name of stable) {
      // purchase_items gains its receipt attributes in v32; all legacy fields survive.
      for (const old of stableBefore[name]! as Record<string, unknown>[]) {
        expect(rows(db, name)).toContainEqual(expect.objectContaining(old));
      }
    }
    for (const old of sales)
      expect(db.prepare('SELECT * FROM sales WHERE id=?').get(old.id)).toMatchObject(old);
    for (const old of saleItems)
      expect(db.prepare('SELECT * FROM sale_items WHERE id=?').get(old.id)).toMatchObject(old);
    expect(db.prepare('SELECT id FROM sale_orders ORDER BY id').all()).toEqual([
      { id: 'sale' },
      { id: 'sale-none' },
      { id: 'sale-paid' },
    ]);
    expect(
      db
        .prepare(
          'SELECT cost_method,lots_revision,replenishment_revision,revision FROM products WHERE id=?',
        )
        .get('unconfigured'),
    ).toEqual({
      cost_method: null,
      lots_revision: null,
      replenishment_revision: null,
      revision: 11,
    });
    expect(
      db.prepare('SELECT debt_status,debt_balance_cents FROM sales WHERE id=?').get('sale-none'),
    ).toEqual({ debt_status: null, debt_balance_cents: null });
    expect(
      db.prepare('SELECT debt_status,debt_balance_cents FROM sales WHERE id=?').get('sale-paid'),
    ).toEqual({ debt_status: 'PAID', debt_balance_cents: 0 });
    expect(db.prepare('SELECT id FROM parties ORDER BY id').all()).toEqual([
      { id: 'customer' },
      { id: 'supplier' },
    ]);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('integrity_check')).toEqual([{ integrity_check: 'ok' }]);
    const after = snapshot(db);
    migrate(db);
    expect(snapshot(db)).toEqual(after);
  });

  it.each([
    [31, 84],
    [32, 75],
    [33, 70],
    [34, 66],
  ])('v%i tiene %i tablas de aplicación, sin temporales', (version, count) => {
    const db = legacy();
    through(db, version);
    expect(tableNames(db)).toHaveLength(count);
    expect(tableNames(db).filter((name) => /_v\d+$/.test(name))).toEqual([]);
    expect(db.pragma('foreign_key_check')).toEqual([]);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
  });

  it('alcanza el contrato final de 60 tablas (requiere la migración 35)', () => {
    const db = legacy();
    migrate(db);
    expect(tableNames(db)).toHaveLength(60);
    expect(db.prepare('SELECT max(version) AS version FROM schema_migrations').get()).toEqual({
      version: SCHEMA_VERSION,
    });
  });

  it('no deja FK a vistas, tablas retiradas o nombres temporales y mantiene tablas STRICT', () => {
    const db = legacy();
    migrate(db);
    const tables = tableNames(db);
    for (const table of tables) {
      const fks = db.pragma(`foreign_key_list(${quote(table)})`) as { table: string }[];
      for (const fk of fks) expect(tables, `${table} -> ${fk.table}`).toContain(fk.table);
    }
    const metadata = db.pragma('table_list') as { name: string; strict: number }[];
    for (const table of [
      'sales',
      'sale_items',
      'sale_payments',
      'sale_events',
      'parties',
      'account_payments',
      'account_payment_allocations',
      'account_credits',
    ]) {
      expect(metadata.find((row) => row.name === table)?.strict, table).toBe(1);
    }
    expect(() => db.exec("UPDATE sales SET total_cents='invalid' WHERE id='sale'")).toThrow(
      /INTEGER/,
    );
    expect(() => db.exec("DELETE FROM users WHERE id='owner'")).toThrow(/FOREIGN KEY/);
    expect(() => db.exec("UPDATE stock_movements SET return_id='missing'")).toThrow(/FOREIGN KEY/);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it.each(projections)('la proyección %s es solo lectura', (name) => {
    const db = legacy();
    migrate(db);
    expect(db.prepare('SELECT type FROM sqlite_schema WHERE name=?').get(name)).toEqual({
      type: 'view',
    });
    expect(() => db.exec(`DELETE FROM ${quote(name)}`)).toThrow(/view/i);
  });
});

// Rename a legacy ID together with its real FK references to create a valid v31
// collision. No production migration SQL is patched or mocked.
function renameLegacyId(db: Database.Database, table: string, from: string, to: string) {
  db.pragma('foreign_keys=OFF');
  try {
    db.transaction(() => {
      for (const child of tableNames(db)) {
        const fks = db.pragma(`foreign_key_list(${quote(child)})`) as {
          table: string;
          from: string;
          to: string;
        }[];
        for (const fk of fks.filter((fk) => fk.table === table && fk.to === 'id')) {
          db.prepare(
            `UPDATE ${quote(child)} SET ${quote(fk.from)}=? WHERE ${quote(fk.from)}=?`,
          ).run(to, from);
        }
      }
      db.prepare(`UPDATE ${quote(table)} SET id=? WHERE id=?`).run(to, from);
    })();
  } finally {
    db.pragma('foreign_keys=ON');
  }
  expect(db.pragma('foreign_key_check')).toEqual([]);
}

describe('atomicidad, colisiones y reintentos', () => {
  it.each([
    ['sale_returns', 'return', 'sale'],
    ['sale_return_items', 'return-item', 'sale-item'],
    ['sale_return_refunds', 'refund', 'payment'],
    ['sale_return_events', 'return-event', 'sale-event'],
    ['suppliers', 'supplier', 'customer'],
    ['supplier_payments', 'supplier-payment', 'collection'],
    ['supplier_credits', 'supplier-credit', 'customer-credit'],
    ['price_change_previews', 'preview', 'batch'],
  ])('revierte todo v31 ante colisión en %s y permite reparar/reintentar', (table, from, to) => {
    const db = legacy();
    renameLegacyId(db, table, from, to);
    const before = snapshot(db);
    expect(() => migrate(db)).toThrow(/UNIQUE constraint failed/);
    expect(snapshot(db)).toEqual(before);
    expect(db.inTransaction).toBe(false);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.pragma('legacy_alter_table', { simple: true })).toBe(0);
    renameLegacyId(db, table, to, from);
    migrate(db);
    const after = snapshot(db);
    migrate(db);
    expect(snapshot(db)).toEqual(after);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it('detecta una FK pendiente antes de commit, revierte v32 y restaura FK ON tras fallar', () => {
    const db = legacy();
    const before = snapshot(db);
    expect(() =>
      migrate(db, [
        ...MIGRATIONS,
        {
          version: SCHEMA_VERSION + 1,
          sql: "UPDATE stock_movements SET return_id='missing-return';",
        },
      ]),
    ).toThrow(/referencias inválidas/);
    expect(snapshot(db)).toEqual(before);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    expect(db.inTransaction).toBe(false);
    expect(() => db.exec("UPDATE stock_movements SET return_id='missing-return'")).toThrow(
      /FOREIGN KEY/,
    );
    migrate(db);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it('rechaza reconstrucción dentro de una transacción ajena sin desactivar FK', () => {
    const db = legacy();
    const before = snapshot(db);
    db.transaction(() => {
      expect(() => migrate(db)).toThrow(/transacción propia/);
      expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    })();
    expect(snapshot(db)).toEqual(before);
  });
});

describe('reglas que las tablas consolidadas deben seguir protegiendo', () => {
  it.each([
    [
      'regla de reposición incompleta',
      "UPDATE products SET purchase_multiple_base=NULL WHERE id='product'",
    ],
    [
      'calendario incompleto',
      'UPDATE locations SET weekdays_json=NULL WHERE calendar_revision IS NOT NULL',
    ],
    [
      'revisión de caja sin autor',
      "UPDATE register_shifts SET review_actor_user_id=NULL WHERE id='shift'",
    ],
    ['deuda sin titular', "UPDATE sales SET debt_party_id=NULL WHERE id='sale'"],
    [
      'deuda sin importe original',
      "UPDATE purchases SET debt_original_cents=NULL WHERE id='purchase'",
    ],
    ['costo parcialmente borrado', "UPDATE products SET cost_method=NULL WHERE id='product'"],
    ['lotes parcialmente borrados', "UPDATE products SET lots_revision=NULL WHERE id='product'"],
  ])('el esquema actual rechaza %s (atributos v32)', (_name, sql) => {
    const db = legacy();
    migrate(db);
    expect(() => db.exec(sql)).toThrow();
  });

  it.each([
    ['devolución negativa', "UPDATE sales SET total_cents=-1 WHERE id='return'"],
    ['devolución fuera de rango', "UPDATE sales SET total_cents=10000000000 WHERE id='return'"],
    [
      'devolución de otra devolución',
      "UPDATE sales SET original_sale_id='return' WHERE id='return'",
    ],
    ['reintegro sobre una venta', "UPDATE sale_payments SET sale_id='sale-none' WHERE id='refund'"],
    [
      'pago sobre una devolución',
      "UPDATE sale_payments SET sale_id='return',position=1 WHERE id='payment'",
    ],
    [
      'evento de devolución sobre venta',
      "UPDATE sale_events SET sale_id='sale-none' WHERE id='return-event'",
    ],
    [
      'línea original de tipo RETURN',
      "UPDATE sale_items SET original_sale_item_id='return-item' WHERE id='return-item'",
    ],
    ['stock con devolución de tipo SALE', "UPDATE stock_movements SET return_id='sale'"],
    [
      'caja con devolución de tipo SALE',
      "UPDATE register_movements SET return_id='sale' WHERE id='refund-movement'",
    ],
  ])('el esquema actual rechaza %s (documentos v33)', (_name, sql) => {
    const db = legacy();
    migrate(db);
    expect(() => db.exec(sql)).toThrow();
  });

  it.each([
    [
      'venta a proveedor sin rol cliente',
      "UPDATE sales SET customer_id='supplier' WHERE id='sale'",
    ],
    [
      'compra a cliente sin rol proveedor',
      "UPDATE purchases SET supplier_id='customer' WHERE id='purchase'",
    ],
    [
      'pago saliente a cliente',
      "UPDATE account_payments SET party_id='customer' WHERE id='supplier-payment'",
    ],
    [
      'imputación saliente a venta',
      "UPDATE account_payment_allocations SET purchase_id=NULL,sale_id='sale' WHERE payment_id='supplier-payment'",
    ],
    [
      'imputación entrante a compra',
      "UPDATE account_payment_allocations SET sale_id=NULL,purchase_id='purchase' WHERE payment_id='collection'",
    ],
    [
      'caja cobro enlazada a pago saliente',
      "UPDATE register_movements SET customer_collection_id='supplier-payment' WHERE id='collection-movement'",
    ],
    [
      'nota de proveedor fuera del límite legacy',
      "UPDATE account_payments SET note='' WHERE id='supplier-payment'",
    ],
    [
      'imputación a documento sin deuda',
      "UPDATE account_payment_allocations SET sale_id='sale-none' WHERE payment_id='collection'",
    ],
    [
      'imputación a devolución',
      "UPDATE account_payment_allocations SET sale_id='return' WHERE payment_id='collection'",
    ],
  ])('el esquema actual rechaza %s (cuentas v34)', (_name, sql) => {
    const db = legacy();
    migrate(db);
    expect(() => db.exec(sql)).toThrow();
  });

  it('conserva exclusión de destinos y FK compuesta de tipo de línea', () => {
    const db = legacy();
    migrate(db);
    expect(() =>
      db.exec(
        "UPDATE account_payment_allocations SET purchase_id='purchase' WHERE payment_id='collection'",
      ),
    ).toThrow();
    expect(() =>
      db.exec("UPDATE account_payment_allocations SET sale_id=NULL WHERE payment_id='collection'"),
    ).toThrow();
    expect(() =>
      db.exec("UPDATE sale_items SET sale_id='sale-none' WHERE id='return-item'"),
    ).toThrow();
  });
});

it('otra sesión no reescribe el actor de un evento histórico de devolución', () => {
  const db = new Database(':memory:');
  databases.push(db);
  db.pragma('foreign_keys=ON');
  migrate(db);
  const auth = new AuthService(db);
  const app = new Application(db, auth);
  const password = 'Prueba-Perla-2026!';
  const owner = auth.bootstrap({ name: 'Primera dueña', username: 'primera', password });
  auth.saveUser(owner.sessionToken, {
    username: 'segunda',
    name: 'Segunda dueña',
    role: 'OWNER',
    active: true,
    password,
  });
  const second = auth.login({ username: 'segunda', password });
  const input = {
    sku: 'ACTOR',
    barcode: null,
    name: 'Producto para auditoría',
    category: null,
    saleUnit: 'UNIT',
    priceCents: 100,
    active: true,
    trackStock: false,
    minStockBase: 0,
  };
  const product = app.dispatch('products.save', input, owner.sessionToken) as Product;
  const sale = app.dispatch(
    'sales.complete',
    {
      checkoutKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 2,
          expectedProductRevision: product.revision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'DEBIT', amountCents: 200 }],
    },
    owner.sessionToken,
  ) as SaleDetail;
  const result = app.dispatch(
    'sales.return',
    {
      saleId: sale.id,
      operationKey: randomUUID(),
      reason: 'Cambio de opinión',
      refundMethod: 'DEBIT',
      items: [{ saleItemId: sale.items[0]!.id, quantityBase: 1, disposition: 'NONE' }],
    },
    owner.sessionToken,
  ) as SaleReturnDetail;
  const readEvent = () =>
    db.prepare('SELECT rowid,* FROM sale_events WHERE sale_id=?').get(result.id);
  const before = readEvent();
  expect(before).toMatchObject({
    kind: 'CONFIRMED',
    actor_user_id: owner.user.id,
    actor_name: owner.user.name,
  });
  // The latest physical row is RETURN and is absent from sale_order_events.
  const physical = db.prepare('SELECT max(rowid) AS n FROM sale_events').get() as { n: number };
  const projected = db.prepare('SELECT max(rowid) AS n FROM sale_order_events').get() as {
    n: number;
  };
  expect(physical.n).toBeGreaterThan(projected.n);
  app.dispatch(
    'products.save',
    { ...input, sku: 'SECOND', name: 'Segunda mutación' },
    second.sessionToken,
  );
  expect(readEvent()).toEqual(before);
  expect(
    db
      .prepare(
        "SELECT actor_user_id FROM audit_events WHERE event_type='ACTION' AND operation='products.save' ORDER BY rowid DESC LIMIT 1",
      )
      .get(),
  ).toEqual({ actor_user_id: second.user.id });
  expect(db.pragma('foreign_key_check')).toEqual([]);
});

describe('v35: ámbitos, historia y referencias de precios', () => {
  it('conserva IDs coincidentes entre tipos de auditoría, borradores y resultados', () => {
    const db = legacy();
    migrate(db);
    expect(
      db
        .prepare(
          "SELECT event_type FROM audit_events WHERE id='shared-history' ORDER BY event_type",
        )
        .all(),
    ).toEqual([
      { event_type: 'ACTION' },
      { event_type: 'CASH_REVIEW' },
      { event_type: 'DETAIL' },
      { event_type: 'DUE_DATE' },
    ]);
    expect(
      db
        .prepare(
          "SELECT document_type,revision,body_json FROM drafts WHERE id='owner' ORDER BY document_type",
        )
        .all(),
    ).toEqual([
      { document_type: 'PURCHASE', revision: 4, body_json: '{"lines":[2]}' },
      { document_type: 'SALE', revision: 3, body_json: '{"lines":[1]}' },
    ]);
    expect(db.prepare("SELECT owner_user_id FROM drafts WHERE id='legacy-unowned'").get()).toEqual({
      owner_user_id: null,
    });
    expect(
      db
        .prepare(
          "SELECT scope,payload_hash,result_json FROM operation_results WHERE operation_key='lot-operation' ORDER BY scope",
        )
        .all(),
    ).toEqual([
      { scope: 'CONTROL', payload_hash: 'control-hash', result_json: '{"control":true}' },
      { scope: 'LOTS', payload_hash: 'lot-hash', result_json: '[]' },
    ]);
    expect(() =>
      db.exec("DELETE FROM operation_results WHERE scope='LOTS' AND operation_key='lot-operation'"),
    ).toThrow(/FOREIGN KEY/);
    // A CONTROL result with the same key must not satisfy the LOTS composite FK.
    insert(db, 'operation_results', {
      scope: 'CONTROL',
      operation_key: 'control-only',
      payload_hash: 'hash',
      result_json: '{}',
      created_at_utc: now,
    });
    expect(() =>
      db.exec("UPDATE lot_movements SET operation_key='control-only' WHERE id='lot-movement'"),
    ).toThrow(/FOREIGN KEY/);
    db.exec(
      "DELETE FROM operation_results WHERE scope='CONTROL' AND operation_key='lot-operation'",
    );
    expect(
      db
        .prepare("SELECT operation_scope,operation_key FROM lot_movements WHERE id='lot-movement'")
        .get(),
    ).toEqual({ operation_scope: 'LOTS', operation_key: 'lot-operation' });
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it('preserva auditorías inmutables y FK reales de vencimientos', () => {
    const db = legacy();
    migrate(db);
    expect(
      db
        .prepare(
          "SELECT sale_id,purchase_id,obligation_kind FROM audit_events WHERE id='shared-history' AND event_type='DUE_DATE'",
        )
        .get(),
    ).toEqual({ sale_id: 'sale', purchase_id: null, obligation_kind: 'CUSTOMER' });
    expect(() =>
      db.exec("UPDATE audit_events SET reason='alterado' WHERE event_type='DETAIL'"),
    ).toThrow(/inmutable/);
    expect(() => db.exec("DELETE FROM audit_events WHERE event_type='CASH_REVIEW'")).toThrow(
      /inmutable/,
    );
    expect(() =>
      insert(db, 'audit_events', {
        id: 'invalid-due',
        event_type: 'DUE_DATE',
        operation: 'control.agendaDate',
        obligation_kind: 'CUSTOMER',
        sale_id: 'missing',
        revision: 1,
        reason: 'Plazo',
        ...actor,
        created_at_utc: now,
      }),
    ).toThrow(/FOREIGN KEY/);
    expect(() =>
      insert(db, 'audit_events', {
        id: 'invalid-due',
        event_type: 'DUE_DATE',
        operation: 'control.agendaDate',
        obligation_kind: 'CUSTOMER',
        purchase_id: 'purchase',
        revision: 1,
        reason: 'Plazo',
        ...actor,
        created_at_utc: now,
      }),
    ).toThrow(/CHECK/);
  });

  it('revierte el lote completo si un vencimiento legacy apunta a un documento inexistente', () => {
    const db = legacy();
    insert(db, 'control_due_history', {
      id: 'orphan-due',
      kind: 'CUSTOMER',
      obligation_id: 'missing',
      previous_due_on: null,
      due_on: date,
      revision: 1,
      reason: 'Legacy sin FK',
      ...actor,
      created_at_utc: now,
    });
    const before = snapshot(db);
    expect(() => migrate(db)).toThrow(/referencias inválidas/);
    expect(snapshot(db)).toEqual(before);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.exec("DELETE FROM control_due_history WHERE id='orphan-due'");
    migrate(db);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it('borrar un preview conserva todas las aplicaciones y sus artículos', () => {
    const db = legacy();
    migrate(db);
    db.exec("UPDATE price_change_batches SET source_preview_id='preview' WHERE id='batch'");
    insert(db, 'price_change_batches', {
      id: 'batch-2',
      record_type: 'APPLIED',
      operation_key: 'price-operation-2',
      payload_hash: 'hash',
      change_json: '{}',
      item_count: 1,
      ...actor,
      created_at_utc: now,
      source_preview_id: 'preview',
    });
    db.exec("DELETE FROM price_change_batches WHERE id='preview'");
    expect(
      db.prepare('SELECT id,source_preview_id FROM price_change_batches ORDER BY id').all(),
    ).toEqual([
      { id: 'batch', source_preview_id: null },
      { id: 'batch-2', source_preview_id: null },
    ]);
    expect(db.prepare('SELECT batch_id,product_id FROM price_change_items').all()).toEqual([
      { batch_id: 'batch', product_id: 'product' },
    ]);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it.each([
    [
      'aplicación como preview fuente',
      "UPDATE price_change_batches SET source_preview_id='batch' WHERE id='batch'",
    ],
    [
      'artículos asociados a PREVIEW',
      "UPDATE price_change_items SET batch_id='preview' WHERE batch_id='batch'",
    ],
    [
      'convertir PREVIEW referenciado a APPLIED',
      `UPDATE price_change_batches SET record_type='APPLIED',operation_key='converted-preview',payload_hash='hash',change_json='{}',item_count=1,actor_user_id='owner',actor_name='Owner',created_at_utc='${now}' WHERE id='preview'`,
    ],
  ])('rechaza %s', (_name, sql) => {
    const db = legacy();
    migrate(db);
    db.exec("UPDATE price_change_batches SET source_preview_id='preview' WHERE id='batch'");
    expect(() => db.exec(sql)).toThrow();
  });
});

describe('referencias históricas después de consolidar', () => {
  it.each([
    "UPDATE sale_items SET product_id='unconfigured' WHERE id='sale-item'",
    "UPDATE sale_items SET quantity_base=4 WHERE id='sale-item'",
    "UPDATE sales SET debt_party_id='other-customer' WHERE id='sale'",
    "UPDATE purchases SET debt_party_id='other-supplier' WHERE id='purchase'",
    "UPDATE account_credits SET party_id='supplier' WHERE id='customer-credit'",
    "UPDATE replenishment_orders SET supplier_id='customer' WHERE id='order'",
  ])('rechaza reescribir la identidad histórica: %s', (sql) => {
    const db = legacy();
    migrate(db);
    for (const [id, role] of [
      ['other-customer', 'is_customer'],
      ['other-supplier', 'is_supplier'],
    ])
      insert(db, 'parties', {
        id,
        name: 'Otra persona',
        search_name: 'otra persona',
        [role!]: 1,
        created_at_utc: now,
        updated_at_utc: now,
      });
    const before = snapshot(db);
    expect(() => db.exec(sql)).toThrow();
    expect(snapshot(db)).toEqual(before);
    expect(db.pragma('foreign_key_check')).toEqual([]);
  });

  it('una venta nueva tampoco puede insertar deuda de un proveedor', () => {
    const db = legacy();
    migrate(db);
    expect(() =>
      insert(db, 'sales', {
        id: 'wrong-debtor',
        number: 99,
        checkout_key: 'wrong-debtor',
        payload_hash: 'hash',
        status: 'COMPLETED',
        created_at_utc: now,
        business_date: date,
        local_month: '2026-10',
        subtotal_cents: 1000,
        discount_cents: 0,
        total_cents: 1000,
        discount_json: '{}',
        debt_party_id: 'supplier',
        debt_original_cents: 1000,
        debt_balance_cents: 1000,
        debt_status: 'OPEN',
        debt_created_at_utc: now,
        debt_updated_at_utc: now,
      }),
    ).toThrow(/cliente/);
    expect(db.prepare("SELECT id FROM sales WHERE id='wrong-debtor'").get()).toBeUndefined();
  });

  it('una compra nueva tampoco puede insertar deuda de un cliente', () => {
    const db = legacy();
    migrate(db);
    expect(() =>
      insert(db, 'purchases', {
        id: 'wrong-creditor',
        number: 99,
        receipt_key: 'wrong-creditor',
        payload_hash: 'hash',
        supplier_id: 'supplier',
        supplier_name: 'Proveedor',
        status: 'RECEIVED',
        received_at_utc: now,
        business_date: date,
        total_cents: 1000,
        stock_applied: 0,
        ...actor,
        debt_party_id: 'customer',
        debt_original_cents: 1000,
        debt_balance_cents: 1000,
        debt_status: 'OPEN',
        debt_created_at_utc: now,
        debt_updated_at_utc: now,
      }),
    ).toThrow(/proveedor/);
    expect(db.prepare("SELECT id FROM purchases WHERE id='wrong-creditor'").get()).toBeUndefined();
  });
});

describe('vistas y acceso por índices', () => {
  it.each([
    [
      'product_cost_states',
      "SELECT * FROM product_cost_states WHERE product_id='product'",
      /SEARCH products .*INDEX/,
    ],
    [
      'customer_receivables',
      "SELECT * FROM customer_receivables WHERE customer_id='customer' AND status='OPEN' ORDER BY created_at_utc,sale_id",
      /SEARCH sales USING INDEX sales_debt_party/,
    ],
    [
      'sale_return_items',
      "SELECT * FROM sale_return_items WHERE sale_item_id='sale-item'",
      /SEARCH sale_items USING INDEX sale_items_original/,
    ],
    [
      'sale_returns',
      "SELECT * FROM sale_returns WHERE sale_id='sale' ORDER BY number",
      /SEARCH sales USING INDEX sales_original/,
    ],
    [
      'supplier_payments',
      "SELECT * FROM supplier_payments WHERE supplier_id='supplier' ORDER BY business_date DESC,created_at_utc DESC,id",
      /SEARCH account_payments USING INDEX account_payments_party_date/,
    ],
    [
      'customers',
      "SELECT * FROM customers WHERE active=1 AND search_name>='mis' ORDER BY search_name,id",
      /SEARCH parties USING INDEX parties_customer_search/,
    ],
    [
      'supplier_payment_allocations',
      "SELECT * FROM supplier_payment_allocations WHERE purchase_id='purchase'",
      /SEARCH account_payment_allocations USING INDEX account_allocations_purchase/,
    ],
  ])('%s conserva búsqueda indexada sin ordenamiento temporal', (_name, sql, index) => {
    const db = legacy();
    migrate(db);
    const plan = (db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as { detail: string }[])
      .map((row) => row.detail)
      .join('\n');
    expect(plan).toMatch(index);
    expect(plan).not.toMatch(/USE TEMP B-TREE/);
    expect(db.prepare(sql).all()).not.toHaveLength(0);
  });
});
