import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { CatalogRepository } from '../../src/worker/products/repository';
import {
  CommercialControlService,
  recordStructuredAudit,
} from '../../src/worker/control/commercial';
import commercialSql from '../../src/worker/db/migrations/026_control_commercial.sql?raw';
import weeklySql from '../../src/worker/db/migrations/029_control_weekly.sql?raw';
function fixture() {
  const db = openDatabase(':memory:');
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name='commercial_price_reviews'").get())
    db.exec(commercialSql);
  if (!db.prepare("SELECT name FROM sqlite_master WHERE name='weekly_snapshots'").get())
    db.exec(weeklySql);
  const actor = new AuthService(db).bootstrap({
    name: 'Dueña',
    username: 'jefe',
    password: 'Prueba-Perla-2026!',
  }).user;
  db.prepare('UPDATE business_features SET enabled=1').run();
  const catalog = new CatalogRepository(db);
  const p = catalog.save({
    sku: 'P1',
    barcode: null,
    name: 'Merluza',
    category: 'Pescados',
    saleUnit: 'UNIT',
    priceCents: 100000,
    active: true,
    trackStock: false,
    minStockBase: 0,
  });
  const service = new CommercialControlService(db);
  return { db, actor, p, service };
}
describe('control comercial', () => {
  it('el resumen de Inicio conserva prioridades y permisos de la revisión completa', () => {
    const f = fixture();
    try {
      const page = f.service.execute('prices', { limit: 3 }, f.actor) as {
        total: number;
        items: { productId: string; name: string }[];
      };
      expect(f.service.priceSummary(f.actor)).toEqual({
        total: page.total,
        items: page.items.map(({ productId, name }) => ({ productId, name })),
      });
      expect(() => f.service.priceSummary({ ...f.actor, role: 'SUPERVISOR' })).toThrow();
      expect(() => f.service.priceSummary({ ...f.actor, active: false })).toThrow();
      f.db.prepare("UPDATE business_features SET enabled=0 WHERE feature_key='COSTS_MARGIN'").run();
      expect(() => f.service.priceSummary(f.actor)).toThrow();
    } finally {
      f.db.close();
    }
  });
  it('prioriza 50 unidades antiguas y descuenta una devolución total del último movimiento', () => {
    const f = fixture();
    try {
      const old = new Date(Date.now() - 150 * 86400000).toISOString(),
        saleDate = new Date(Date.now() - 91 * 86400000).toISOString().slice(0, 10);
      f.db.prepare('UPDATE products SET created_at_utc=? WHERE id=?').run(old, f.p.id);
      const location = (
        f.db.prepare('SELECT id FROM locations WHERE is_default=1').get() as { id: string }
      ).id;
      f.db
        .prepare('INSERT INTO location_inventory_balances VALUES (?,?,?,?)')
        .run(location, f.p.id, 50, 1);
      f.db
        .prepare(
          "INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,location_id) VALUES ('movement',1,'movementkey','h','COMPLETED',?,?,?,?,0,100000,'{}',?)",
        )
        .run(saleDate + 'T15:00:00Z', saleDate, saleDate.slice(0, 7), 100000, location);
      f.db
        .prepare(
          "INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents) VALUES ('line','movement','line',1,?,'P1','Merluza','UNIT',100000,1,100000,0,100000)",
        )
        .run(f.p.id);
      const first = (
        f.service.execute('rotation', { days: 90 }, f.actor) as {
          items: { lastSale: string | null; quantityBase: number; movementState: string }[];
        }
      ).items[0]!;
      expect(first.quantityBase).toBe(50);
      expect(first.lastSale).toBe(saleDate);
      f.db
        .prepare(
          "INSERT INTO sales(id,number,original_sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,cost_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month,document_type) VALUES ('return',1,'movement','returnkey','h','{}','CONFIRMED','Devolución',100000,NULL,?,?,?,?,?,'RETURN')",
        )
        .run(f.actor.id, f.actor.name, saleDate + 'T18:00:00Z', saleDate, saleDate.slice(0, 7));
      f.db
        .prepare(
          "INSERT INTO sale_items(id,sale_id,line_id,position,product_id,sku,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_cents,document_type,original_sale_item_id,disposition) VALUES ('returned','return','line',1,?,'P1','Merluza','UNIT',100000,1,100000,0,100000,NULL,'RETURN','line','NONE')",
        )
        .run(f.p.id);
      const returned = (
        f.service.execute('rotation', { days: 90 }, f.actor) as {
          items: { lastSale: null; movementState: string }[];
        }
      ).items[0]!;
      expect(returned.lastSale).toBeNull();
      expect(returned.movementState).toBe('NEVER_SOLD');
    } finally {
      f.db.close();
    }
  });
  it('filtra producto exacto en consulta y exportación', () => {
    const f = fixture();
    try {
      const missing = crypto.randomUUID();
      expect(
        (f.service.execute('prices', { productIds: [missing] }, f.actor) as { items: unknown[] })
          .items,
      ).toHaveLength(0);
      const sheet = f.service.execute(
        'export',
        { view: 'prices', filters: { productIds: [missing] } },
        f.actor,
      ) as { sheets: { rows: unknown[] }[] };
      expect(sheet.sheets[0]!.rows).toHaveLength(0);
    } finally {
      f.db.close();
    }
  });
  it('invalida revisión cuando precio cambió y volvió al valor anterior', () => {
    const f = fixture();
    try {
      f.db.prepare('UPDATE products SET price_cents=110000 WHERE id=?').run(f.p.id);
      f.db.prepare('UPDATE products SET price_cents=100000 WHERE id=?').run(f.p.id);
      expect(() =>
        f.service.execute(
          'review',
          {
            operationKey: crypto.randomUUID(),
            items: [{ productId: f.p.id, priceCents: 100000, costRevision: null, priceVersion: 0 }],
          },
          f.actor,
        ),
      ).toThrow('cambió');
    } finally {
      f.db.close();
    }
  });
  it('recupera semanas pendientes después de una interrupción sin duplicarlas', () => {
    const f = fixture();
    try {
      const start = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10);
      f.db
        .prepare(
          "INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) VALUES ('old',1,'oldkey','h','COMPLETED',?,?,?,?,0,100000,'{}')",
        )
        .run(start + 'T15:00:00Z', start, start.slice(0, 7), 100000);
      expect(f.service.recoverWeekly(1)).toBe(1);
      expect(f.service.recoverWeekly(52)).toBeGreaterThan(0);
      expect(f.service.recoverWeekly(52)).toBe(0);
    } finally {
      f.db.close();
    }
  });
  it('muestra historial anterior sin inventar cambios estructurados', () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          'INSERT INTO audit_events(id,operation,entity_id,actor_user_id,actor_name,created_at_utc) VALUES (?,?,?,?,?,?)',
        )
        .run(
          crypto.randomUUID(),
          'products.save',
          f.p.id,
          f.actor.id,
          f.actor.name,
          new Date().toISOString(),
        );
      const events = f.service.execute('activity', { entityId: f.p.id }, f.actor) as {
        items: { beforeJson: null; reason: string }[];
      };
      expect(events.items[0]!.beforeJson).toBeNull();
      expect(events.items[0]!.reason).toBe('Registro anterior sin desglose');
    } finally {
      f.db.close();
    }
  });
  it('audita antes y después sin secretos y conserva eventos inmutables', () => {
    const f = fixture();
    try {
      f.db.transaction(() =>
        recordStructuredAudit(
          f.db,
          f.actor,
          'products.save',
          'product',
          f.p.id,
          { priceCents: 100000, password: 'secret' },
          { priceCents: 110000, token: 'secret' },
        ),
      )();
      const event = f.db
        .prepare('SELECT before_json,after_json FROM control_audit_details')
        .get() as { before_json: string; after_json: string };
      expect(JSON.parse(event.before_json)).toEqual({ priceCents: 100000 });
      expect(JSON.parse(event.after_json)).toEqual({ priceCents: 110000 });
      expect(() =>
        f.db.prepare("DELETE FROM audit_events WHERE event_type='DETAIL'").run(),
      ).toThrow('El evento es inmutable');
      expect(f.db.prepare('SELECT before_json,after_json FROM control_audit_details').get()).toEqual(
        event,
      );
    } finally {
      f.db.close();
    }
  });
  it('exporta rotación con función costos desactivada sin exponer márgenes', () => {
    const f = fixture();
    try {
      f.db.prepare("UPDATE business_features SET enabled=0 WHERE feature_key='COSTS_MARGIN'").run();
      expect(() =>
        f.service.execute('export', { view: 'rotation', filters: {} }, f.actor),
      ).not.toThrow();
      expect(() => f.service.execute('export', { view: 'prices', filters: {} }, f.actor)).toThrow();
    } finally {
      f.db.close();
    }
  });
  it('registra solo cambios efectivos de precio, no ediciones de nombre', () => {
    const f = fixture();
    try {
      f.db.prepare('UPDATE products SET name=? WHERE id=?').run('Nuevo nombre', f.p.id);
      expect(f.db.prepare('SELECT COUNT(*) n FROM commercial_price_events').get()).toEqual({
        n: 0,
      });
      f.db.prepare('UPDATE products SET price_cents=110000 WHERE id=?').run(f.p.id);
      expect(
        f.db.prepare('SELECT before_cents,after_cents FROM commercial_price_events').get(),
      ).toEqual({ before_cents: 100000, after_cents: 110000 });
    } finally {
      f.db.close();
    }
  });
  it('usa margen sobre venta, revisa sin cambiar precio y reabre ante costo nuevo', () => {
    const f = fixture();
    try {
      f.db
        .prepare('WITH input(id,method,rate,covered,rev,effective,actor,name) AS (VALUES(?,?,?,?,?,?,?,?)) UPDATE products SET (cost_method,cost_rate_micros_per_base,cost_covered_quantity_base,cost_revision,cost_effective_at_utc,cost_actor_user_id,cost_actor_name)=(SELECT method,rate,covered,rev,effective,actor,name FROM input) WHERE id=(SELECT id FROM input)')
        .run(
          f.p.id,
          'REFERENCE',
          80000000000,
          0,
          1,
          '2026-01-01T00:00:00Z',
          f.actor.id,
          f.actor.name,
        );
      const list = f.service.execute('prices', {}, f.actor) as {
        items: {
          productId: string;
          marginBasisPoints: number;
          costRevision: number | null;
          priceCents: number;
        }[];
      };
      expect(list.items[0]!.marginBasisPoints).toBe(2000);
      f.service.execute(
        'review',
        {
          operationKey: crypto.randomUUID(),
          items: [{ productId: f.p.id, priceCents: 100000, costRevision: 1 }],
        },
        f.actor,
      );
      expect((f.service.execute('prices', {}, f.actor) as { items: unknown[] }).items).toHaveLength(
        0,
      );
      f.db
        .prepare(
          'UPDATE products SET cost_revision=2,cost_rate_micros_per_base=90000000000 WHERE id=?',
        )
        .run(f.p.id);
      expect((f.service.execute('prices', {}, f.actor) as { items: unknown[] }).items).toHaveLength(
        1,
      );
      expect(f.db.prepare('SELECT price_cents FROM products WHERE id=?').get(f.p.id)).toEqual({
        price_cents: 100000,
      });
    } finally {
      f.db.close();
    }
  });
  it('rechaza permisos y funciones deshabilitadas', () => {
    const f = fixture();
    try {
      expect(() => f.service.execute('prices', {}, { ...f.actor, role: 'SUPERVISOR' })).toThrow();
      f.db.prepare("UPDATE business_features SET enabled=0 WHERE feature_key='COSTS_MARGIN'").run();
      expect(() => f.service.execute('prices', {}, f.actor)).toThrow();
      expect(() => f.service.execute('rotation', { days: 31 }, f.actor)).toThrow();
    } finally {
      f.db.close();
    }
  });
  it('no etiqueta productos nuevos y no inventa costo faltante', () => {
    const f = fixture();
    try {
      expect(
        (f.service.execute('rotation', { days: 90 }, f.actor) as { items: unknown[] }).items,
      ).toHaveLength(0);
      const row = (
        f.service.execute('prices', {}, f.actor) as {
          items: { marginBasisPoints: null; reasons: string[] }[];
        }
      ).items[0]!;
      expect(row.marginBasisPoints).toBeNull();
      expect(row.reasons).toContain('MISSING_COST');
    } finally {
      f.db.close();
    }
  });
  it('snapshot idempotente conserva versiones y concilia una semana entre meses', () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          "INSERT INTO sales(id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) VALUES ('s1',1,'k1','h','COMPLETED','2026-09-30T15:00:00Z','2026-09-30','2026-09',100000,0,100000,'{}')",
        )
        .run();
      const input = { weekStart: '2026-09-28' };
      const first = f.service.execute('weekly.ensure', input, f.actor) as {
        id: string;
        version: number;
        totals: { netCents: number };
      };
      expect(first.totals.netCents).toBe(100000);
      expect(f.service.execute('weekly.ensure', input, f.actor)).toEqual(first);
      const next = f.service.execute(
        'weekly.recalculate',
        { ...input, operationKey: crypto.randomUUID() },
        f.actor,
      ) as { version: number };
      expect(next.version).toBe(2);
      expect(f.db.prepare('SELECT COUNT(*) n FROM weekly_snapshots').get()).toEqual({ n: 2 });
    } finally {
      f.db.close();
    }
  });
});
