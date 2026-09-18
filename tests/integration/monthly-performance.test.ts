import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { performance } from 'node:perf_hooks';
import { expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { CatalogRepository } from '../../src/worker/products/repository';
import { MonthlyReports } from '../../src/worker/reports/queries';
it('concilia reporte SQL con 2000 productos y 100000 ventas en DB temporal', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-report-load-'));
  const db = openDatabase(join(directory, 'bocha.sqlite'));
  try {
    const catalog = new CatalogRepository(db);
    db.transaction(() => {
      for (let i = 0; i < 2000; i++)
        catalog.save({
          sku: `P${String(i).padStart(4, '0')}`,
          barcode: null,
          name: `Producto ${i}`,
          category: null,
          saleUnit: 'UNIT',
          priceCents: 100,
          active: true,
          trackStock: false,
          minStockBase: 0,
        });
      db.exec(
        `WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<100000) INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) SELECT 'load-'||x,x,'key-'||x,'hash','COMPLETED','2024-02-01T12:00:00Z','2024-02-01','2024-02',100,0,100,'{"type":"NONE"}' FROM n`,
      );
      db.exec(
        `INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,barcode,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents) SELECT 'item-'||s.number,s.id,'line-'||s.number,0,p.id,p.sku,NULL,p.name,'UNIT',100,1,100,0,100 FROM sales s JOIN products p ON p.sku='P'||printf('%04d',s.number%2000)`,
      );
      db.exec(
        `INSERT INTO sale_payments(id,sale_id,position,method,amount_cents,tendered_cents,change_cents) SELECT 'payment-'||number,id,0,'DEBIT',100,NULL,0 FROM sales`,
      );
    })();
    const start = performance.now();
    const report = new MonthlyReports(db).month('2024-02', new Date('2024-03-01T12:00:00Z'));
    const elapsedMs = performance.now() - start;
    expect(report.totals).toMatchObject({ netCents: 10000000, saleCount: 100000 });
    expect(report.rankings.revenue).toHaveLength(2000);
    expect(report.rankings.revenue.reduce((sum, p) => sum + p.netCents, 0)).toBe(10000000);
    expect(report.cardCents).toBe(10000000);
    mkdirSync('tmp', { recursive: true });
    writeFileSync(
      'tmp/monthly-benchmark.json',
      JSON.stringify(
        {
          sales: 100000,
          products: 2000,
          elapsedMs,
          node: process.version,
          platform: process.platform,
          arch: process.arch,
          createdAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
}, 30000);
