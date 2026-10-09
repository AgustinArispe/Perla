import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { DraftBodySchema, IdSchema } from '../../shared/catalog';
import { CheckoutSchema, VoidSchema, SalesSearchSchema } from '../../shared/sales';
import type {
  CheckoutInput,
  VoidInput,
  SalesSearchInput,
  SaleDetail,
  SaleSummary,
  SalePage,
  SaleQuote,
  VoidPreview,
} from '../../shared/sales';
import { DomainError } from '../../shared/errors';
import { calculateSale } from '../../domain/sale';
import { validatePayments } from '../../domain/payment';
import { nextBalance, stockState } from '../../domain/inventory';
import { CatalogRepository } from '../products/repository';
import { StockService } from '../stock/service';
import { StockRepository } from '../stock/repository';
import { DraftRepository } from '../drafts';
import { CostService } from '../costs/service';
import { costForQuantity } from '../../domain/costs';
import type { User } from '../../shared/auth';
import type { LotService } from '../lots/service';
import type { PromotionService } from '../promotions/service';
import type { CustomerService } from '../customers/service';
import { applyPromotions, type PromotionApplication } from '../../domain/promotions';
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const summarySql = `SELECT id,number,checkout_key AS checkoutKey,status,created_at_utc AS createdAt,business_date AS businessDate,local_month AS localMonth,subtotal_cents AS subtotalCents,discount_cents AS discountCents,total_cents AS totalCents FROM sales`;
const CursorSchema = z.strictObject({ number: z.number().int().positive(), filter: z.string() });
export class SalesService {
  private readonly ledger: StockRepository;
  private readonly costs: CostService;
  constructor(
    private readonly db: Database.Database,
    private readonly catalog: CatalogRepository,
    private readonly stock: StockService,
    private readonly drafts: DraftRepository,
    private readonly isStockControlEnabled: () => boolean = () => true,
    private readonly lots?: LotService,
    private readonly isLotsEnabled: () => boolean = () => false,
    private readonly promotions?: PromotionService,
    private readonly isPromotionsEnabled: () => boolean = () => false,
    private readonly customers?: CustomerService,
    private readonly isCustomerCreditEnabled: () => boolean = () => false,
  ) {
    this.ledger = new StockRepository(db);
    this.costs = new CostService(db);
  }
  detail(rawId: string): SaleDetail {
    const id = IdSchema.parse(rawId);
    const sale = this.db.prepare(`${summarySql} WHERE id=?`).get(id) as SaleSummary | undefined;
    if (!sale) throw new DomainError('NOT_FOUND', 'La venta no existe.');
    const discount = this.db
      .prepare('SELECT discount_json,actor_user_id,actor_name FROM sales WHERE id=?')
      .get(id) as {
      discount_json: string;
      actor_user_id: string | null;
      actor_name: string | null;
    };
    return {
      ...sale,
      ...(this.db.prepare('SELECT customer_id AS customerId,customer_name AS customerName,on_account_cents AS onAccountCents FROM sales WHERE id=?').get(id) as {customerId:string|null;customerName:string|null;onAccountCents:number}),
      actorUserId: discount.actor_user_id,
      actorName: discount.actor_name,
      discount: DraftBodySchema.shape.discount.parse(JSON.parse(discount.discount_json)),
      promotions: JSON.parse(
        (this.db.prepare('SELECT promotions_json AS value FROM sales WHERE id=?').get(id) as { value: string }).value,
      ) as SaleQuote['promotions'],
      items: this.db
        .prepare(
          'SELECT id,line_id AS lineId,product_id AS productId,sku,barcode,name,unit,unit_price_cents AS unitPriceCents,quantity_base AS quantityBase,gross_cents AS grossCents,discount_cents AS discountCents,promotion_discount_cents AS promotionDiscountCents,manual_discount_cents AS manualDiscountCents,net_cents AS netCents,cost_method AS costMethod,cost_rate_micros_per_base AS costRateMicrosPerBase,cost_cents AS costCents,cost_effective_at_utc AS costEffectiveAt,category_name AS categoryName FROM sale_items WHERE sale_id=? ORDER BY position',
        )
        .all(id) as SaleDetail['items'],
      payments: (
        this.db
          .prepare(
            'SELECT method,amount_cents AS amountCents,tendered_cents AS tenderedCents,change_cents AS changeCents FROM sale_payments WHERE sale_id=? ORDER BY position',
          )
          .all(id) as (SaleDetail['payments'][number] & { tenderedCents: number | null })[]
      ).map((p) =>
        p.tenderedCents === null
          ? { method: p.method, amountCents: p.amountCents, changeCents: p.changeCents }
          : p,
      ),
      events: this.db
        .prepare(
          'SELECT kind,reason,created_at_utc AS createdAt,clock_warning AS clockWarning FROM sale_events WHERE sale_id=? ORDER BY rowid',
        )
        .all(id) as SaleDetail['events'],
    };
  }
  findByCheckoutKey(key: string): SaleDetail | null {
    const row = this.db
      .prepare('SELECT id FROM sales WHERE checkout_key=?')
      .get(IdSchema.parse(key)) as { id: string } | undefined;
    return row ? this.detail(row.id) : null;
  }
  quote(raw: z.infer<typeof DraftBodySchema>): SaleQuote {
    return this.quoteAt(raw, new Date().toISOString()).quote;
  }
  private quoteAt(raw: z.infer<typeof DraftBodySchema>, now: string) {
    const input = DraftBodySchema.parse(raw);
    if (new Set(input.lines.map((line) => line.lineId)).size !== input.lines.length)
      throw new DomainError('VALIDATION', 'La venta contiene renglones repetidos.');
    const products = input.lines.map((line) => {
      const product = this.catalog.get(line.productId);
      if (!product.active)
        throw new DomainError('INACTIVE', `El producto ${product.name} está inactivo.`);
      if (
        product.revision !== line.expectedProductRevision ||
        product.priceCents !== line.expectedPriceCents
      )
        throw new DomainError(
          'REVISION_CONFLICT',
          `Cambió el producto ${product.name}. Revisá su precio antes de cobrar.`,
        );
      return product;
    });
    const pricingLines = products.map((product, index) => ({
      lineId: input.lines[index]!.lineId,
      productId: product.id,
      unit: product.saleUnit,
      priceCents: product.priceCents,
      quantityBase: input.lines[index]!.quantityBase,
    }));
    const promotionResult =
      input.discount.type === 'NONE' && this.isPromotionsEnabled() && this.promotions
        ? applyPromotions(
            pricingLines,
            this.promotions.activeRules(products.map((product) => product.id), now),
          )
        : null;
    const calculated = promotionResult ?? calculateSale(pricingLines, input.discount);
    const lines = calculated.lines.map((line, index) => ({
      lineId: input.lines[index]!.lineId,
      grossCents: line.grossCents,
      discountCents: line.discountCents,
      netCents: line.netCents,
    }));
    const promotions = promotionResult?.applications ?? [];
    const quoteWithoutHash = {
      subtotalCents: calculated.subtotalCents,
      discountCents: calculated.discountCents,
      totalCents: calculated.totalCents,
      lines,
      promotions,
    };
    return {
      products,
      promotionResult,
      quote: { quoteHash: hash({ input, ...quoteWithoutHash }), ...quoteWithoutHash } satisfies SaleQuote,
    };
  }
  complete(raw: CheckoutInput, actor?: User): SaleDetail {
    const input = CheckoutSchema.parse(raw);
    const payloadHash = hash(input);
    return this.db
      .transaction(() => {
        const old = this.db
          .prepare('SELECT id,payload_hash FROM sales WHERE checkout_key=?')
          .get(input.checkoutKey) as { id: string; payload_hash: string } | undefined;
        if (old) {
          if (old.payload_hash !== payloadHash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador ya corresponde a otra venta.',
            );
          return this.detail(old.id);
        }
        const draft = this.drafts.get(actor?.id);
        const body = DraftBodySchema.parse({
          checkoutKey: input.checkoutKey,
          lines: input.lines,
          discount: input.discount,
        });
        if (
          input.expectedDraftRevision !== undefined &&
          (!draft ||
            draft.revision !== input.expectedDraftRevision ||
            JSON.stringify(draft.body) !== JSON.stringify(body))
        )
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recuperalo antes de cerrar la venta.',
          );
        const now = new Date().toISOString();
        const date = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
        }).format(new Date(now));
        const priced = this.quoteAt(body, now);
        const { products, promotionResult } = priced;
        const totals = priced.quote;
        if (input.expectedQuoteHash && input.expectedQuoteHash !== totals.quoteHash)
          throw new DomainError(
            'REVISION_CONFLICT',
            'Las promociones cambiaron. Revisá el nuevo total antes de cobrar.',
          );
        if (input.onAccountCents > totals.totalCents)
          throw new DomainError('VALIDATION', 'El importe a cuenta supera el total de la venta.');
        if (input.onAccountCents > 0 && !input.customerId)
          throw new DomainError('VALIDATION', 'Elegí un cliente para vender a cuenta.');
        const customer = input.customerId ? this.customers?.get(input.customerId) : null;
        if (input.customerId && !customer)
          throw new DomainError('NOT_FOUND', 'El cliente no existe.');
        if (customer && !customer.active)
          throw new DomainError('INACTIVE', 'El cliente está inactivo.');
        const payments = validatePayments(input.payments, totals.totalCents - input.onAccountCents);
        const id = randomUUID();
        const number = (
          this.db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM sales').get() as { n: number }
        ).n;
        this.db
          .prepare(
            'INSERT INTO sales (id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json,customer_id,customer_name,on_account_cents,location_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .run(
            id,
            number,
            input.checkoutKey,
            payloadHash,
            'COMPLETED',
            now,
            date,
            date.slice(0, 7),
            totals.subtotalCents,
            totals.discountCents,
            totals.totalCents,
            JSON.stringify(input.discount),
            customer?.id ?? null,
            customer?.name ?? null,
            input.onAccountCents,
            input.locationId ?? null,
          );
        if(input.onAccountCents>0)this.customers!.recordSale({id,customerId:customer!.id,amountCents:input.onAccountCents},this.isCustomerCreditEnabled());
        const saleItemIds = new Map<string, string>();
        for (const [i, line] of input.lines.entries()) {
          const p = products[i]!;
          const itemId = randomUUID();
          const amount = totals.lines[i]!;
          saleItemIds.set(line.lineId, itemId);
          const currentStock =
            this.isStockControlEnabled() && p.trackStock ? this.stock.get(p.id).quantityBase : null;
          const cost =
            this.isStockControlEnabled() && p.trackStock
              ? this.costs.getUsable(p.id, currentStock)
              : this.costs.get(p.id);
          this.db
            .prepare(
              'INSERT INTO sale_items (id,sale_id,line_id,position,product_id,sku,barcode,name,unit,unit_price_cents,quantity_base,gross_cents,discount_cents,net_cents,cost_method,cost_rate_micros_per_base,cost_cents,cost_effective_at_utc,category_name) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            )
            .run(
              itemId,
              id,
              line.lineId,
              i,
              p.id,
              p.sku,
              p.barcode,
              p.name,
              p.saleUnit,
              p.priceCents,
              line.quantityBase,
              amount.grossCents,
              amount.discountCents,
              amount.netCents,
              cost?.method ?? null,
              cost?.rateMicrosPerBase ?? null,
              cost ? costForQuantity(line.quantityBase, cost.rateMicrosPerBase) : null,
              cost?.effectiveAt ?? null,
              p.category,
            );
          this.db.prepare('UPDATE sale_items SET promotion_discount_cents=?,manual_discount_cents=? WHERE id=?').run(
            promotionResult ? amount.discountCents : 0,
            promotionResult ? 0 : amount.discountCents,
            itemId,
          );
          if (this.isStockControlEnabled() && p.trackStock && p.stockInitialized)
            this.move(
              p.id,
              -line.quantityBase,
              'SALE',
              id,
              itemId,
              input.negativeStockOverride?.reason ?? 'Venta',
              payloadHash,
              Boolean(input.negativeStockOverride),
              now,
              input.locationId,
            );
          if (this.isLotsEnabled() && this.lots?.enabled(p.id)) {
            if (!actor)
              throw new DomainError('FORBIDDEN', 'La asignación de lotes requiere un usuario.');
            this.lots.allocate({
              productId: p.id,
              quantityBase: line.quantityBase,
              businessDate: date,
              operationKey: itemId,
              actor,
              saleItemId: itemId,
              ...(input.locationId ? { locationId: input.locationId } : {}),
            });
          }
        }
        if (promotionResult?.applications.length) {
          const snapshots: unknown[] = [];
          for (const application of promotionResult.applications as PromotionApplication[]) {
            const salePromotionId = randomUUID();
            const snapshot = JSON.stringify(application);
            this.db.prepare('INSERT INTO sale_promotions VALUES (?,?,?,?,?,?,?)').run(
              salePromotionId, id, application.promotionId, application.name, application.revision, application.discountCents, snapshot,
            );
            for (const allocation of application.allocations)
              this.db.prepare('INSERT INTO sale_promotion_allocations VALUES (?,?,?,?)').run(
                salePromotionId, saleItemIds.get(allocation.lineId)!, allocation.quantityBase, allocation.discountCents,
              );
            snapshots.push(application);
          }
          this.db.prepare('UPDATE sales SET promotions_json=? WHERE id=?').run(JSON.stringify(snapshots), id);
        }
        for (const [i, p] of payments.entries())
          this.db
            .prepare('INSERT INTO sale_payments VALUES (?,?,?,?,?,?,?)')
            .run(
              randomUUID(),
              id,
              i,
              p.method,
              p.amountCents,
              p.tenderedCents ?? null,
              p.changeCents,
            );
        this.event(
          id,
          'COMPLETED',
          input.checkoutKey,
          payloadHash,
          input.negativeStockOverride?.reason ?? 'Venta finalizada',
          now,
        );
        if (draft) this.db.prepare('DELETE FROM checkout_drafts WHERE id=?').run(actor?.id ?? 'main');
        return this.detail(id);
      })
      .immediate();
  }
  private move(
    productId: string,
    delta: number,
    kind: 'SALE' | 'VOID',
    saleId: string,
    saleItemId: string,
    reason: string,
    payloadHash: string,
    allowNegative: boolean,
    timestamp: string,
    locationId?: string,
  ) {
    const old = this.ledger.balance(productId, locationId) ??
      (locationId ? { quantity_base: 0, revision: 0 } : undefined);
    if (!old) throw new DomainError('BACKUP_INVALID', 'Falta el saldo de stock de un producto.');
    const next = nextBalance(old.quantity_base, delta, allowNegative);
    const current = this.stock.get(productId);
    const result = {
      ...current,
      quantityBase: current.trackStock && current.initialized ? next : null,
      revision: old.revision + 1,
      state: stockState(current.trackStock, current.initialized, next, current.minStockBase),
    };
    this.ledger.appendWithinTransaction({
      productId,
      deltaBase: delta,
      nextBase: next,
      revision: old.revision + 1,
      kind,
      reason,
      operationKey: randomUUID(),
      hash: payloadHash,
      result,
      saleId,
      saleItemId,
      timestamp,
      ...(locationId ? { locationId } : {}),
    });
  }
  private event(
    saleId: string,
    kind: 'COMPLETED' | 'VOIDED',
    key: string,
    payloadHash: string,
    reason: string,
    now: string,
  ) {
    const last = this.db
      .prepare(
        'SELECT MAX(t) AS last FROM (SELECT MAX(created_at_utc) AS t FROM sale_events UNION ALL SELECT MAX(created_at_utc) FROM stock_movements)',
      )
      .get() as { last: string | null };
    const warning =
      last.last && last.last > now
        ? 'El reloj de la PC retrocedió respecto del último registro. Revisá la fecha y hora.'
        : null;
    this.db
      .prepare(
        'INSERT INTO sale_events (id,sale_id,kind,reason,operation_key,payload_hash,created_at_utc,clock_warning) VALUES (?,?,?,?,?,?,?,?)',
      )
      .run(randomUUID(), saleId, kind, reason, key, payloadHash, now, warning);
  }
  previewVoid(saleId: string): VoidPreview {
    this.detail(saleId);
    return {
      countedAfterSale: this.db
        .prepare(
          `SELECT DISTINCT s.product_id AS productId,i.name FROM stock_movements s JOIN sale_items i ON i.id=s.sale_item_id WHERE s.sale_id=? AND s.kind='SALE' AND EXISTS (SELECT 1 FROM stock_movements c WHERE c.product_id=s.product_id AND c.sequence>s.sequence AND c.kind IN ('OPENING','ADJUSTMENT'))`,
        )
        .all(saleId) as VoidPreview['countedAfterSale'],
    };
  }
  void(raw: VoidInput, actor?: User): SaleDetail {
    const input = VoidSchema.parse(raw);
    const payloadHash = hash(input);
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare('SELECT sale_id,payload_hash FROM sale_events WHERE operation_key=?')
          .get(input.operationKey) as { sale_id: string; payload_hash: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== payloadHash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador ya corresponde a otra operación.',
            );
          return this.detail(replay.sale_id);
        }
        const sale = this.detail(input.saleId);
        if (sale.status === 'VOIDED') return sale;
        const returns = this.db
          .prepare("SELECT COUNT(*) AS n FROM sale_returns WHERE sale_id=? AND status='CONFIRMED'")
          .get(sale.id) as { n: number };
        if (returns.n > 0)
          throw new DomainError(
            'VALIDATION',
            'La venta ya tiene devoluciones parciales. Devolvé únicamente las cantidades restantes.',
          );
        if (this.previewVoid(sale.id).countedAfterSale.length && !input.acknowledgeRecount)
          throw new DomainError(
            'VALIDATION',
            'Hubo un conteo posterior. Confirmá la reposición antes de anular.',
          );
        const movements = this.db
          .prepare(
            "SELECT product_id,sale_item_id,delta_base,location_id FROM stock_movements WHERE sale_id=? AND kind='SALE' ORDER BY sequence",
          )
          .all(sale.id) as { product_id: string; sale_item_id: string; delta_base: number; location_id:string|null }[];
        const now = new Date().toISOString();
        for (const m of movements) {
          this.move(
            m.product_id,
            -m.delta_base,
            'VOID',
            sale.id,
            m.sale_item_id,
            input.reason,
            payloadHash,
            true,
            now,
            m.location_id ?? undefined,
          );
          if (actor && this.isLotsEnabled() && this.lots?.enabled(m.product_id))
            this.lots.restoreSaleItem({
              saleItemId: m.sale_item_id,
              quantityBase: -m.delta_base,
              operationKey: randomUUID(),
              actor,
            });
        }
        this.db.prepare("UPDATE sales SET status='VOIDED' WHERE id=?").run(sale.id);
        this.customers?.reverseSale(sale.id,input.reason);
        this.event(sale.id, 'VOIDED', input.operationKey, payloadHash, input.reason, now);
        return this.detail(sale.id);
      })
      .immediate();
  }
  list(raw: SalesSearchInput): SalePage {
    const input = SalesSearchSchema.parse(raw);
    const filter = JSON.stringify([input.fromDate ?? '', input.toDate ?? '', input.status]);
    let after: number | null = null;
    if (input.cursor) {
      try {
        const cursor = CursorSchema.parse(
          JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')),
        );
        if (cursor.filter !== filter) throw new Error();
        after = cursor.number;
      } catch {
        throw new DomainError(
          'VALIDATION',
          'La página solicitada no es válida para estos filtros.',
        );
      }
    }
    const where =
      " WHERE (? IS NULL OR business_date>=?) AND (? IS NULL OR business_date<=?) AND (?='ALL' OR status=?)";
    const args = [
      input.fromDate ?? null,
      input.fromDate ?? null,
      input.toDate ?? null,
      input.toDate ?? null,
      input.status,
      input.status,
    ];
    const total = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM sales${where}`).get(...args) as { n: number }
    ).n;
    const rows = this.db
      .prepare(`${summarySql}${where} AND (? IS NULL OR number<?) ORDER BY number DESC LIMIT ?`)
      .all(...args, after, after, input.limit + 1) as SaleSummary[];
    const items = rows.slice(0, input.limit);
    return {
      items,
      total,
      nextCursor:
        rows.length > input.limit
          ? Buffer.from(JSON.stringify({ number: items.at(-1)!.number, filter })).toString(
              'base64url',
            )
          : null,
    };
  }
}
