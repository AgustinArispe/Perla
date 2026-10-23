import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { User } from '../../shared/auth';
import { IdSchema } from '../../shared/catalog';
import { DomainError } from '../../shared/errors';
import {
  CalendarSchema,
  ProductRuleSchema,
  OrderCancelSchema,
  OrderRescheduleSchema,
  OrderConfirmSchema,
  OrderCreateSchema,
  OrderListSchema,
  OrderReceiveSchema,
  SuggestionQuerySchema,
  type ReplenishmentCalendar,
  type ReplenishmentOrder,
  type Suggestion,
  type SuggestionPage,
} from '../../shared/replenishment';
import { CatalogRepository } from '../products/repository';
import { StockService } from '../stock/service';
import { StockRepository } from '../stock/repository';
import { PurchaseService } from '../purchases/service';
import { LotService } from '../lots/service';
import { SupplierAccountService } from '../supplier-accounts/service';
import { CashService, operationHash } from '../operations/cash';
import type { StockRecordInput } from '../../shared/stock';
import { nextBalance, stockState } from '../../domain/inventory';

const today = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(),
  );
const plusDay = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// PurchaseService retains costing and debt rules; only its stock/lot destination is scoped.
class DestinationStock extends StockService {
  constructor(
    private readonly database: Database.Database,
    catalog: CatalogRepository,
    private readonly locationId: string,
  ) {
    super(database, catalog);
  }
  override record(input: StockRecordInput) {
    const current = this.get(input.productId);
    if (
      current.revision !== input.expectedRevision ||
      current.productRevision !== input.expectedProductRevision
    )
      throw new DomainError('REVISION_CONFLICT', 'La existencia cambió.');
    const ledger = new StockRepository(this.database);
    const local = ledger.balance(input.productId, this.locationId);
    if (!local)
      throw new DomainError('VALIDATION', 'Registrá un conteo en la ubicación antes de recibir.');
    const quantity = nextBalance(local.quantity_base, input.deltaBase, false);
    const result = {
      ...current,
      quantityBase: quantity,
      revision: local.revision + 1,
      state: stockState(true, true, quantity, current.minStockBase),
    };
    ledger.appendWithinTransaction({
      productId: input.productId,
      deltaBase: input.deltaBase,
      nextBase: quantity,
      revision: local.revision + 1,
      kind: input.kind,
      reason: input.reason,
      operationKey: input.operationKey,
      hash: operationHash(input),
      result,
      locationId: this.locationId,
    });
    return result;
  }
}
class DestinationLots extends LotService {
  constructor(
    db: Database.Database,
    private readonly locationId: string,
  ) {
    super(db);
  }
  override receive(input: Parameters<LotService['receive']>[0]) {
    return super.receive({ ...input, locationId: this.locationId });
  }
}

export class ReplenishmentService {
  constructor(private readonly db: Database.Database) {}
  private enabled(key: string) {
    return Boolean(
      (
        this.db.prepare('SELECT enabled FROM business_features WHERE feature_key=?').get(key) as
          { enabled: number } | undefined
      )?.enabled,
    );
  }
  execute(action: string, input: unknown, actor: User): unknown {
    if (!actor.active || !['OWNER', 'ADMIN', 'SUPERVISOR'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'No tenés permiso para reposición.');
    const commercial = ['saveCalendar', 'saveProductRule', 'export'];
    if (commercial.includes(action) && !['OWNER', 'ADMIN'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Solo el jefe puede confirmar pedidos y costos.');
    const resolving = [
      'list',
      'detail',
      'receive',
      'cancel',
      'reschedule',
      'locations',
      'suppliers',
      'export',
    ];
    if (
      !resolving.includes(action) &&
      (!this.enabled('STOCK_CONTROL') || !this.enabled('REPLENISHMENT'))
    )
      throw new DomainError('FORBIDDEN', 'Reposición está desactivada para el negocio.');
    if (['create', 'confirm', 'receive'].includes(action) && !this.enabled('SUPPLIERS_PURCHASES'))
      throw new DomainError('FORBIDDEN', 'Proveedores y compras está desactivada.');
    if (action === 'receive' && !this.enabled('STOCK_CONTROL'))
      throw new DomainError('FORBIDDEN', 'Activá Stock antes de recibir pedidos pendientes.');
    let result: unknown;
    switch (action) {
      case 'suggest':
        result = this.suggest(SuggestionQuerySchema.parse(input));
        break;
      case 'list':
        result = this.list(OrderListSchema.parse(input));
        break;
      case 'detail':
        result = this.detail(z.strictObject({ orderId: IdSchema }).parse(input).orderId);
        break;
      case 'locations':
        z.strictObject({}).parse(input);
        result = this.db
          .prepare('SELECT id,name,active FROM locations ORDER BY is_default DESC,name')
          .all();
        break;
      case 'suppliers':
        z.strictObject({}).parse(input);
        result = this.db
          .prepare('SELECT id,name FROM suppliers WHERE active=1 ORDER BY name')
          .all();
        break;
      case 'calendar':
        result = this.calendar(z.strictObject({ locationId: IdSchema }).parse(input).locationId);
        break;
      case 'saveCalendar':
        result = this.saveCalendar(CalendarSchema.parse(input));
        break;
      case 'saveProductRule': {
        const v = ProductRuleSchema.parse(input);
        result = this.db
          .transaction(() => {
            new CatalogRepository(this.db).get(v.productId);
            const current = this.db
              .prepare('SELECT revision FROM replenishment_product_rules WHERE product_id=?')
              .get(v.productId) as { revision: number } | undefined;
            if ((current?.revision ?? 0) !== v.expectedRevision)
              throw new DomainError('REVISION_CONFLICT', 'La unidad de compra cambió.');
            this.db
              .prepare(
                'UPDATE products SET replenishment_revision=?,purchase_multiple_base=? WHERE id=?',
              )
              .run(v.expectedRevision + 1, v.purchaseMultipleBase, v.productId);
            return { ...v, revision: v.expectedRevision + 1 };
          })
          .immediate();
        break;
      }
      case 'create': {
        const v = OrderCreateSchema.parse(input);
        result = this.mutate(action, v, actor, () => this.create(v, actor));
        break;
      }
      case 'confirm': {
        const v = OrderConfirmSchema.parse(input);
        result = this.mutate(action, v, actor, () => {
          const order = this.checked(v.orderId, v.expectedRevision);
          if (order.status !== 'DRAFT')
            throw new DomainError('VALIDATION', 'El pedido ya se confirmó.');
          for (const line of order.lines) {
            const product = new CatalogRepository(this.db).get(line.productId);
            if (!product.active || product.revision !== line.productRevision)
              throw new DomainError(
                'REVISION_CONFLICT',
                `${line.name} cambió. Prepará nuevamente el pedido.`,
              );
            const snapshot = this.db
              .prepare('SELECT stock_revision FROM replenishment_order_lines WHERE id=?')
              .get(line.id) as { stock_revision: number };
            const current =
              new StockRepository(this.db).balance(line.productId, order.locationId)?.revision ?? 0;
            if (current !== snapshot.stock_revision && !v.acceptChangedStock)
              throw new DomainError(
                'REVISION_CONFLICT',
                'La existencia cambió mientras preparabas el pedido. Revisá la sugerencia y confirmá nuevamente con cantidades revisadas.',
              );
          }
          if (
            !this.db
              .prepare('SELECT id FROM suppliers WHERE id=? AND active=1')
              .get(order.supplierId)
          )
            throw new DomainError('INACTIVE', 'El proveedor está inactivo.');
          const warnings = this.suggest(
            SuggestionQuerySchema.parse({ locationId: order.locationId }),
            true,
          ).items.filter((s) => order.lines.some((l) => l.productId === s.productId));
          this.db
            .prepare(
              "UPDATE replenishment_orders SET status='ORDERED',revision=revision+1,expected_date=? WHERE id=?",
            )
            .run(v.expectedDate === undefined ? order.expectedDate : v.expectedDate, order.id);
          return { ...this.detail(order.id), revalidatedSuggestions: warnings };
        });
        break;
      }
      case 'cancel': {
        const v = OrderCancelSchema.parse(input);
        result = this.mutate(action, v, actor, () => {
          const order = this.checked(v.orderId, v.expectedRevision);
          if (['RECEIVED', 'CANCELLED'].includes(order.status))
            throw new DomainError('VALIDATION', 'No queda cantidad pendiente.');
          this.db
            .prepare(
              'UPDATE replenishment_order_lines SET cancelled_base=ordered_base-received_base WHERE order_id=?',
            )
            .run(order.id);
          this.db
            .prepare(
              "UPDATE replenishment_orders SET status='CANCELLED',revision=revision+1 WHERE id=?",
            )
            .run(order.id);
          return this.detail(order.id);
        });
        break;
      }
      case 'receive': {
        const v = OrderReceiveSchema.parse(input);
        result = this.mutate(action, v, actor, () => this.receive(v, actor));
        break;
      }
      case 'reschedule': {
        const v = OrderRescheduleSchema.parse(input);
        result = this.mutate(action, v, actor, () => {
          const order = this.checked(v.orderId, v.expectedRevision);
          if (!['DRAFT', 'ORDERED', 'PARTIAL'].includes(order.status))
            throw new DomainError('VALIDATION', 'El pedido ya terminó.');
          this.db
            .prepare(
              'UPDATE replenishment_orders SET expected_date=?,revision=revision+1 WHERE id=?',
            )
            .run(v.expectedDate, order.id);
          return this.detail(order.id);
        });
        break;
      }
      case 'export': {
        const v = z
          .strictObject({
            dataset: z.enum(['suggestions', 'orders']).default('suggestions'),
            filters: z.unknown(),
            selectedIds: z.array(IdSchema).max(50000).optional(),
          })
          .parse(input);
        let rows: Record<string, unknown>[];
        if (v.dataset === 'suggestions') {
          const query = SuggestionQuerySchema.parse(v.filters);
          rows = this.suggest({ ...query, limit: 100, offset: 0 }, true).items as unknown as Record<
            string,
            unknown
          >[];
        } else {
          const query = OrderListSchema.parse(v.filters);
          rows = this.list({ ...query, limit: 100, offset: 0 }, true).items.flatMap((o) =>
            o.lines.map((l) => ({
              orderId: o.id,
              number: o.number,
              supplier: o.supplierName,
              location: o.locationName,
              status: o.status,
              expectedDate: o.expectedDate,
              ...l,
            })),
          );
        }
        if (v.selectedIds)
          rows = rows.filter((r) =>
            v.selectedIds!.includes(String(v.dataset === 'suggestions' ? r.productId : r.orderId)),
          );
        result = {
          sheets: [
            { name: 'Reposición', columns: rows.length ? Object.keys(rows[0]!) : ['name'], rows },
          ],
          filters: v.filters,
          filename: 'reposicion.xlsx',
        };
        break;
      }
      default:
        throw new DomainError('VALIDATION', 'Acción de reposición desconocida.');
    }
    if (actor.role === 'SUPERVISOR')
      return JSON.parse(
        JSON.stringify(result, (key, value) => (key === 'estimatedCostCents' ? null : value)),
      );
    return result;
  }
  private calendar(locationId: string): ReplenishmentCalendar {
    if (!this.db.prepare('SELECT id FROM locations WHERE id=?').get(locationId))
      throw new DomainError('NOT_FOUND', 'La ubicación no existe.');
    const row = this.db
      .prepare('SELECT * FROM replenishment_calendars WHERE location_id=?')
      .get(locationId) as
      { revision: number; weekdays_json: string; closed_dates_json: string } | undefined;
    return {
      locationId,
      revision: row?.revision ?? 0,
      openWeekdays: row ? JSON.parse(row.weekdays_json) : [],
      closedDates: row ? JSON.parse(row.closed_dates_json) : [],
    };
  }
  private saveCalendar(v: z.infer<typeof CalendarSchema>) {
    return this.db
      .transaction(() => {
        if (this.calendar(v.locationId).revision !== v.expectedRevision)
          throw new DomainError('REVISION_CONFLICT', 'El calendario cambió.');
        this.db
          .prepare(
            'UPDATE locations SET calendar_revision=?,weekdays_json=?,closed_dates_json=? WHERE id=?',
          )
          .run(
            v.expectedRevision + 1,
            JSON.stringify(v.openWeekdays),
            JSON.stringify(v.closedDates),
            v.locationId,
          );
        return this.calendar(v.locationId);
      })
      .immediate();
  }
  private mutate(
    action: string,
    v: { operationKey: string },
    actor: User,
    body: () => ReplenishmentOrder,
  ) {
    const hash = operationHash({ action, input: v });
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare(
            'SELECT payload_hash,result_json FROM replenishment_events WHERE operation_key=?',
          )
          .get(v.operationKey) as { payload_hash: string; result_json: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== hash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador corresponde a otra operación.',
            );
          return JSON.parse(replay.result_json) as ReplenishmentOrder;
        }
        const result = body();
        this.db
          .prepare('INSERT INTO replenishment_events VALUES(?,?,?,?,?,?,?)')
          .run(
            v.operationKey,
            result.id,
            action,
            hash,
            JSON.stringify(result),
            actor.id,
            new Date().toISOString(),
          );
        return result;
      })
      .immediate();
  }
  private checked(id: string, revision: number) {
    const o = this.detail(id);
    if (o.revision !== revision)
      throw new DomainError(
        'REVISION_CONFLICT',
        'El pedido cambió. Actualizalo antes de continuar.',
      );
    return o;
  }
  private create(v: z.infer<typeof OrderCreateSchema>, actor: User) {
    if (!this.db.prepare('SELECT id FROM suppliers WHERE id=? AND active=1').get(v.supplierId))
      throw new DomainError('VALIDATION', 'Elegí un proveedor activo.');
    if (!this.db.prepare('SELECT id FROM locations WHERE id=? AND active=1').get(v.locationId))
      throw new DomainError('VALIDATION', 'Elegí una ubicación activa.');
    const id = randomUUID();
    const number = (
      this.db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM replenishment_orders').get() as {
        n: number;
      }
    ).n;
    this.db
      .prepare("INSERT INTO replenishment_orders VALUES(?,?,?,?,'DRAFT',?,1,?,?)")
      .run(
        id,
        number,
        v.supplierId,
        v.locationId,
        v.expectedDate ?? null,
        actor.id,
        new Date().toISOString(),
      );
    for (const line of v.lines) {
      const product = new CatalogRepository(this.db).get(line.productId);
      if (!product.active || product.revision !== line.expectedProductRevision)
        throw new DomainError('REVISION_CONFLICT', 'El producto cambió. Revisá el pedido.');
      const stockRevision =
        new StockRepository(this.db).balance(product.id, v.locationId)?.revision ?? 0;
      this.db
        .prepare(
          'INSERT INTO replenishment_order_lines(id,order_id,product_id,name,unit,product_revision,stock_revision,ordered_base,estimated_cost_cents) VALUES(?,?,?,?,?,?,?,?,?)',
        )
        .run(
          randomUUID(),
          id,
          product.id,
          product.name,
          product.saleUnit,
          product.revision,
          stockRevision,
          line.quantityBase,
          line.estimatedCostCents ?? null,
        );
    }
    return this.detail(id);
  }
  private receive(v: z.infer<typeof OrderReceiveSchema>, actor: User) {
    const order = this.checked(v.orderId, v.expectedRevision);
    if (!['ORDERED', 'PARTIAL'].includes(order.status))
      throw new DomainError('VALIDATION', 'Confirmá el pedido antes de recibir.');
    const catalog = new CatalogRepository(this.db);
    const purchases = new PurchaseService(
      this.db,
      catalog,
      new DestinationStock(this.db, catalog, order.locationId),
      () => true,
      new DestinationLots(this.db, order.locationId),
      () => this.enabled('LOTS'),
      new SupplierAccountService(this.db, new CashService(this.db)),
      () => this.enabled('SUPPLIER_ACCOUNTS'),
    );
    const lines = v.lines.map((line) => {
      const original = order.lines.find((l) => l.id === line.lineId);
      if (!original) throw new DomainError('VALIDATION', 'El renglón no pertenece al pedido.');
      if (line.quantityBase > original.pendingBase) {
        if (!v.allowOverReceipt)
          throw new DomainError(
            'VALIDATION',
            'La cantidad supera el saldo; revisá y autorizá el excedente.',
          );
        this.db
          .prepare(
            'UPDATE replenishment_order_lines SET ordered_base=received_base+cancelled_base+? WHERE id=?',
          )
          .run(line.quantityBase, original.id);
      }
      return {
        lineId: line.lineId,
        productId: original.productId,
        quantityBase: line.quantityBase,
        unitCostCents: line.unitCostCents,
        expectedProductRevision: line.expectedProductRevision,
        ...(line.lotCode ? { lotCode: line.lotCode } : {}),
        ...(line.expiresOn !== undefined ? { expiresOn: line.expiresOn } : {}),
      };
    });
    const purchase = purchases.receive(
      {
        receiptKey: v.operationKey,
        supplierId: order.supplierId,
        businessDate: v.businessDate,
        lines,
      },
      actor,
    );
    for (const item of purchase.items) {
      this.db
        .prepare('UPDATE replenishment_order_lines SET received_base=received_base+? WHERE id=?')
        .run(item.quantityBase, item.lineId);
      this.db
        .prepare(
          'UPDATE purchase_items SET replenishment_order_line_id=?,replenishment_received_base=? WHERE id=?',
        )
        .run(item.lineId, item.quantityBase, item.id);
    }
    const pending = (
      this.db
        .prepare(
          'SELECT SUM(ordered_base-received_base-cancelled_base) AS n FROM replenishment_order_lines WHERE order_id=?',
        )
        .get(order.id) as { n: number }
    ).n;
    this.db
      .prepare('UPDATE replenishment_orders SET status=?,revision=revision+1 WHERE id=?')
      .run(pending ? 'PARTIAL' : 'RECEIVED', order.id);
    return this.detail(order.id);
  }
  private detail(id: string): ReplenishmentOrder {
    const row = this.db
      .prepare(
        'SELECT o.id,o.number,o.supplier_id AS supplierId,s.name AS supplierName,o.location_id AS locationId,l.name AS locationName,o.status,o.expected_date AS expectedDate,o.revision,o.created_at_utc AS createdAt FROM replenishment_orders o JOIN suppliers s ON s.id=o.supplier_id JOIN locations l ON l.id=o.location_id WHERE o.id=?',
      )
      .get(id) as Omit<ReplenishmentOrder, 'lines'> | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'El pedido no existe.');
    const lines = this.db
      .prepare(
        'SELECT l.id,l.product_id AS productId,l.name,l.unit,l.product_revision AS productRevision,p.revision AS currentProductRevision,l.ordered_base AS orderedBase,l.received_base AS receivedBase,l.cancelled_base AS cancelledBase,l.ordered_base-l.received_base-l.cancelled_base AS pendingBase,l.estimated_cost_cents AS estimatedCostCents FROM replenishment_order_lines l JOIN products p ON p.id=l.product_id WHERE l.order_id=? ORDER BY l.rowid',
      )
      .all(id) as ReplenishmentOrder['lines'];
    return { ...row, lines };
  }
  private list(v: z.infer<typeof OrderListSchema>, all = false) {
    const where =
      "(? IS NULL OR location_id=?) AND (? IS NULL OR supplier_id=?) AND (?='ALL' OR status=?)";
    const params = [
      v.locationId ?? null,
      v.locationId ?? null,
      v.supplierId ?? null,
      v.supplierId ?? null,
      v.status,
      v.status,
    ];
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS n FROM replenishment_orders WHERE ${where}`)
        .get(...params) as { n: number }
    ).n;
    const items = (
      this.db
        .prepare(
          `SELECT id FROM replenishment_orders WHERE ${where} ORDER BY number DESC LIMIT ? OFFSET ?`,
        )
        .all(...params, all ? 50000 : v.limit, all ? 0 : v.offset) as { id: string }[]
    ).map((r) => this.detail(r.id));
    return {
      items,
      total,
      nextOffset: v.offset + items.length < total ? v.offset + items.length : null,
    };
  }
  private suggest(v: z.infer<typeof SuggestionQuerySchema>, all = false): SuggestionPage {
    const asOf = v.asOf ?? today();
    const calendar = this.calendar(v.locationId);
    const open = (date: string) =>
      calendar.openWeekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay()) &&
      !calendar.closedDates.includes(date);
    let horizon = asOf,
      covered = 0;
    for (let n = 0; n < 730 && covered < v.coverageDays; n++) {
      horizon = plusDay(horizon, 1);
      if (calendar.revision ? open(horizon) : true) covered++;
    }
    const first = (
      this.db
        .prepare(
          "SELECT MIN(business_date) AS date FROM sale_orders WHERE location_id=? AND status='COMPLETED'",
        )
        .get(v.locationId) as { date: string | null }
    ).date;
    const start =
      first && first > plusDay(asOf, -v.referenceDays + 1)
        ? first
        : plusDay(asOf, -v.referenceDays + 1);
    let openDays = 0;
    if (first && calendar.revision)
      for (let date = start; date <= asOf; date = plusDay(date, 1)) if (open(date)) openDays++;
    const demand = new Map(
      (
        this.db
          .prepare(
            `SELECT id,SUM(qty) AS qty FROM (
              SELECT i.product_id AS id,i.quantity_base AS qty FROM sale_order_items i JOIN sale_orders s ON s.id=i.sale_id WHERE s.location_id=? AND s.status='COMPLETED' AND s.business_date BETWEEN ? AND ?
              UNION ALL
              SELECT i.product_id AS id,-i.quantity_base AS qty FROM sale_return_items i JOIN sale_returns r ON r.id=i.return_id JOIN sale_orders s ON s.id=r.sale_id WHERE s.location_id=? AND s.status='COMPLETED' AND r.business_date BETWEEN ? AND ?
            ) GROUP BY id`,
          )
          .all(v.locationId, start, asOf, v.locationId, start, asOf) as {
          id: string;
          qty: number;
        }[]
      ).map((r) => [r.id, r.qty]),
    );
    const incoming = new Map(
      (
        this.db
          .prepare(
            `SELECT l.product_id AS id,SUM(CASE WHEN o.expected_date BETWEEN ? AND ? THEN l.ordered_base-l.received_base-l.cancelled_base ELSE 0 END) AS incoming,SUM(CASE WHEN o.expected_date IS NULL THEN l.ordered_base-l.received_base-l.cancelled_base ELSE 0 END) AS undated,SUM(CASE WHEN o.expected_date<? THEN l.ordered_base-l.received_base-l.cancelled_base ELSE 0 END) AS overdue FROM replenishment_order_lines l JOIN replenishment_orders o ON o.id=l.order_id WHERE o.location_id=? AND o.status IN ('ORDERED','PARTIAL') GROUP BY l.product_id`,
          )
          .all(asOf, horizon, asOf, v.locationId) as {
          id: string;
          incoming: number;
          undated: number;
          overdue: number;
        }[]
      ).map((r) => [r.id, r]),
    );
    const transit = new Map(
      (
        this.db
          .prepare(
            "SELECT i.product_id AS id,SUM(i.dispatched_base) AS qty FROM stock_transfer_items i JOIN stock_transfers t ON t.id=i.transfer_id WHERE t.to_location_id=? AND t.status='IN_TRANSIT' GROUP BY i.product_id",
          )
          .all(v.locationId) as { id: string; qty: number }[]
      ).map((r) => [r.id, r.qty]),
    );
    const other = new Map(
      (
        this.db
          .prepare(
            'SELECT product_id AS id,SUM(MAX(quantity_base,0)) AS qty FROM location_inventory_balances WHERE location_id<>? GROUP BY product_id',
          )
          .all(v.locationId) as { id: string; qty: number }[]
      ).map((r) => [r.id, r.qty]),
    );
    const blocked = new Map(
      (
        this.db
          .prepare(
            "SELECT l.product_id AS id,SUM(b.quantity_base) AS qty FROM inventory_lots l JOIN location_lot_balances b ON b.lot_id=l.id WHERE b.location_id=? AND (l.status='BLOCKED' OR l.expires_on<?) GROUP BY l.product_id",
          )
          .all(v.locationId, asOf) as { id: string; qty: number }[]
      ).map((r) => [r.id, r.qty]),
    );
    const lastPurchases = new Map(
      (
        this.db
          .prepare(
            "SELECT i.product_id AS id,p.supplier_id AS supplierId,i.unit_cost_cents AS cost FROM purchase_items i JOIN purchases p ON p.id=i.purchase_id JOIN suppliers s ON s.id=p.supplier_id WHERE p.status='RECEIVED' AND s.active=1 ORDER BY p.number",
          )
          .all() as { id: string; supplierId: string; cost: number }[]
      ).map((r) => [r.id, r]),
    );
    const rules = new Map(
      (
        this.db
          .prepare(
            'SELECT product_id AS id,revision,purchase_multiple_base AS multiple FROM replenishment_product_rules',
          )
          .all() as { id: string; revision: number; multiple: number }[]
      ).map((r) => [r.id, r]),
    );
    const products = this.db
      .prepare(
        `SELECT p.id,p.name,p.sale_unit AS unit,p.revision,p.min_stock_base AS minimum,p.stock_initialized AS initialized,b.quantity_base AS quantity,b.revision AS stockRevision FROM products p LEFT JOIN location_inventory_balances b ON b.product_id=p.id AND b.location_id=? WHERE p.active=1 AND p.track_stock=1 AND (p.name LIKE ? OR p.sku LIKE ?) ${v.productIds.length ? `AND p.id IN (${v.productIds.map(() => '?').join(',')})` : ''} ORDER BY p.name,p.id`,
      )
      .all(v.locationId, `%${v.query}%`, `%${v.query}%`, ...v.productIds) as {
      id: string;
      name: string;
      unit: 'UNIT' | 'KG';
      revision: number;
      minimum: number;
      initialized: number;
      quantity: number | null;
      stockRevision: number | null;
    }[];
    const computed: Suggestion[] = products.map((p) => {
      const available =
        p.initialized && p.quantity !== null
          ? Math.max(0, p.quantity - (blocked.get(p.id) ?? 0))
          : null;
      const daily = openDays ? Math.max(0, demand.get(p.id) ?? 0) / openDays : null;
      const target = Math.ceil(Math.max(p.minimum, daily === null ? 0 : daily * v.coverageDays));
      const pending = incoming.get(p.id);
      // Transfers have no ETA in the existing contract; show them for review, never assume arrival.
      const multiple = rules.get(p.id)?.multiple ?? 1;
      const suggested =
        available === null || (!p.minimum && daily === null)
          ? null
          : Math.ceil(Math.max(0, target - available - (pending?.incoming ?? 0)) / multiple) *
            multiple;
      return {
        productId: p.id,
        name: p.name,
        unit: p.unit,
        productRevision: p.revision,
        stockRevision: p.stockRevision ?? 0,
        availableBase: available,
        targetBase: target,
        incomingBase: pending?.incoming ?? 0,
        undatedBase: pending?.undated ?? 0,
        overdueBase: pending?.overdue ?? 0,
        transitBase: transit.get(p.id) ?? 0,
        otherLocationBase: other.get(p.id) ?? 0,
        suggestedBase: suggested,
        purchaseMultipleBase: multiple,
        purchaseRuleRevision: rules.get(p.id)?.revision ?? 0,
        dailyDemand: daily,
        observedOpenDays: openDays,
        reason:
          available === null
            ? 'Revisar conteo'
            : daily === null
              ? 'Sin historial'
              : (pending?.incoming ?? 0) > 0
                ? 'Pedido en camino'
                : available < p.minimum
                  ? 'Bajo mínimo'
                  : 'Se vende seguido',
        supplierId: lastPurchases.get(p.id)?.supplierId ?? null,
        estimatedCostCents: lastPurchases.get(p.id)?.cost ?? null,
      };
    });
    const items = v.onlyNeeded
      ? computed.filter((p) => p.suggestedBase === null || p.suggestedBase > 0)
      : computed;
    return {
      items: all ? items : items.slice(v.offset, v.offset + v.limit),
      total: items.length,
      locationId: v.locationId,
      asOf,
      horizon,
      calendarConfigured: calendar.revision > 0,
    };
  }
}
