import { afterEach, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import Database from 'better-sqlite3';
import { migrate, MIGRATIONS, SCHEMA_VERSION } from '../../src/worker/db/migrations';
import { openDatabase } from '../../src/worker/db/connection';
import {
  BackupService,
  recoverInterruptedRestore,
  recoverDatabaseFromBackup,
} from '../../src/server/backups/service';

const cleanups: (() => void)[] = [];
it('lists and verifies backups from an earlier supported schema', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-historical-backup-'));
  const databasePath = join(directory, 'db.sqlite');
  const db = new Database(databasePath);
  cleanups.push(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  migrate(db, MIGRATIONS.slice(0, -1));
  const options = {
    databasePath,
    backupDirectory: join(directory, 'backups'),
    key: randomBytes(32),
    appVersion: 'test',
    getDatabase: () => db,
    closeDatabase: () => db.close(),
    reopenDatabase: () => {
      throw new Error('unused');
    },
  };
  const service = new BackupService(options);
  const info = await service.create('DAILY');
  const restarted = new BackupService(options);
  expect(await restarted.list()).toEqual([info]);
  expect(restarted.download(info.id)).toEqual(service.download(info.id));
});
it.each([31, SCHEMA_VERSION])(
  'backup v%i acepta esquema con fin de línea de Windows para recuperarlo en Linux',
  async (version) => {
    const directory = mkdtempSync(join(tmpdir(), 'bocha-portable-')),
      databasePath = join(directory, 'db.sqlite'),
      db = new Database(databasePath);
    migrate(
      db,
      MIGRATIONS.filter((m) => m.version <= version).map((m) => ({
        ...m,
        sql: m.sql.replace(/\r?\n/g, '\r\n'),
      })),
    );
    const service = new BackupService({
      databasePath,
      backupDirectory: join(directory, 'backups'),
      key: randomBytes(32),
      appVersion: 'test',
      getDatabase: () => db,
      closeDatabase: () => db.close(),
      reopenDatabase: () => {
        throw new Error('unused');
      },
    });
    try {
      const info = await service.create();
      expect((await service.inspect(info.id)).info.id).toBe(info.id);
    } finally {
      db.close();
      rmSync(directory, { recursive: true, force: true });
    }
  },
);
afterEach(() => {
  vi.useRealTimers();
  for (const cleanup of cleanups.splice(0)) cleanup();
});
function fixture(version = SCHEMA_VERSION) {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-web-backup-'));
  const databasePath = join(directory, 'db.sqlite');
  let db = new Database(databasePath);
  db.pragma('foreign_keys=ON');
  db.pragma('journal_mode=WAL');
  migrate(
    db,
    MIGRATIONS.filter((m) => m.version <= version),
  );
  let failReopen = false;
  const key = randomBytes(32);
  const serviceOptions = {
    databasePath,
    backupDirectory: join(directory, 'backups'),
    key,
    appVersion: '0.1.0',
    getDatabase: () => db,
    closeDatabase: () => db.close(),
    reopenDatabase: () => {
      if (failReopen) {
        failReopen = false;
        throw new Error('simulated reopen failure');
      }
      db = openDatabase(databasePath);
    },
  };
  const service = new BackupService(serviceOptions);
  cleanups.push(() => {
    if (db.open) db.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return {
    service,
    restart: () => new BackupService(serviceOptions),
    directory,
    databasePath,
    key,
    db: () => db,
    fail: () => {
      failReopen = true;
    },
  };
}
function repack(buffer: Buffer, key: Buffer, change: (packed: Buffer) => Buffer): Buffer {
  const magic = buffer.subarray(0, 8);
  const decipher = createDecipheriv('aes-256-gcm', key, buffer.subarray(8, 20));
  decipher.setAAD(magic);
  decipher.setAuthTag(buffer.subarray(20, 36));
  const packed = Buffer.concat([decipher.update(buffer.subarray(36)), decipher.final()]);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(magic);
  const encrypted = Buffer.concat([cipher.update(change(packed)), cipher.final()]);
  return Buffer.concat([magic, iv, cipher.getAuthTag(), encrypted]);
}
it.each([31, 32, 33, 34])(
  'restores v%i backups online and offline through the current migrations',
  async (version) => {
    const f = fixture(31);
    f.db().exec(`
    INSERT INTO users(id,username,name,role,active,password_hash,revision,created_at_utc,updated_at_utc) VALUES('owner','owner','Owner','OWNER',1,'hash',1,'now','now');
    INSERT INTO auth_sessions(token_hash,user_id,user_revision,expires_at_ms) VALUES('old-session','owner',1,9999999999999);
    INSERT INTO auth_attempts VALUES('owner',1,0,0);
    INSERT INTO products(id,sku,name,search_name,sale_unit,price_cents,active,track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc) VALUES('product','SKU','Producto','producto','UNIT',5000,1,0,0,0,1,'now','now');
    INSERT INTO product_cost_states VALUES('product','REFERENCE',20000000,0,1,'now','owner','Owner');
    INSERT INTO lot_product_settings VALUES('product',1,1,1,'now','owner','Owner');
    INSERT INTO suppliers VALUES('supplier','Proveedor','proveedor',NULL,NULL,NULL,NULL,1,1,'now','now');
    INSERT INTO customers(id,name,search_name,active,credit_enabled,credit_limit_cents,revision,created_at_utc,updated_at_utc) VALUES('customer','Cliente','cliente',1,1,10000,1,'now','now');
    INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,customer_id,customer_name,on_account_cents) VALUES('sale',1,'checkout','hash','COMPLETED','now','2026-10-02','2026-10',5000,0,5000,'{}','customer','Cliente',5000);
    INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents) VALUES('item','sale','line',0,'product','SKU','Producto','UNIT',5000,1,5000,0,5000);
    INSERT INTO sale_returns VALUES('return',1,'sale','return-key','hash','{}','CONFIRMED','Devolución',1000,400,'owner','Owner','now','2026-10-02','2026-10');
    INSERT INTO sale_return_items VALUES('return-item','return','item','product',1,1000,0,1000,400,'RESTOCK');
    INSERT INTO sale_return_refunds VALUES('refund','return','DEBIT',1000,NULL,NULL);
    INSERT INTO sale_return_events VALUES('return-event','return','CONFIRMED','Devolución','owner','Owner','now');
    INSERT INTO inventory_lots VALUES('lot','product','LOTE','2026-12-31','ACTIVE',4,1,'now','now');
    INSERT INTO sale_item_lots VALUES('item','lot',1);
    INSERT INTO sale_return_item_lots VALUES('return-item','lot',1);
    INSERT INTO customer_receivables(sale_id,customer_id,original_cents,balance_cents,status,created_at_utc,updated_at_utc) VALUES('sale','customer',5000,4500,'OPEN','now','now');
    INSERT INTO customer_collections(id,operation_key,payload_hash,customer_id,business_date,method,amount_cents,actor_user_id,actor_name,created_at_utc) VALUES('collection','collection-key','hash','customer','2026-10-02','DEBIT',500,'owner','Owner','now');
    INSERT INTO customer_collection_allocations VALUES('collection','sale',500);
    INSERT INTO customer_credits VALUES('credit','customer','sale',100,'Ajuste','now');
    INSERT INTO audit_events VALUES('audit','sales.return','return','owner','Owner','now');
    INSERT INTO control_audit_details VALUES('audit','SALE','sale','sales.update','{}','{"total":5000}','Ajuste','owner','Owner','now');
    INSERT INTO control_due_history VALUES('due','CUSTOMER','sale',NULL,'2026-10-31',2,'Vencimiento','owner','Owner','now');
    INSERT INTO terminals VALUES('terminal','Terminal',1,1,'now','now');
    INSERT INTO register_shifts(id,terminal_id,status,opening_cash_cents,opened_by,opened_at_utc,open_key,open_hash) VALUES('shift','terminal','OPEN',0,'owner','now','shift-key','hash');
    INSERT INTO control_cash_review_history VALUES('review','shift',1,'Revisión','owner','Owner','now');
    INSERT INTO checkout_drafts(id,owner_user_id,revision,body_json,updated_at_utc) VALUES('cart','owner',1,'{"lines":[]}','now');
    INSERT INTO purchase_drafts VALUES('owner','terminal',1,'{"lines":[]}','now');
    INSERT INTO lot_operations VALUES('shared-key','lot-hash','RECONCILIATION','[]','now');
    INSERT INTO control_operation_results VALUES('shared-key','control-hash','{}','now');
    INSERT INTO price_change_previews VALUES('price-preview','{}','{}',9999999999999);
    INSERT INTO price_change_batches VALUES('price-batch','price-key','hash','{}',1,'owner','Owner','now');
  `);
    migrate(
      f.db(),
      MIGRATIONS.filter((m) => m.version <= version),
    );
    const info = await f.service.create();
    const bytes = f.service.download(info.id);
    expect(info.schemaVersion).toBe(version);
    expect(await f.service.list()).toEqual([info]);
    expect((await f.service.upload(bytes)).id).toBe(info.id);
    const assertRestored = (db: Database.Database) => {
      expect(db.prepare('SELECT MAX(version) AS version FROM schema_migrations').get()).toEqual({
        version: SCHEMA_VERSION,
      });
      expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
      expect(db.pragma('foreign_key_check')).toEqual([]);
      expect(db.prepare('SELECT COUNT(*) AS n FROM auth_sessions').get()).toEqual({ n: 0 });
      expect(db.prepare('SELECT COUNT(*) AS n FROM auth_attempts').get()).toEqual({ n: 0 });
      expect(
        db.prepare("SELECT cost_method,lots_enabled FROM products WHERE id='product'").get(),
      ).toEqual({ cost_method: 'REFERENCE', lots_enabled: 1 });
      expect(
        db.prepare("SELECT document_type,original_sale_id FROM sales WHERE id='return'").get(),
      ).toEqual({ document_type: 'RETURN', original_sale_id: 'sale' });
      expect(
        db.prepare("SELECT original_sale_item_id FROM sale_items WHERE id='return-item'").get(),
      ).toEqual({ original_sale_item_id: 'item' });
      expect(
        db.prepare("SELECT direction,amount_cents FROM sale_payments WHERE id='refund'").get(),
      ).toEqual({ direction: 'REFUND', amount_cents: 1000 });
      expect(db.prepare("SELECT kind FROM sale_events WHERE id='return-event'").get()).toEqual({
        kind: 'CONFIRMED',
      });
      expect(
        db
          .prepare("SELECT quantity_base FROM sale_item_lots WHERE sale_item_id='return-item'")
          .get(),
      ).toEqual({ quantity_base: 1 });
      expect(db.prepare("SELECT debt_balance_cents FROM sales WHERE id='sale'").get()).toEqual({
        debt_balance_cents: 4500,
      });
      expect(db.prepare("SELECT is_customer FROM parties WHERE id='customer'").get()).toEqual({
        is_customer: 1,
      });
      expect(db.prepare("SELECT is_supplier FROM parties WHERE id='supplier'").get()).toEqual({
        is_supplier: 1,
      });
      expect(
        db.prepare("SELECT direction,party_id FROM account_payments WHERE id='collection'").get(),
      ).toEqual({ direction: 'IN', party_id: 'customer' });
      expect(
        db.prepare('SELECT payment_id,sale_id,amount_cents FROM account_payment_allocations').all(),
      ).toEqual([{ payment_id: 'collection', sale_id: 'sale', amount_cents: 500 }]);
      expect(db.prepare('SELECT party_id,amount_cents FROM account_credits').all()).toEqual([
        { party_id: 'customer', amount_cents: 100 },
      ]);
      expect(db.prepare('SELECT operation,entity_id FROM audit_actions').all()).toEqual([
        { operation: 'sales.return', entity_id: 'return' },
      ]);
      expect(
        db.prepare('SELECT event_type,id FROM audit_events ORDER BY event_type').all(),
      ).toEqual([
        { event_type: 'ACTION', id: 'audit' },
        { event_type: 'CASH_REVIEW', id: 'review' },
        { event_type: 'DETAIL', id: 'audit' },
        { event_type: 'DUE_DATE', id: 'due' },
      ]);
      expect(
        db.prepare('SELECT document_type,id FROM drafts ORDER BY document_type').all(),
      ).toEqual([
        { document_type: 'PURCHASE', id: 'owner' },
        { document_type: 'SALE', id: 'cart' },
      ]);
      expect(
        db
          .prepare('SELECT scope,operation_key,payload_hash FROM operation_results ORDER BY scope')
          .all(),
      ).toEqual([
        { scope: 'CONTROL', operation_key: 'shared-key', payload_hash: 'control-hash' },
        { scope: 'LOTS', operation_key: 'shared-key', payload_hash: 'lot-hash' },
      ]);
      expect(
        db.prepare('SELECT id,record_type FROM price_change_batches ORDER BY id').all(),
      ).toEqual([
        { id: 'price-batch', record_type: 'APPLIED' },
        { id: 'price-preview', record_type: 'PREVIEW' },
      ]);
    };
    const offlinePath = join(f.directory, 'offline.sqlite');
    recoverDatabaseFromBackup({
      databasePath: offlinePath,
      backupDirectory: join(f.directory, 'backups'),
      key: f.key,
      appVersion: 'test',
      buffer: bytes,
    });
    // Read directly so the assertion cannot be satisfied by openDatabase migrating on read.
    const offline = new Database(offlinePath, { readonly: true });
    try {
      assertRestored(offline);
    } finally {
      offline.close();
    }
    f.db().exec("UPDATE business_settings SET business_name='changed'");
    const preview = await f.service.inspect(info.id);
    await f.service.restore(preview.previewToken);
    assertRestored(f.db());
    expect(f.db().prepare('SELECT business_name FROM business_settings').get()).toEqual({
      business_name: 'Perla Negra',
    });
  },
);

it.each(['missing', 'checksum', 'extra'])(
  'rejects an invalid old migration history: %s',
  async (kind) => {
    const f = fixture(31);
    if (kind === 'missing') f.db().exec('DELETE FROM schema_migrations WHERE version=12');
    if (kind === 'checksum')
      f.db().exec("UPDATE schema_migrations SET checksum='invalid' WHERE version=12");
    if (kind === 'extra') f.db().exec("INSERT INTO schema_migrations VALUES(0,'now','invalid')");
    await expect(f.service.create()).rejects.toThrow('El historial de migraciones no coincide.');
  },
);

it.each(['DETAIL', 'CASH_REVIEW', 'DUE_DATE'])(
  'invalidates previews on %s audit changes but permits ACTION and session bookkeeping',
  async (eventType) => {
    const f = fixture();
    f.db().exec(
      "INSERT INTO users(id,username,name,role,active,password_hash,revision,created_at_utc,updated_at_utc) VALUES('owner','owner','Owner','OWNER',1,'hash',1,'now','now')",
    );
    f.db().exec(`
    INSERT INTO terminals VALUES('terminal','Terminal',1,1,'now','now');
    INSERT INTO register_shifts(id,terminal_id,status,opening_cash_cents,opened_by,opened_at_utc,open_key,open_hash) VALUES('shift','terminal','OPEN',0,'owner','now','shift-key','hash');
    INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) VALUES('sale',1,'checkout','hash','COMPLETED','now','2026-10-02','2026-10',5000,0,5000,'{}');
  `);
    const info = await f.service.create();
    const preview = await f.service.inspect(info.id);
    f.db()
      .prepare(
        "INSERT INTO audit_events(id,event_type,operation,entity_type,entity_id,before_json,after_json,reason,shift_id,revision,note,obligation_kind,sale_id,actor_user_id,actor_name,created_at_utc) VALUES('audit',?,'sales.update','SALE','sale','{}','{}','Ajuste','shift',1,'Revisión','CUSTOMER','sale','owner','Owner','now')",
      )
      .run(eventType);
    await expect(f.service.restore(preview.previewToken)).rejects.toThrow('los datos cambiaron');
    const next = await f.service.inspect(info.id);
    f.db().exec(
      "INSERT INTO audit_events(id,operation,actor_user_id,actor_name,created_at_utc) VALUES('audit','backups.inspect','owner','Owner','now'); INSERT INTO auth_sessions(token_hash,user_id,user_revision,expires_at_ms) VALUES('session','owner',1,9999999999999); INSERT INTO auth_attempts VALUES('owner',1,0,0)",
    );
    await expect(f.service.restore(next.previewToken)).resolves.toEqual({
      restored: true,
      backupId: info.id,
    });
  },
);
it('rechecks cached backup listings when ciphertext is changed', async () => {
  const f = fixture();
  const info = await f.service.create();
  expect(await f.service.list()).toEqual([info]);
  const path = join(f.directory, 'backups', info.id + '.bochabackup');
  const original = readFileSync(path);
  const corrupt = Buffer.from(original);
  corrupt[corrupt.length - 1] = corrupt[corrupt.length - 1]! ^ 1;
  writeFileSync(path, corrupt);
  expect(await f.service.list()).toEqual([]);
  writeFileSync(path, original);
  expect(await f.service.list()).toEqual([info]);
});
it('rejects authenticated checksum mismatches and bounded decompression bombs', async () => {
  const f = fixture();
  const info = await f.service.create();
  const original = f.service.download(info.id);
  const corrupt = repack(original, f.key, (packed) => {
    const length = packed.readUInt32BE();
    const manifest = JSON.parse(packed.subarray(4, 4 + length).toString()) as { sha256: string };
    manifest.sha256 = '0'.repeat(64);
    const json = Buffer.from(JSON.stringify(manifest));
    const size = Buffer.alloc(4);
    size.writeUInt32BE(json.length);
    return Buffer.concat([size, json, packed.subarray(4 + length)]);
  });
  await expect(f.service.upload(corrupt)).rejects.toThrow();
  const bomb = repack(original, f.key, (packed) =>
    Buffer.concat([
      packed.subarray(0, 4 + packed.readUInt32BE()),
      deflateSync(Buffer.alloc(129 * 1024 * 1024)),
    ]),
  );
  await expect(f.service.upload(bomb)).rejects.toThrow();
});
it('exports authenticated ciphertext and restores a verified online snapshot, revoking sessions', async () => {
  const f = fixture();
  f.db().exec(
    "INSERT INTO users (id,username,name,role,active,password_hash,revision,created_at_utc,updated_at_utc,system_admin) VALUES('owner','owner','Owner','OWNER',1,'hash',1,'now','now',0); INSERT INTO auth_sessions(token_hash,user_id,user_revision,expires_at_ms) VALUES('session','owner',1,9999999999999); INSERT INTO auth_attempts VALUES('owner',1,0,0); INSERT INTO products(id,sku,name,search_name,sale_unit,price_cents,active,track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc) VALUES('product','SKU-COSTO','Producto con costo','producto con costo','UNIT',5000,1,0,0,0,1,'now','now'); UPDATE products SET cost_method='REFERENCE',cost_rate_micros_per_base=20000000,cost_covered_quantity_base=0,cost_revision=1,cost_effective_at_utc='now',cost_actor_user_id='owner',cost_actor_name='Owner' WHERE id='product'; INSERT INTO product_cost_events(id,product_id,kind,after_method,after_rate_micros_per_base,after_covered_quantity_base,after_revision,reason,actor_user_id,actor_name,created_at_utc) VALUES('cost-event','product','REFERENCE','REFERENCE',20000000,0,1,'Costo inicial','owner','Owner','now'); INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) VALUES('sale',1,'checkout','hash','COMPLETED','now','2026-10-02','2026-10',5000,0,5000,'{\"type\":\"NONE\",\"value\":0}'); INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_method,cost_rate_micros_per_base,cost_cents,cost_effective_at_utc,category_name) VALUES('sale-item','sale','line',0,'product','SKU-COSTO','Producto con costo','UNIT',5000,1,5000,0,5000,'REFERENCE',20000000,2000,'now','Almacén'); INSERT INTO parties(id,name,search_name,is_supplier,created_at_utc,updated_at_utc) VALUES('supplier','Proveedor de prueba','proveedor de prueba',1,'now','now'); INSERT INTO purchases(id,number,receipt_key,payload_hash,supplier_id,supplier_name,supplier_phone,status,received_at_utc,business_date,total_cents,stock_applied,actor_user_id,actor_name) VALUES('purchase',1,'receipt','hash','supplier','Proveedor de prueba',NULL,'RECEIVED','now','2026-10-02',2500,0,'owner','Owner'); INSERT INTO purchase_events VALUES('purchase-event','purchase','RECEIVED','Mercadería recibida','receipt','hash','{}','owner','Owner','now'); UPDATE business_features SET enabled=1 WHERE feature_key IN ('SUPPLIERS_PURCHASES','COSTS_MARGIN')",
  );
  f.db().exec(`
    INSERT INTO sales(id,number,original_sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,cost_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month,document_type)
      VALUES('return',1,'sale','return-operation','return-hash','{}','CONFIRMED','Devolución de prueba',1000,400,'owner','Owner','now','2026-10-02','2026-10','RETURN');
    INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_cents,document_type,original_sale_item_id,disposition)
      VALUES('return-item','return','sale-item',0,'product','SKU-COSTO','Producto con costo','UNIT',5000,1,1000,0,1000,400,'RETURN','sale-item','RESTOCK');
    INSERT INTO sale_payments(id,sale_id,position,method,amount_cents,change_cents,direction) VALUES('refund','return',0,'DEBIT',1000,0,'REFUND');
    INSERT INTO sale_events(id,sale_id,kind,reason,actor_user_id,actor_name,created_at_utc) VALUES('return-event','return','CONFIRMED','Devolución de prueba','owner','Owner','now');
    UPDATE products SET lots_enabled=1,lots_reconciled=1,lots_revision=1,lots_updated_at_utc='now',lots_actor_user_id='owner',lots_actor_name='Owner' WHERE id='product';
    INSERT INTO inventory_lots VALUES('lot','product','LOTE-PRUEBA','2026-12-31','ACTIVE',4,1,'now','now');
    INSERT INTO operation_results(scope,operation_key,payload_hash,kind,result_json,created_at_utc) VALUES('LOTS','lot-operation','lot-hash','RECONCILIATION','[]','now');
    INSERT INTO lot_movements(id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,actor_user_id,actor_name,created_at_utc) VALUES('lot-movement','lot',4,4,'ADJUSTMENT','Saldo inicial','lot-operation','owner','Owner','now');
    INSERT INTO sale_item_lots VALUES('sale-item','lot',1);
    INSERT INTO sale_item_lots VALUES('return-item','lot',1);
    INSERT INTO parties(id,name,search_name,is_customer,created_at_utc,updated_at_utc) VALUES('customer','Cliente','cliente',1,'now','now');
    UPDATE sales SET customer_id='customer',debt_party_id='customer',debt_original_cents=5000,debt_balance_cents=4500,debt_status='OPEN',debt_created_at_utc='now',debt_updated_at_utc='now' WHERE id='sale';
    UPDATE purchases SET debt_party_id='supplier',debt_original_cents=2500,debt_balance_cents=2200,debt_status='OPEN',debt_created_at_utc='now',debt_updated_at_utc='now' WHERE id='purchase';
    INSERT INTO account_payments(id,operation_key,payload_hash,party_id,business_date,method,amount_cents,actor_user_id,actor_name,created_at_utc,direction) VALUES
      ('collection','collection-key','hash','customer','2026-10-02','DEBIT',500,'owner','Owner','now','IN'),
      ('payment','payment-key','hash','supplier','2026-10-02','TRANSFER',300,'owner','Owner','now','OUT');
    INSERT INTO account_payment_allocations(payment_id,sale_id,amount_cents) VALUES('collection','sale',500);
    INSERT INTO account_payment_allocations(payment_id,purchase_id,amount_cents) VALUES('payment','purchase',300);
    INSERT INTO account_credits(id,party_id,sale_id,amount_cents,reason,created_at_utc) VALUES('customer-credit','customer','sale',100,'Ajuste cliente','now');
    INSERT INTO account_credits(id,party_id,purchase_id,amount_cents,reason,created_at_utc) VALUES('supplier-credit','supplier','purchase',100,'Ajuste proveedor','now');
    INSERT INTO audit_events(id,operation,entity_id,actor_user_id,actor_name,created_at_utc) VALUES('audit','sales.return','return','owner','Owner','now');
    INSERT INTO drafts(document_type,id,owner_user_id,revision,body_json,updated_at_utc) VALUES('SALE','owner','owner',1,'{"lines":[]}','now'),('PURCHASE','owner','owner',1,'{"lines":[]}','now');
    INSERT INTO operation_results(scope,operation_key,payload_hash,result_json,created_at_utc) VALUES('CONTROL','lot-operation','control-hash','{}','now');
    INSERT INTO price_change_batches(id,record_type,input_json,result_json,expires_at_ms) VALUES('price-preview','PREVIEW','{}','{}',9999999999999);
    INSERT INTO price_change_batches(id,operation_key,payload_hash,change_json,item_count,actor_user_id,actor_name,created_at_utc,source_preview_id) VALUES('price-batch','price-key','hash','{}',1,'owner','Owner','now','price-preview');
  `);
  const backup = await f.service.create();
  const bytes = f.service.download(backup.id);
  expect(bytes.includes(Buffer.from('SQLite format'))).toBe(false);
  expect(await f.service.list()).toEqual([backup]);
  expect((await f.service.upload(bytes)).sha256).toBe(backup.sha256);
  f.db().prepare("UPDATE business_settings SET business_name='changed'").run();
  const preview = await f.service.inspect(backup.id);
  expect(await f.service.restore(preview.previewToken)).toEqual({
    restored: true,
    backupId: backup.id,
  });
  expect(f.db().prepare('SELECT business_name FROM business_settings').get()).toEqual({
    business_name: 'Perla Negra',
  });
  expect(f.db().prepare('SELECT COUNT(*) AS n FROM auth_sessions').get()).toEqual({ n: 0 });
  expect(f.db().prepare('SELECT COUNT(*) AS n FROM auth_attempts').get()).toEqual({ n: 0 });
  expect(f.db().prepare('SELECT supplier_name,total_cents FROM purchases').get()).toEqual({
    supplier_name: 'Proveedor de prueba',
    total_cents: 2500,
  });
  expect(f.db().prepare('SELECT kind,actor_name FROM purchase_events').get()).toEqual({
    kind: 'RECEIVED',
    actor_name: 'Owner',
  });
  expect(
    f
      .db()
      .prepare(
        'SELECT method,rate_micros_per_base,revision FROM product_cost_states WHERE product_id=?',
      )
      .get('product'),
  ).toEqual({ method: 'REFERENCE', rate_micros_per_base: 20000000, revision: 1 });
  expect(
    f.db().prepare('SELECT kind,reason FROM product_cost_events WHERE product_id=?').get('product'),
  ).toEqual({ kind: 'REFERENCE', reason: 'Costo inicial' });
  expect(
    f
      .db()
      .prepare('SELECT document_type,original_sale_id,total_cents FROM sales WHERE id=?')
      .get('return'),
  ).toEqual({ document_type: 'RETURN', original_sale_id: 'sale', total_cents: 1000 });
  expect(
    f
      .db()
      .prepare('SELECT original_sale_item_id,disposition FROM sale_items WHERE id=?')
      .get('return-item'),
  ).toEqual({ original_sale_item_id: 'sale-item', disposition: 'RESTOCK' });
  expect(
    f.db().prepare('SELECT direction,amount_cents FROM sale_payments WHERE id=?').get('refund'),
  ).toEqual({ direction: 'REFUND', amount_cents: 1000 });
  expect(
    f.db().prepare('SELECT kind,reason FROM sale_events WHERE id=?').get('return-event'),
  ).toEqual({ kind: 'CONFIRMED', reason: 'Devolución de prueba' });
  expect(
    f
      .db()
      .prepare('SELECT sale_item_id,quantity_base FROM sale_item_lots ORDER BY sale_item_id')
      .all(),
  ).toEqual([
    { sale_item_id: 'return-item', quantity_base: 1 },
    { sale_item_id: 'sale-item', quantity_base: 1 },
  ]);
  expect(
    f.db().prepare('SELECT id,is_customer,is_supplier FROM parties ORDER BY id').all(),
  ).toEqual([
    { id: 'customer', is_customer: 1, is_supplier: 0 },
    { id: 'supplier', is_customer: 0, is_supplier: 1 },
  ]);
  expect(
    f
      .db()
      .prepare('SELECT direction,party_id,amount_cents FROM account_payments ORDER BY direction')
      .all(),
  ).toEqual([
    { direction: 'IN', party_id: 'customer', amount_cents: 500 },
    { direction: 'OUT', party_id: 'supplier', amount_cents: 300 },
  ]);
  expect(
    f
      .db()
      .prepare(
        'SELECT payment_id,sale_id,purchase_id,amount_cents FROM account_payment_allocations ORDER BY payment_id',
      )
      .all(),
  ).toEqual([
    { payment_id: 'collection', sale_id: 'sale', purchase_id: null, amount_cents: 500 },
    { payment_id: 'payment', sale_id: null, purchase_id: 'purchase', amount_cents: 300 },
  ]);
  expect(
    f.db().prepare('SELECT id,party_id,amount_cents FROM account_credits ORDER BY id').all(),
  ).toEqual([
    { id: 'customer-credit', party_id: 'customer', amount_cents: 100 },
    { id: 'supplier-credit', party_id: 'supplier', amount_cents: 100 },
  ]);
  expect(f.db().prepare("SELECT debt_balance_cents FROM sales WHERE id='sale'").get()).toEqual({
    debt_balance_cents: 4500,
  });
  expect(f.db().prepare('SELECT debt_balance_cents FROM purchases').get()).toEqual({
    debt_balance_cents: 2200,
  });
  expect(f.db().prepare('SELECT operation,entity_id FROM audit_events').all()).toEqual([
    { operation: 'sales.return', entity_id: 'return' },
  ]);
  expect(
    f.db().prepare('SELECT code,quantity_base FROM inventory_lots WHERE id=?').get('lot'),
  ).toEqual({
    code: 'LOTE-PRUEBA',
    quantity_base: 4,
  });
  expect(
    f
      .db()
      .prepare(
        'SELECT cost_method,cost_rate_micros_per_base,cost_cents,category_name FROM sale_items WHERE id=?',
      )
      .get('sale-item'),
  ).toEqual({
    cost_method: 'REFERENCE',
    cost_rate_micros_per_base: 20000000,
    cost_cents: 2000,
    category_name: 'Almacén',
  });
  expect(
    f
      .db()
      .prepare("SELECT enabled FROM business_features WHERE feature_key='SUPPLIERS_PURCHASES'")
      .get(),
  ).toEqual({ enabled: 1 });
  expect((await f.service.list()).some((b) => b.kind === 'PRE_RESTORE')).toBe(true);
  expect(
    f.db().prepare('SELECT document_type,id FROM drafts ORDER BY document_type').all(),
  ).toEqual([
    { document_type: 'PURCHASE', id: 'owner' },
    { document_type: 'SALE', id: 'owner' },
  ]);
  expect(
    f.db().prepare('SELECT scope,operation_key FROM operation_results ORDER BY scope').all(),
  ).toEqual([
    { scope: 'CONTROL', operation_key: 'lot-operation' },
    { scope: 'LOTS', operation_key: 'lot-operation' },
  ]);
  expect(
    f
      .db()
      .prepare('SELECT id,record_type,source_preview_id FROM price_change_batches ORDER BY id')
      .all(),
  ).toEqual([
    { id: 'price-batch', record_type: 'APPLIED', source_preview_id: 'price-preview' },
    { id: 'price-preview', record_type: 'PREVIEW', source_preview_id: null },
  ]);
  f.db().exec("DELETE FROM price_change_batches WHERE id='price-preview'");
  expect(
    f
      .db()
      .prepare("SELECT source_preview_id FROM price_change_batches WHERE id='price-batch'")
      .get(),
  ).toEqual({ source_preview_id: null });
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
});
it('rejects a backup encrypted with another key and a missing or future application schema', async () => {
  const first = fixture();
  const second = fixture();
  const info = await first.service.create();
  await expect(second.service.upload(first.service.download(info.id))).rejects.toThrow();
  first.db().exec('UPDATE schema_migrations SET version=99 WHERE version=6');
  await expect(first.service.create()).rejects.toThrow();
  second.db().exec('DROP TABLE business_settings');
  await expect(second.service.create()).rejects.toThrow();
});
it('rejects tampering, foreign keys, oversized imports and arbitrary paths', async () => {
  const f = fixture();
  const info = await f.service.create();
  const bytes = f.service.download(info.id);
  bytes[bytes.length - 1] = bytes[bytes.length - 1]! ^ 1;
  await expect(f.service.upload(bytes)).rejects.toThrow();
  await expect(f.service.upload(Buffer.alloc(128 * 1024 * 1024 + 1))).rejects.toThrow();
  expect(() => f.service.download('../db.sqlite')).toThrow();
  f.db().pragma('foreign_keys=OFF');
  f.db().exec(
    "INSERT INTO terminals VALUES('terminal','terminal',1,1,'now','now'); INSERT INTO register_shifts(id,terminal_id,status,opening_cash_cents,opened_by,opened_at_utc,open_key,open_hash) VALUES('shift','terminal','OPEN',0,'missing','now','key','hash')",
  );
  await expect(f.service.create()).rejects.toThrow();
});
it('invalidates preview after writes, expiry and ciphertext replacement', async () => {
  const f = fixture();
  const info = await f.service.create();
  let preview = await f.service.inspect(info.id);
  f.db().exec("UPDATE business_settings SET business_name='write'");
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
  preview = await f.service.inspect(info.id);
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 300001);
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
  vi.useRealTimers();
  preview = await f.service.inspect(info.id);
  writeFileSync(join(f.directory, 'backups', info.id + '.bochabackup'), Buffer.from('bad'));
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
});
it('blocks all nonempty carts and rolls back a failed reopen', async () => {
  const f = fixture();
  const info = await f.service.create();
  f.db().exec(
    "INSERT INTO drafts(document_type,id,revision,body_json,updated_at_utc) VALUES('SALE','main',1,'{\"lines\":[{}]}','now')",
  );
  const preview = await f.service.inspect(info.id);
  await expect(f.service.restore(preview.previewToken)).rejects.toThrow();
  f.db().exec("DELETE FROM drafts; UPDATE business_settings SET business_name='preserved'");
  const next = await f.service.inspect(info.id);
  f.fail();
  await expect(f.service.restore(next.previewToken)).rejects.toThrow('simulated');
  expect(f.db().prepare('SELECT business_name FROM business_settings').get()).toEqual({
    business_name: 'preserved',
  });
});
it('recovers an interrupted atomic swap to the prior database', async () => {
  const f = fixture();
  f.db().pragma('wal_checkpoint(TRUNCATE)');
  f.db().close();
  const previous = f.databasePath + '.restore-previous';
  writeFileSync(previous, readFileSync(f.databasePath));
  writeFileSync(f.databasePath, 'interrupted');
  writeFileSync(
    f.databasePath + '.restore-journal',
    JSON.stringify({ version: 1, phase: 'swapping' }),
  );
  recoverInterruptedRestore(f.databasePath);
  expect(readFileSync(f.databasePath).subarray(0, 15).toString()).toBe('SQLite format 3');
  expect(existsSync(f.databasePath + '.restore-journal')).toBe(false);
});
it('cleans abandoned plaintext recovery files before opening the database', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-orphan-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'db.sqlite');
  writeFileSync(path + '.restore-candidate', 'abandoned');
  writeFileSync(path + '.restore-previous', 'abandoned');
  recoverInterruptedRestore(path);
  expect(existsSync(path + '.restore-candidate')).toBe(false);
  expect(existsSync(path + '.restore-previous')).toBe(false);
});
it('schedules once per local Saturday across calls, concurrent checks, restarts and weeks', async () => {
  const f = fixture();
  vi.useFakeTimers({ toFake: ['Date'] });
  // UTC Saturday is still Friday in Buenos Aires until 03:00 UTC.
  vi.setSystemTime(new Date('2026-10-17T02:59:59Z'));
  expect(await f.service.ensureScheduled()).toBeUndefined();
  expect(await f.service.list()).toEqual([]);
  vi.setSystemTime(new Date('2026-10-17T03:00:00Z'));
  const [first, second] = await Promise.all([
    f.service.ensureScheduled(),
    f.service.ensureScheduled(),
  ]);
  expect(first).toMatchObject({ kind: 'DAILY', schedule: 'WEEKLY_SATURDAY' });
  expect(second?.id).toBe(first?.id);
  const restarted = f.restart();
  expect((await restarted.ensureScheduled())?.id).toBe(first?.id);
  // UTC Sunday is still the same local Saturday.
  vi.setSystemTime(new Date('2026-10-18T02:59:59Z'));
  expect((await restarted.ensureScheduled())?.id).toBe(first?.id);
  vi.setSystemTime(new Date('2026-10-18T03:00:00Z'));
  expect(await restarted.ensureScheduled()).toBeUndefined();
  vi.setSystemTime(new Date('2026-10-24T03:00:00Z'));
  const next = await restarted.ensureScheduled();
  expect(next?.id).not.toBe(first?.id);
  expect(await f.service.list()).toHaveLength(2);
});
it('uses the configured timezone and does not catch up on weekdays', async () => {
  const f = fixture();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T01:00:00Z'));
  expect(await f.service.ensureScheduled()).toBeUndefined();
  expect(
    await f.service.ensureScheduled({ enabled: true, retention: 2, timezone: 'UTC' }),
  ).toMatchObject({ schedule: 'WEEKLY_SATURDAY' });
  vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
  expect(await f.service.ensureScheduled()).toBeUndefined();
  expect(await f.service.list()).toHaveLength(1);
});
it('does not create, enumerate or delete backups when automatic backups are disabled', async () => {
  const f = fixture();
  await f.service.create('DAILY', 'WEEKLY_SATURDAY');
  await f.service.create('DAILY', 'WEEKLY_SATURDAY');
  const before = await f.service.list();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
  const create = vi.spyOn(f.service, 'create');
  const list = vi.spyOn(f.service, 'list');
  const disabled = { enabled: false, retention: 1, timezone: 'America/Argentina/Buenos_Aires' };
  expect(await f.service.ensureScheduled(disabled)).toBeUndefined();
  expect(await f.restart().ensureScheduled(disabled)).toBeUndefined();
  expect(create).not.toHaveBeenCalled();
  expect(list).not.toHaveBeenCalled();
  expect(await f.service.list()).toEqual(before);
});
it('retains two weekly copies by default and prunes only this scheduler copies with configurable retention', async () => {
  const f = fixture();
  const manual = await f.service.create();
  const beforeRestore = await f.service.create('PRE_RESTORE');
  const legacyDaily = await f.service.create('DAILY');
  const foreign = fixture();
  const foreignInfo = await foreign.service.create('DAILY', 'WEEKLY_SATURDAY');
  const foreignPath = join(f.directory, 'backups', foreignInfo.id + '.bochabackup');
  const foreignBytes = foreign.service.download(foreignInfo.id);
  writeFileSync(foreignPath, foreignBytes);
  const migrationPath = join(f.directory, 'backups', 'before-v35.sqlite');
  writeFileSync(migrationPath, 'preserved migration backup');
  vi.useFakeTimers({ toFake: ['Date'] });
  const ids: string[] = [];
  for (const day of [3, 10, 17, 24]) {
    vi.setSystemTime(new Date(`2026-10-${String(day).padStart(2, '0')}T12:00:00Z`));
    ids.push((await f.service.ensureScheduled())!.id);
  }
  expect(
    (await f.service.list()).filter((b) => b.schedule === 'WEEKLY_SATURDAY').map((b) => b.id),
  ).toEqual(ids.slice(-2).reverse());
  expect(existsSync(join(f.directory, 'backups', ids[0] + '.bochabackup'))).toBe(false);
  await f
    .restart()
    .ensureScheduled({ enabled: true, retention: 1, timezone: 'America/Argentina/Buenos_Aires' });
  expect(
    (await f.service.list()).filter((b) => b.schedule === 'WEEKLY_SATURDAY').map((b) => b.id),
  ).toEqual(ids.slice(-1));
  for (const info of [manual, beforeRestore, legacyDaily])
    expect(f.service.download(info.id).length).toBeGreaterThan(0);
  expect(readFileSync(foreignPath)).toEqual(foreignBytes);
  expect(readFileSync(migrationPath, 'utf8')).toBe('preserved migration backup');
}, 30000);
it('recovers corrupt and missing databases offline and preserves the corrupt original', async () => {
  const f = fixture();
  const backup = await f.service.create();
  const buffer = f.service.download(backup.id);
  f.db().close();
  writeFileSync(f.databasePath, 'original corruption');
  const options = {
    databasePath: f.databasePath,
    backupDirectory: join(f.directory, 'backups'),
    key: f.key,
    appVersion: '0.1.0',
    buffer,
  };
  expect(recoverDatabaseFromBackup(options).restored).toBe(true);
  expect(readFileSync(f.databasePath + '.offline-original', 'utf8')).toBe('original corruption');
  const recovered = openDatabase(f.databasePath);
  expect(recovered.pragma('integrity_check', { simple: true })).toBe('ok');
  recovered.close();
  const missing = join(f.directory, 'missing.sqlite');
  expect(recoverDatabaseFromBackup({ ...options, databasePath: missing }).restored).toBe(true);
  expect(existsSync(missing + '.offline-original')).toBe(false);
});
it('rolls back an interrupted offline recovery without validating the corrupt original', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-offline-cut-'));
  cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'db.sqlite');
  writeFileSync(path, 'partially installed');
  writeFileSync(path + '.offline-original', 'corrupt preserved');
  writeFileSync(
    path + '.offline-journal',
    JSON.stringify({ version: 1, phase: 'swapping', hadOriginal: true }),
  );
  recoverInterruptedRestore(path);
  expect(readFileSync(path, 'utf8')).toBe('corrupt preserved');
  expect(readFileSync(path + '.offline-original', 'utf8')).toBe('corrupt preserved');
});
