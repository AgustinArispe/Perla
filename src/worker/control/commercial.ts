import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { z } from 'zod';
import { DomainError } from '../../shared/errors';
import {
  CommercialFilterSchema,
  PriceReviewSchema,
  CommercialSettingsSchema,
  WeekRequestSchema,
  WeekRecalculateSchema,
  type CommercialItem,
  type CommercialPage,
  type CommercialFilter,
  type WeeklySummary,
  type ControlExport,
} from '../../shared/commercial-control';
import { unitCostFromRate, costForQuantity } from '../../domain/costs';
import { MonthlyReports } from '../reports/queries';
const today = (now = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
const addDays = (date: string, n: number) =>
  new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const monday = (date: string) =>
  addDays(date, -((new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const allowedFields: Record<string, string[]> = {
  product: ['name', 'sku', 'priceCents', 'active', 'revision'],
  stock: ['quantityBase', 'revision'],
  sale: ['number', 'status', 'totalCents'],
  shift: ['status', 'countedCents', 'expectedCents'],
  price: ['priceCents', 'costRevision'],
  settings: ['marginBasisPoints', 'staleDays', 'revision'],
};
export function recordStructuredAudit(
  db: Database.Database,
  actor: User,
  operation: string,
  entityType: string,
  entityId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  reason = '',
): void {
  if (!db.inTransaction) throw new Error('La auditoría requiere una transacción.');
  const pick = (value: Record<string, unknown>) =>
    Object.fromEntries(
      (allowedFields[entityType] ?? [])
        .filter(
          (k) =>
            k in value &&
            (value[k] === null || ['string', 'number', 'boolean'].includes(typeof value[k])),
        )
        .map((k) => [k, value[k]]),
    );
  const b = pick(before),
    a = pick(after);
  if (JSON.stringify(b) === JSON.stringify(a)) return;
  db.prepare(
    "INSERT INTO audit_events(event_type,id,entity_type,entity_id,operation,before_json,after_json,reason,actor_user_id,actor_name,created_at_utc) VALUES ('DETAIL',?,?,?,?,?,?,?,?,?,?)",
  ).run(
    randomUUID(),
    entityType,
    entityId,
    operation,
    JSON.stringify(b),
    JSON.stringify(a),
    reason.slice(0, 500),
    actor.id,
    actor.name,
    new Date().toISOString(),
  );
}
export interface AuditCapture {
  type: string;
  id: string | null;
  before: Record<string, unknown>;
}
function mutationEntity(operation: string): string | null {
  return operation.startsWith('products.')
    ? 'product'
    : operation.startsWith('stock.')
      ? 'stock'
      : operation.startsWith('sales.')
        ? 'sale'
        : operation.startsWith('cash.')
          ? 'shift'
          : null;
}
function mutationState(
  db: Database.Database,
  type: string,
  id: string | null,
): Record<string, unknown> {
  if (!id) return {};
  const sql =
    type === 'product'
      ? 'SELECT name,sku,price_cents AS priceCents,active,revision FROM products WHERE id=?'
      : type === 'stock'
        ? 'SELECT quantity_base AS quantityBase,revision FROM inventory_balances WHERE product_id=?'
        : type === 'sale'
          ? 'SELECT number,status,total_cents AS totalCents FROM sale_orders WHERE id=?'
          : type === 'shift'
            ? 'SELECT status,counted_cash_cents AS countedCents,expected_cash_cents AS expectedCents,revision FROM register_shifts WHERE id=?'
            : null;
  return sql ? ((db.prepare(sql).get(id) as Record<string, unknown> | undefined) ?? {}) : {};
}
export function captureAuditState(
  db: Database.Database,
  operation: string,
  payload: unknown,
): AuditCapture | null {
  const type = mutationEntity(operation);
  if (!type) return null;
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const value =
    type === 'product'
      ? (p.id ?? p.productId)
      : type === 'stock'
        ? p.productId
        : type === 'sale'
          ? (p.saleId ?? p.id)
          : (p.shiftId ?? p.id);
  const id = typeof value === 'string' ? value : null;
  return { type, id, before: mutationState(db, type, id) };
}
export function recordMutationAudit(
  db: Database.Database,
  actor: User,
  operation: string,
  payload: unknown,
  result: unknown,
  capture: AuditCapture | null,
): void {
  if (!capture) return;
  const p = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>,
    r = (result && typeof result === 'object' ? result : {}) as Record<string, unknown>;
  const value =
    capture.id ??
    (capture.type === 'stock'
      ? r.productId
      : capture.type === 'shift'
        ? (r.shiftId ?? r.id)
        : r.id);
  if (typeof value !== 'string') return;
  recordStructuredAudit(
    db,
    actor,
    operation,
    capture.type,
    value,
    capture.before,
    mutationState(db, capture.type, value),
    typeof p.reason === 'string' ? p.reason : '',
  );
}
export class CommercialControlService {
  constructor(private readonly db: Database.Database) {}
  private gate(actor: User, feature?: string) {
    if (!actor.active || !['OWNER', 'ADMIN'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Esta revisión está disponible para el jefe.');
    if (
      feature &&
      !(
        this.db
          .prepare('SELECT enabled FROM business_features WHERE feature_key=?')
          .get(feature) as { enabled: number } | undefined
      )?.enabled
    )
      throw new DomainError('FORBIDDEN', 'La función está deshabilitada.');
  }
  execute(action: string, raw: unknown, actor: User): unknown {
    this.gate(
      actor,
      action.startsWith('weekly.') || action === 'exportWeekly'
        ? 'MONTHLY_DASHBOARD'
        : action === 'rotation'
          ? 'STOCK_CONTROL'
          : ['activity', 'options', 'export', 'exportActivity'].includes(action)
            ? undefined
            : 'COSTS_MARGIN',
    );
    if (action === 'options') {
      z.strictObject({}).parse(raw);
      const flags = Object.fromEntries(
        (
          this.db.prepare('SELECT feature_key,enabled FROM business_features').all() as {
            feature_key: string;
            enabled: number;
          }[]
        ).map((f) => [f.feature_key, !!f.enabled]),
      );
      return {
        flags,
        actors: this.db.prepare('SELECT id,name FROM users ORDER BY name').all(),
        operations: this.db
          .prepare(
            'SELECT DISTINCT operation FROM audit_actions UNION SELECT DISTINCT operation FROM control_audit_details ORDER BY operation',
          )
          .all(),
        locations: flags.LOCATIONS_TRANSFERS
          ? this.db.prepare('SELECT id,name FROM locations WHERE active=1 ORDER BY name').all()
          : [],
      };
    }
    if (action === 'rotation' || action === 'prices')
      return this.list(CommercialFilterSchema.parse(raw), action === 'prices');
    if (action === 'review') return this.review(raw, actor);
    if (action === 'settings') return this.saveSettings(raw, actor);
    if (action === 'weekly.ensure') {
      const v = WeekRequestSchema.parse(raw);
      return this.ensureWeekly(v.weekStart);
    }
    if (action === 'weekly.get') {
      const v = WeekRequestSchema.parse(raw);
      return v.live
        ? this.week(v.weekStart ?? monday(today()), true)
        : this.snapshot(v.weekStart ?? addDays(monday(today()), -7), v.version);
    }
    if (action === 'weekly.recalculate') {
      const v = WeekRecalculateSchema.parse(raw);
      return this.ensureWeekly(v.weekStart, true, v.operationKey);
    }
    if (action === 'weekly.versions') {
      const v = WeekRequestSchema.parse(raw);
      return this.db
        .prepare(
          'SELECT week_start AS weekStart,version,generated_at_utc AS generatedAt FROM weekly_snapshots WHERE (? IS NULL OR week_start=?) ORDER BY week_start DESC,version DESC LIMIT 500',
        )
        .all(v.weekStart ?? null, v.weekStart ?? null);
    }
    if (action === 'exportWeekly') {
      const v = WeekRequestSchema.parse(raw);
      const w = v.live
        ? this.week(v.weekStart ?? monday(today()), true)
        : this.snapshot(v.weekStart ?? addDays(monday(today()), -7), v.version);
      return {
        filename: 'resumen-semanal.xlsx',
        sheets: [
          {
            name: 'Resumen',
            columns: [
              'Desde',
              'Hasta',
              'Versión',
              'Origen',
              'Generado',
              'Ventas netas ($)',
              'Operaciones',
              'Margen bruto conocido ($)',
              'Cobertura (%)',
            ],
            rows: [
              [
                w.from,
                w.to,
                w.version,
                w.source,
                w.generatedAt,
                w.totals.netCents / 100,
                w.totals.saleCount,
                w.profitability.grossMarginCents / 100,
                w.profitability.coverageBasisPoints / 100,
              ],
            ],
          },
          {
            name: 'Filtros',
            columns: ['Filtro', 'Valor'],
            rows: [
              ['Desde', w.from],
              ['Hasta', w.to],
              ['Versión', w.version],
              ['Origen', w.source],
            ],
          },
        ],
      } satisfies ControlExport;
    }
    if (action === 'export') {
      const v = z
        .strictObject({
          view: z.enum(['rotation', 'prices']).default('prices'),
          filters: CommercialFilterSchema.default(() => CommercialFilterSchema.parse({})),
        })
        .parse(raw);
      this.gate(actor, v.view === 'rotation' ? 'STOCK_CONTROL' : 'COSTS_MARGIN');
      const page = this.list(v.filters, v.view === 'prices', true);
      return {
        filename: 'revision-productos.xlsx',
        sheets: [
          {
            name: 'Productos',
            columns: [
              'Producto',
              'Existencia',
              'Última venta',
              'Movimiento',
              'Precio ($)',
              'Costo ($)',
              'Margen (%)',
              'Recargo (%)',
              'Razones',
            ],
            rows: page.items.map((i) => [
              i.name,
              i.unit === 'KG' ? i.quantityBase / 1000 : i.quantityBase,
              i.lastSale,
              {
                NEVER_SOLD: 'Nunca vendido',
                NO_RECENT_SALES: 'Sin ventas recientes',
                INSUFFICIENT_HISTORY: 'Sin historial suficiente',
              }[i.movementState],
              i.priceCents / 100,
              i.costCents === null ? null : i.costCents / 100,
              i.marginBasisPoints === null ? null : i.marginBasisPoints / 100,
              i.markupBasisPoints === null ? null : i.markupBasisPoints / 100,
              i.reasons
                .map(
                  (r) =>
                    ({
                      MISSING_COST: 'Costo faltante',
                      COST_ABOVE_PRICE: 'Costo mayor al precio',
                      LOW_MARGIN: 'Margen bajo',
                      UPDATED_COST: 'Costo actualizado',
                      STALE_PRICE: 'Precio sin revisar',
                    })[r] ?? r,
                )
                .join(', '),
            ]),
          },
          {
            name: 'Filtros',
            columns: ['Filtro', 'Valor'],
            rows: Object.entries(v.filters).map(([k, val]) => [
              k,
              Array.isArray(val) ? val.join(',') : String(val),
            ]),
          },
        ],
      } satisfies ControlExport;
    }
    if (action === 'activity') return this.activity(raw);
    if (action === 'exportActivity') {
      const page = this.activity(raw, true);
      return {
        filename: 'actividad.xlsx',
        sheets: [
          {
            name: 'Actividad',
            columns: ['Fecha', 'Usuario', 'Operación', 'Entidad', 'Antes', 'Después', 'Motivo'],
            rows: page.items.map((i) => [
              i.createdAt,
              i.actorName,
              i.operation,
              i.entityId,
              i.beforeJson ?? 'Registro anterior sin desglose',
              i.afterJson ?? 'Registro anterior sin desglose',
              i.reason,
            ]),
          },
          {
            name: 'Filtros',
            columns: ['Filtro', 'Valor'],
            rows: Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, String(v)]),
          },
        ],
      } satisfies ControlExport;
    }
    throw new DomainError('VALIDATION', 'Acción comercial no reconocida.');
  }
  private settings() {
    return this.db
      .prepare(
        'SELECT margin_basis_points AS marginBasisPoints,stale_days AS staleDays,revision FROM commercial_settings WHERE id=?',
      )
      .get('main') as CommercialPage['settings'];
  }
  priceSummary(actor: User): { total: number; items: { productId: string; name: string }[] } {
    this.gate(actor, 'COSTS_MARGIN');
    // Home only needs the count and first three names. Reuse the same price
    // rules and sorting, but avoid scanning each product's sales history.
    const page = this.list(CommercialFilterSchema.parse({ limit: 3 }), true, false, false);
    return {
      total: page.total,
      items: page.items.map(({ productId, name }) => ({ productId, name })),
    };
  }
  private list(
    f: CommercialFilter,
    prices: boolean,
    all = false,
    includeMovementHistory = true,
  ): CommercialPage {
    if (
      f.locationId &&
      !(
        this.db
          .prepare("SELECT enabled FROM business_features WHERE feature_key='LOCATIONS_TRANSFERS'")
          .get() as { enabled: number }
      )?.enabled
    )
      throw new DomainError('FORBIDDEN', 'Las ubicaciones están deshabilitadas.');
    const args: unknown[] = [];
    const wh = ['p.active=1'];
    if (f.productIds.length) {
      wh.push(`p.id IN (${f.productIds.map(() => '?').join(',')})`);
      args.push(...f.productIds);
    }
    if (f.categoryIds.length) {
      wh.push(`p.category_id IN (${f.categoryIds.map(() => '?').join(',')})`);
      args.push(...f.categoryIds);
    }
    if (f.brandIds.length) {
      wh.push(`p.brand_id IN (${f.brandIds.map(() => '?').join(',')})`);
      args.push(...f.brandIds);
    }
    const location = f.locationId ?? null;
    const rows = this.db
      .prepare(
        `SELECT p.id,p.name,p.sale_unit,p.price_cents,p.created_at_utc,p.cost_rate_micros_per_base AS rate_micros_per_base,p.cost_revision,p.cost_method AS method,p.cost_effective_at_utc AS effective_at_utc,
   CASE WHEN ? IS NULL THEN COALESCE((SELECT SUM(b.quantity_base) FROM location_inventory_balances b WHERE b.product_id=p.id),0) ELSE COALESCE((SELECT b.quantity_base FROM location_inventory_balances b WHERE b.product_id=p.id AND b.location_id=?),0) END quantity,
   ${includeMovementHistory ? "(SELECT MAX(s.business_date) FROM sale_order_items i JOIN sale_orders s ON s.id=i.sale_id WHERE i.product_id=p.id AND s.status='COMPLETED' AND (? IS NULL OR s.location_id=?) AND i.quantity_base>COALESCE((SELECT SUM(ri.quantity_base) FROM sale_return_items ri JOIN sale_returns sr ON sr.id=ri.return_id WHERE ri.sale_item_id=i.id AND sr.status='CONFIRMED'),0))" : 'NULL'} last_sale,
   (SELECT COALESCE(MAX(id),0) FROM commercial_price_events e WHERE e.product_id=p.id) price_version,
   (SELECT MAX(created_at_utc) FROM commercial_price_events e WHERE e.product_id=p.id) last_price,
   (SELECT created_at_utc FROM commercial_price_reviews r WHERE r.product_id=p.id AND r.price_cents=p.price_cents AND r.price_version=COALESCE((SELECT MAX(e.id) FROM commercial_price_events e WHERE e.product_id=p.id),0) AND r.cost_revision IS p.cost_revision ORDER BY created_at_utc DESC,id DESC LIMIT 1) reviewed
   FROM products p WHERE ${wh.join(' AND ')}`,
      )
      .all(
        location,
        location,
        ...(includeMovementHistory ? [location, location] : []),
        ...args,
      ) as {
      id: string;
      name: string;
      sale_unit: 'KG' | 'UNIT';
      price_cents: number;
      created_at_utc: string;
      rate_micros_per_base: number | null;
      cost_revision: number | null;
      method: string | null;
      effective_at_utc: string | null;
      quantity: number;
      price_version: number;
      last_sale: string | null;
      last_price: string | null;
      reviewed: string | null;
    }[];
    const settings = this.settings(),
      cutoff = addDays(today(), -f.days),
      stale = addDays(today(), -settings.staleDays);
    const costsEnabled = !!(
      this.db
        .prepare("SELECT enabled FROM business_features WHERE feature_key='COSTS_MARGIN'")
        .get() as { enabled: number }
    )?.enabled;
    const items: CommercialItem[] = rows
      .map((r): CommercialItem => {
        if (!costsEnabled) {
          r.rate_micros_per_base = null;
          r.cost_revision = null;
          r.method = null;
          r.effective_at_utc = null;
        }
        const cost =
          r.rate_micros_per_base === null
            ? null
            : unitCostFromRate(r.sale_unit, r.rate_micros_per_base);
        const margin =
          cost === null ? null : Math.round(((r.price_cents - cost) * 10000) / r.price_cents);
        const reasons: string[] = [];
        if (cost === null) reasons.push('MISSING_COST');
        else {
          if (cost > r.price_cents) reasons.push('COST_ABOVE_PRICE');
          if (margin! < settings.marginBasisPoints) reasons.push('LOW_MARGIN');
          if (r.effective_at_utc && (!r.reviewed || r.effective_at_utc > r.reviewed))
            reasons.push('UPDATED_COST');
        }
        if (
          (!r.reviewed || r.reviewed.slice(0, 10) <= stale) &&
          (!r.last_price || r.last_price.slice(0, 10) <= stale)
        )
          reasons.push('STALE_PRICE');
        return {
          productId: r.id,
          name: r.name,
          unit: r.sale_unit,
          priceCents: r.price_cents,
          priceVersion: r.price_version,
          quantityBase: r.quantity,
          costCents: cost,
          stockValueCents:
            r.rate_micros_per_base === null || r.quantity < 0
              ? null
              : r.quantity === 0
                ? 0
                : costForQuantity(r.quantity, r.rate_micros_per_base),
          costRevision: r.cost_revision,
          costOrigin: r.method,
          costEffectiveAt: r.effective_at_utc,
          marginBasisPoints: margin,
          markupBasisPoints:
            cost === null || cost === 0
              ? null
              : Math.round(((r.price_cents - cost) * 10000) / cost),
          lastSale: r.last_sale,
          movementState:
            r.created_at_utc.slice(0, 10) > cutoff
              ? 'INSUFFICIENT_HISTORY'
              : r.last_sale
                ? 'NO_RECENT_SALES'
                : 'NEVER_SOLD',
          lastPriceChange: r.last_price,
          lastReview: r.reviewed,
          reasons: r.reviewed && r.reviewed.slice(0, 10) > stale ? [] : reasons,
        };
      })
      .filter((i) =>
        prices
          ? i.reasons.length > 0
          : (f.includeEmpty || i.quantityBase > 0) &&
            i.movementState !== 'INSUFFICIENT_HISTORY' &&
            (!i.lastSale || i.lastSale <= cutoff),
      );
    items.sort(
      (a, b) =>
        (b.stockValueCents ?? -1) - (a.stockValueCents ?? -1) || a.name.localeCompare(b.name),
    );
    return {
      items: all ? items : items.slice((f.page - 1) * f.limit, f.page * f.limit),
      total: items.length,
      page: f.page,
      limit: f.limit,
      settings,
    };
  }
  private review(raw: unknown, actor: User) {
    const v = PriceReviewSchema.parse(raw);
    return this.db
      .transaction(() => {
        const existing = this.db
          .prepare(
            'SELECT product_id,price_cents,price_version,cost_revision FROM commercial_price_reviews WHERE operation_key=? ORDER BY product_id',
          )
          .all(v.operationKey);
        const requested = v.items
          .map((i) => ({
            product_id: i.productId,
            price_cents: i.priceCents,
            price_version: i.priceVersion,
            cost_revision: i.costRevision,
          }))
          .sort((a, b) => a.product_id.localeCompare(b.product_id));
        if (existing.length) {
          if (hash(existing) !== hash(requested))
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Esta clave corresponde a otra revisión.',
            );
          return { reviewed: existing.length };
        }
        if (new Set(v.items.map((i) => i.productId)).size !== v.items.length)
          throw new DomainError('VALIDATION', 'No repitas productos.');
        for (const i of v.items) {
          const current = this.db
            .prepare(
              'SELECT p.price_cents,p.cost_revision AS revision,COALESCE((SELECT MAX(e.id) FROM commercial_price_events e WHERE e.product_id=p.id),0) price_version FROM products p WHERE p.id=?',
            )
            .get(i.productId) as
            { price_cents: number; revision: number | null; price_version: number } | undefined;
          if (
            !current ||
            current.price_cents !== i.priceCents ||
            current.revision !== i.costRevision ||
            current.price_version !== i.priceVersion
          )
            throw new DomainError(
              'REVISION_CONFLICT',
              'El precio o costo cambió. Actualizá la lista.',
            );
          this.db
            .prepare('INSERT INTO commercial_price_reviews VALUES (?,?,?,?,?,?,?,?,?)')
            .run(
              randomUUID(),
              v.operationKey,
              i.productId,
              i.priceCents,
              i.priceVersion,
              i.costRevision,
              actor.id,
              actor.name,
              new Date().toISOString(),
            );
        }
        return { reviewed: v.items.length };
      })
      .immediate();
  }
  private saveSettings(raw: unknown, actor: User) {
    const v = CommercialSettingsSchema.parse(raw);
    return this.db
      .transaction(() => {
        const before = this.settings();
        const result = this.db
          .prepare(
            'UPDATE business_settings SET margin_basis_points=?,stale_days=?,commercial_revision=commercial_revision+1 WHERE id=1 AND commercial_revision=?',
          )
          .run(v.marginBasisPoints, v.staleDays, v.expectedRevision);
        if (!result.changes) throw new DomainError('REVISION_CONFLICT', 'Los criterios cambiaron.');
        const after = this.settings();
        recordStructuredAudit(
          this.db,
          actor,
          'commercial.settings',
          'settings',
          'main',
          before,
          after,
        );
        return after;
      })
      .immediate();
  }
  private week(start: string, live = false): WeeklySummary {
    if (start !== monday(start))
      throw new DomainError('VALIDATION', 'Elegí el lunes de la semana.');
    if (start > today()) throw new DomainError('VALIDATION', 'La semana todavía no empezó.');
    const end = addDays(start, 6),
      partial = end >= today(),
      to = partial ? today() : end;
    const reports = new MonthlyReports(this.db);
    const current = reports.period(start, to),
      previous = reports.period(addDays(start, -7), addDays(to, -7));
    const pending = this.db
      .prepare(
        'SELECT p.id productId,p.name,p.sale_unit unit,b.quantity_base quantityBase FROM products p JOIN inventory_balances b ON b.product_id=p.id WHERE p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base ORDER BY b.quantity_base,p.name LIMIT 5',
      )
      .all() as WeeklySummary['pending'];
    return {
      id: randomUUID(),
      version: 0,
      weekStart: start,
      from: start,
      to,
      partial,
      source: live ? 'LIVE' : 'SNAPSHOT',
      generatedAt: new Date().toISOString(),
      ...current,
      previous: previous.totals,
      changeBasisPoints: previous.totals.netCents
        ? Math.round(
            ((current.totals.netCents - previous.totals.netCents) * 10000) /
              previous.totals.netCents,
          )
        : null,
      pending,
    };
  }
  private snapshot(start: string, version?: number): WeeklySummary {
    const row = this.db
      .prepare(
        'SELECT body_json FROM weekly_snapshots WHERE week_start=? AND (? IS NULL OR version=?) ORDER BY version DESC LIMIT 1',
      )
      .get(start, version ?? null, version ?? null) as { body_json: string } | undefined;
    if (!row) {
      if (version) throw new DomainError('NOT_FOUND', 'No se encontró esa versión.');
      return this.ensureWeekly(start);
    }
    return JSON.parse(row.body_json) as WeeklySummary;
  }
  ensureWeekly(
    start = addDays(monday(today()), -7),
    recalculate = false,
    operationKey?: string,
  ): WeeklySummary {
    z.iso.date().parse(start);
    if (addDays(start, 6) >= today())
      throw new DomainError('VALIDATION', 'El resumen guardado requiere una semana completa.');
    return this.db
      .transaction(() => {
        if (operationKey) {
          const old = this.db
            .prepare('SELECT week_start,body_json FROM weekly_snapshots WHERE operation_key=?')
            .get(operationKey) as { week_start: string; body_json: string } | undefined;
          if (old) {
            if (old.week_start !== start)
              throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave pertenece a otra semana.');
            return JSON.parse(old.body_json) as WeeklySummary;
          }
        }
        const old = this.db
          .prepare(
            'SELECT body_json,version FROM weekly_snapshots WHERE week_start=? ORDER BY version DESC LIMIT 1',
          )
          .get(start) as { body_json: string; version: number } | undefined;
        if (old && !recalculate) return JSON.parse(old.body_json) as WeeklySummary;
        const summary = this.week(start);
        summary.version = (old?.version ?? 0) + 1;
        this.db
          .prepare('INSERT INTO weekly_snapshots VALUES (?,?,?,?,?,?)')
          .run(
            summary.id,
            start,
            summary.version,
            operationKey ?? null,
            summary.generatedAt,
            JSON.stringify(summary),
          );
        return summary;
      })
      .immediate();
  }
  recoverWeekly(maxWeeks = 52): number {
    const first = this.db.prepare('SELECT MIN(business_date) date FROM sale_orders').get() as {
      date: string | null;
    };
    const last = addDays(monday(today()), -7);
    const oldest = first.date ? monday(first.date) : last;
    let generated = 0;
    for (let start = oldest; start <= last && generated < maxWeeks; start = addDays(start, 7)) {
      if (
        !this.db.prepare('SELECT id FROM weekly_snapshots WHERE week_start=? LIMIT 1').get(start)
      ) {
        this.ensureWeekly(start);
        generated++;
      }
    }
    return generated;
  }
  private activity(raw: unknown, all = false) {
    const v = z
      .strictObject({
        entityType: z.enum(['product', 'stock', 'sale', 'shift', 'price', 'settings']).optional(),
        entityId: z.string().max(100).optional(),
        entityQuery: z.string().trim().max(100).optional(),
        actorId: z.uuid().optional(),
        operation: z.string().max(100).optional(),
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        page: z.number().int().positive().default(1),
        limit: z.number().int().min(1).max(100).default(25),
      })
      .parse(raw);
    const wh = ['1=1'],
      args: (string | number)[] = [];
    for (const [key, col] of [
      ['entityType', 'entity_type'],
      ['entityId', 'entity_id'],
      ['actorId', 'actor_user_id'],
      ['operation', 'operation'],
    ] as const) {
      if (v[key]) {
        wh.push(col + '=?');
        args.push(v[key]);
      }
    }
    if (v.entityQuery) {
      wh.push(
        '(entity_id IN (SELECT id FROM products WHERE name LIKE ? OR sku LIKE ?) OR entity_id IN (SELECT id FROM sale_orders WHERE CAST(number AS TEXT)=?))',
      );
      args.push('%' + v.entityQuery + '%', '%' + v.entityQuery + '%', v.entityQuery);
    }
    if (v.from) {
      wh.push("date(created_at_utc,'-3 hours')>=?");
      args.push(v.from);
    }
    if (v.to) {
      wh.push("date(created_at_utc,'-3 hours')<=?");
      args.push(v.to);
    }
    const source = `(SELECT id,entity_type,entity_id,operation,before_json,after_json,reason,actor_user_id,actor_name,created_at_utc FROM control_audit_details
 UNION ALL SELECT a.id,CASE WHEN a.operation LIKE 'products.%' THEN 'product' WHEN a.operation LIKE 'sales.%' THEN 'sale' WHEN a.operation LIKE 'stock.%' THEN 'stock' WHEN a.operation LIKE 'cash.%' THEN 'shift' ELSE 'settings' END entity_type,a.entity_id,a.operation,NULL before_json,NULL after_json,'Registro anterior sin desglose' reason,a.actor_user_id,a.actor_name,a.created_at_utc FROM audit_actions a WHERE NOT EXISTS (SELECT 1 FROM control_audit_details d WHERE d.operation=a.operation AND d.entity_id IS a.entity_id AND ABS(julianday(d.created_at_utc)-julianday(a.created_at_utc))<0.00003))`;
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) n FROM ${source} WHERE ${wh.join(' AND ')}`)
        .get(...args) as { n: number }
    ).n;
    if (all && total > 50000)
      throw new DomainError('VALIDATION', 'Acotá las fechas para exportar hasta 50.000 eventos.');
    const items = this.db
      .prepare(
        `SELECT id,entity_type entityType,entity_id entityId,operation,before_json beforeJson,after_json afterJson,reason,actor_name actorName,created_at_utc createdAt FROM ${source} WHERE ${wh.join(' AND ')} ORDER BY created_at_utc DESC,id DESC LIMIT ? OFFSET ?`,
      )
      .all(...args, all ? 50000 : v.limit, all ? 0 : (v.page - 1) * v.limit) as {
      id: string;
      entityId: string;
      operation: string;
      beforeJson: string | null;
      afterJson: string | null;
      reason: string;
      actorName: string;
      createdAt: string;
    }[];
    return { items, total, page: v.page, limit: v.limit };
  }
}
