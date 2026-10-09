import { performance } from 'node:perf_hooks';
import { expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { StockService } from '../../src/worker/stock/service';
import { PurchaseService } from '../../src/worker/purchases/service';

test('pagina compras grandes y busca en un catálogo de 4.000 productos sin cargar todo', () => {
  const db = openDatabase(':memory:');
  try {
    const auth = new AuthService(db);
    const owner = auth.bootstrap({
      name: 'Dueña',
      username: 'jefe',
      password: 'Prueba-Perla-2026!',
    }).user;
    const catalog = new CatalogRepository(db);
    const stock = new StockService(db, catalog);
    const purchases = new PurchaseService(db, catalog, stock, () => false);
    const now = new Date().toISOString();
    db.exec(`
      WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<4000)
      INSERT INTO products (
        id,sku,barcode,name,search_name,category,sale_unit,price_cents,active,
        track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc
      )
      SELECT 'perf-product-'||x,'PERF-'||x,'7788'||printf('%09d',x),
        'Producto de mar '||x,'producto de mar '||x,NULL,'UNIT',1000,1,0,0,0,1,
        '${now}','${now}' FROM n;
    `);
    const supplier = purchases.saveSupplier({ name: 'Proveedor de rendimiento' });
    db.exec(`
      WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<100000)
      INSERT INTO purchases (
        id,number,receipt_key,payload_hash,supplier_id,supplier_name,supplier_phone,status,
        received_at_utc,business_date,total_cents,stock_applied,actor_user_id,actor_name
      )
      SELECT 'perf-purchase-'||x,x,'perf-receipt-'||x,'hash','${supplier.id}',
        'Proveedor de rendimiento',NULL,'RECEIVED','2026-10-02T12:00:00.000Z',
        '2026-10-02',1000,0,'${owner.id}','Dueña' FROM n;
    `);

    let started = performance.now();
    const found = catalog.search({
      query: 'Producto de mar 3999',
      activeOnly: true,
      status: 'ACTIVE',
      limit: 20,
    });
    const searchMs = performance.now() - started;
    started = performance.now();
    const page = purchases.list({ status: 'ALL', limit: 50 });
    const pageMs = performance.now() - started;

    console.log(
      `Compras: catálogo 4.000 en ${searchMs.toFixed(2)}ms; primera página sobre 100.000 en ${pageMs.toFixed(2)}ms.`,
    );
    expect(found.items).toHaveLength(1);
    expect(page).toMatchObject({ total: 100000, items: { length: 50 } });
    expect(page.nextCursor).toBeTruthy();
  } finally {
    db.close();
  }
});
