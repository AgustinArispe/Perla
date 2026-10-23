import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';

// An isolated synthetic fixture; never opens the application's active database.
await mkdir(resolve('.data/query-benchmarks'), { recursive: true });
const directory = await mkdtemp(resolve('.data/query-benchmarks/run-'));
const bundle = join(directory, 'runtime.cjs');
await build({
  stdin: {
    contents: `export { openDatabase } from './src/worker/db/connection';
      export { AuthService } from './src/worker/auth/service';
      export { CatalogRepository } from './src/worker/products/repository';
      export { WorkspaceControlService } from './src/worker/control/workspace';
      export { CommercialControlService } from './src/worker/control/commercial';
      export { MonthlyReports } from './src/worker/reports/queries';`,
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
      name: 'sql',
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
const {
  openDatabase,
  AuthService,
  CatalogRepository,
  WorkspaceControlService,
  CommercialControlService,
  MonthlyReports,
} = createRequire(import.meta.url)(bundle);
const db = openDatabase(join(directory, 'fixture.sqlite'));
try {
  // Baseline mode removes only the new indexes from this disposable fixture.
  const baseline = process.argv.includes('--baseline');
  if (baseline)
    db.exec(`DROP INDEX commercial_events_product_version;
    DROP INDEX commercial_events_product_time;
    DROP INDEX sales_status_business_date;
    DROP INDEX IF EXISTS returns_status_business_date;`);
  const auth = new AuthService(db);
  const actor = auth.bootstrap({
    username: 'benchmark',
    name: 'Benchmark',
    password: 'Benchmark-Only-2026!',
  }).user;
  const catalog = new CatalogRepository(db);
  db.transaction(() => {
    for (let i = 0; i < 4004; i++)
      catalog.save({
        sku: `BENCH-${String(i).padStart(4, '0')}`,
        barcode: null,
        name: `Artículo ${String(i).padStart(4, '0')}`,
        saleUnit: 'UNIT',
        priceCents: 10000,
        category: null,
        active: true,
        trackStock: true,
        minStockBase: 5,
      });
    db.exec(`UPDATE products SET stock_initialized=1,created_at_utc='2025-01-01T12:00:00Z';
      UPDATE business_features SET enabled=1;
      INSERT INTO inventory_balances(product_id,quantity_base,revision) SELECT id,3,1 FROM products;
      INSERT INTO location_inventory_balances(location_id,product_id,quantity_base,revision) SELECT l.id,p.id,3,1 FROM products p CROSS JOIN locations l;
      WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<24000)
      INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json)
      SELECT 'sale-'||x,x,'key-'||x,'hash','COMPLETED',strftime('%Y-%m-%dT12:00:00Z','now','-3 hours','-'||(x%120)||' days'),date('now','-3 hours','-'||(x%120)||' days'),strftime('%Y-%m','now','-3 hours','-'||(x%120)||' days'),40000,0,40000,'{"type":"NONE"}' FROM n;
      INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_cents)
      SELECT s.id||'-'||positions.n,s.id,s.id||'-'||positions.n,positions.n,p.id,p.sku,p.name,'UNIT',10000,1,10000,0,10000,5000
      FROM sales s CROSS JOIN (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3) positions
      JOIN products p ON p.sku='BENCH-'||printf('%04d',(s.number*4+positions.n)%4004);
      INSERT INTO sale_payments(id,sale_id,position,method,amount_cents,tendered_cents,change_cents)
      SELECT id,id,0,'DEBIT',40000,NULL,0 FROM sales;
      INSERT INTO commercial_price_events(product_id,before_cents,after_cents,created_at_utc)
      SELECT id,9000,10000,'2025-01-01T12:00:00Z' FROM products;
      INSERT INTO commercial_price_events(product_id,before_cents,after_cents,created_at_utc)
      SELECT id,9000,10000,'2025-01-02T12:00:00Z' FROM products;`);
  })();
  const month = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' })
    .format(new Date())
    .slice(0, 7);
  const workspace = new WorkspaceControlService(db);
  const commercial = new CommercialControlService(db);
  const reports = new MonthlyReports(db);
  const homeBeforeSummaryOptimization = () => {
    const priceSummary = CommercialControlService.prototype.priceSummary;
    const currentTotals = MonthlyReports.prototype.currentTotals;
    try {
      // Reproduce v30's extra work on the very same fixture and indexes.
      CommercialControlService.prototype.priceSummary = function (user) {
        return this.execute('prices', { limit: 3 }, user);
      };
      MonthlyReports.prototype.currentTotals = function (input, now) {
        return this.compare(input, now).current;
      };
      return workspace.execute('home', {}, actor);
    } finally {
      CommercialControlService.prototype.priceSummary = priceSummary;
      MonthlyReports.prototype.currentTotals = currentTotals;
    }
  };
  const priorHome = homeBeforeSummaryOptimization();
  const optimizedHome = workspace.execute('home', {}, actor);
  assert.deepEqual({ ...optimizedHome, generatedAt: null }, { ...priorHome, generatedAt: null });
  const fullPrices = commercial.execute('prices', { limit: 3 }, actor);
  assert.deepEqual(commercial.priceSummary(actor), {
    total: fullPrices.total,
    items: fullPrices.items.map(({ productId, name }) => ({ productId, name })),
  });
  const operations = {
    catalog: () => catalog.search({ query: '', status: 'ACTIVE', activeOnly: false, limit: 50 }),
    catalogSearch: () =>
      catalog.search({ query: 'NO-EXISTE', status: 'ACTIVE', activeOnly: false, limit: 50 }),
    homeBeforeSummaryOptimization,
    home: () => workspace.execute('home', {}, actor),
    prices: () => commercial.execute('prices', { limit: 3 }, actor),
    monthly: () => reports.month(month),
  };
  const results = {};
  for (const [name, operation] of Object.entries(operations)) {
    const samples = [];
    let value;
    for (let i = 0; i < 5; i++) {
      const start = performance.now();
      value = operation();
      samples.push(performance.now() - start);
    }
    if (name === 'catalog') assert.equal(value.total, 4004);
    if (name === 'catalogSearch') assert.equal(value.total, 0);
    if (name === 'prices') assert.equal(value.total, 4004);
    results[name] = {
      samplesMs: samples.map((n) => +n.toFixed(2)),
      medianMs: +[...samples].sort((a, b) => a - b)[2].toFixed(2),
      maxMs: +Math.max(...samples).toFixed(2),
    };
    console.log(name, JSON.stringify(results[name]));
  }
  const plan = db
    .prepare(
      'EXPLAIN QUERY PLAN SELECT MAX(created_at_utc) FROM commercial_price_events WHERE product_id=?',
    )
    .all('test');
  const output = {
    baseline,
    products: 4004,
    sales: 24000,
    saleItems: 96000,
    priceEvents: 8008,
    node: process.version,
    results,
    plan,
  };
  await writeFile(join(directory, 'results.json'), JSON.stringify(output, null, 2));
  console.log('Results:', join(directory, 'results.json'));
} finally {
  db.close();
}
