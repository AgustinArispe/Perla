import Database from 'better-sqlite3';
import { describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import { CommercialControlService } from '../../src/worker/control/commercial';

describe('índices de consultas', () => {
  it('actualiza v29 sin cambiar artículos, usuarios, historial ni alertas comerciales', () => {
    const db = new Database(':memory:');
    try {
      db.pragma('foreign_keys=ON');
      migrate(
        db,
        MIGRATIONS.filter((migration) => migration.version <= 29),
      );
      const actor = new AuthService(db).bootstrap({
        name: 'Dueña',
        username: 'jefe',
        password: 'Prueba-Perla-2026!',
      }).user;
      db.prepare('UPDATE business_features SET enabled=1').run();
      const catalog = new CatalogRepository(db);
      const product = catalog.save({
        sku: 'P1',
        barcode: null,
        name: 'Merluza',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 10000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      });
      // Version order and timestamp order deliberately differ: both MAX lookups
      // must retain their original semantics with their respective indexes.
      const insert = db.prepare(`INSERT INTO commercial_price_events
        (product_id,before_cents,after_cents,created_at_utc) VALUES (?,9000,10000,?)`);
      insert.run(product.id, '2025-02-01T12:00:00Z');
      insert.run(product.id, '2025-01-01T12:00:00Z');
      const commercial = new CommercialControlService(db);
      const before = commercial.execute('prices', { limit: 3 }, actor);
      const tables = ['products', 'users', 'commercial_price_events', 'sales', 'sale_returns'];
      const snapshot = () => tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all());
      const rows = snapshot();
      migrate(db);
      migrate(db); // Idempotent on subsequent starts.
      expect(snapshot()).toEqual(rows);
      expect(commercial.execute('prices', { limit: 3 }, actor)).toEqual(before);
      expect(before).toMatchObject({
        total: 1,
        items: [
          { productId: product.id, priceVersion: 2, lastPriceChange: '2025-02-01T12:00:00Z' },
        ],
      });
      expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
      expect(db.pragma('foreign_key_check')).toEqual([]);
    } finally {
      db.close();
    }
  });

  it('resuelve historial y fechas mediante índices sin recorrer las tablas completas', () => {
    const db = new Database(':memory:');
    try {
      migrate(db);
      const cases: [string, unknown[], string][] = [
        [
          'SELECT MAX(id) FROM commercial_price_events WHERE product_id=?',
          ['product'],
          'commercial_events_product_version',
        ],
        [
          'SELECT MAX(created_at_utc) FROM commercial_price_events WHERE product_id=?',
          ['product'],
          'commercial_events_product_time',
        ],
        [
          "SELECT MAX(business_date) FROM sales WHERE status='COMPLETED'",
          [],
          'sales_status_business_date',
        ],
        [
          "SELECT id FROM sale_returns WHERE status='CONFIRMED' AND business_date BETWEEN ? AND ?",
          ['2026-01-01', '2026-01-31'],
          'returns_status_business_date',
        ],
      ];
      for (const [sql, parameters, index] of cases) {
        const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...parameters) as {
          detail: string;
        }[];
        expect(plan.some(({ detail }) => detail.includes('SEARCH') && detail.includes(index))).toBe(
          true,
        );
        expect(plan.some(({ detail }) => detail.startsWith('SCAN'))).toBe(false);
      }
    } finally {
      db.close();
    }
  });
});
