import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { hashPassword } from '../../src/worker/auth/password';
import { CatalogRepository } from '../../src/worker/products/repository';

describe('índices de consultas', () => {
  it('actualiza v29 a v30 sin cambiar artículos, usuarios, historial ni revisiones comerciales', () => {
    const db = new Database(':memory:');
    try {
      db.pragma('foreign_keys=ON');
      migrate(
        db,
        MIGRATIONS.filter((migration) => migration.version <= 29),
      );
      // Seed the historical schema without invoking current auth or commercial services.
      db.prepare(
        `INSERT INTO users(id,username,name,role,active,password_hash,revision,created_at_utc,updated_at_utc)
         VALUES (?,'jefe','Dueña','OWNER',1,?,1,?,?)`,
      ).run(randomUUID(), hashPassword('Prueba-Perla-2026!'), '2025-01-01', '2025-01-01');
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
      const history = () => {
        const items = db
          .prepare(
            `SELECT p.id AS productId,
          (SELECT COALESCE(MAX(e.id),0) FROM commercial_price_events e WHERE e.product_id=p.id) AS priceVersion,
          (SELECT MAX(e.created_at_utc) FROM commercial_price_events e WHERE e.product_id=p.id) AS lastPriceChange
          FROM products p WHERE p.active=1 ORDER BY p.id`,
          )
          .all();
        return { total: items.length, items };
      };
      const before = history();
      const tables = [
        'products',
        'users',
        'commercial_price_events',
        'commercial_price_reviews',
        'sales',
        'sale_returns',
      ];
      const snapshot = () => tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all());
      const rows = snapshot();
      const version30 = MIGRATIONS.filter((migration) => migration.version <= 30);
      migrate(db, version30);
      migrate(db, version30); // Idempotent on subsequent starts.
      expect(snapshot()).toEqual(rows);
      expect(history()).toEqual(before);
      expect(before).toMatchObject({
        total: 1,
        items: [
          { productId: product.id, priceVersion: 2, lastPriceChange: '2025-02-01T12:00:00Z' },
        ],
      });
      expect(db.prepare('SELECT MAX(version) version FROM schema_migrations').get()).toEqual({
        version: 30,
      });
      const legacyCases: [string, string, string][] = [
        [
          'SELECT MAX(id) FROM commercial_price_events WHERE product_id=?',
          product.id,
          'commercial_events_product_version',
        ],
        [
          'SELECT MAX(created_at_utc) FROM commercial_price_events WHERE product_id=?',
          product.id,
          'commercial_events_product_time',
        ],
        [
          'SELECT MAX(business_date) FROM sales WHERE status=?',
          'COMPLETED',
          'sales_status_business_date',
        ],
        [
          'SELECT MAX(business_date) FROM sale_returns WHERE status=?',
          'CONFIRMED',
          'returns_status_business_date',
        ],
      ];
      for (const [sql, parameter, index] of legacyCases) {
        const plan = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(parameter) as { detail: string }[];
        expect(plan.some(({ detail }) => detail.includes('SEARCH') && detail.includes(index))).toBe(
          true,
        );
        expect(plan.some(({ detail }) => detail.startsWith('SCAN'))).toBe(false);
      }
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
          'sales_status_business_date',
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
