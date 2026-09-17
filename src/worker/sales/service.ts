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
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const summarySql = `SELECT id,number,checkout_key AS checkoutKey,status,created_at_utc AS createdAt,business_date AS businessDate,local_month AS localMonth,subtotal_cents AS subtotalCents,discount_cents AS discountCents,total_cents AS totalCents FROM sales`;
const CursorSchema = z.strictObject({ number: z.number().int().positive(), filter: z.string() });
export class SalesService {
  private readonly ledger: StockRepository;
  constructor(
    private readonly db: Database.Database,
    private readonly catalog: CatalogRepository,
    private readonly stock: StockService,
    private readonly drafts: DraftRepository,
  ) {
    this.ledger = new StockRepository(db);
  }
  detail(rawId: string): SaleDetail {
    const id = IdSchema.parse(rawId);
    const sale = this.db.prepare(`${summarySql} WHERE id=?`).get(id) as SaleSummary | undefined;
    if (!sale) throw new DomainError('NOT_FOUND', 'La venta no existe.');
    const discount = this.db.prepare('SELECT discount_json FROM sales WHERE id=?').get(id) as {
      discount_json: string;
    };
    return {
      ...sale,
      discount: DraftBodySchema.shape.discount.parse(JSON.parse(discount.discount_json)),
      items: this.db
        .prepare(
          'SELECT id,line_id AS lineId,product_id AS productId,sku,barcode,name,unit,unit_price_cents AS unitPriceCents,quantity_base AS quantityBase,gross_cents AS grossCents,discount_cents AS discountCents,net_cents AS netCents FROM sale_items WHERE sale_id=? ORDER BY position',
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
  complete(raw: CheckoutInput): SaleDetail {
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
        const draft = this.drafts.get();
        const body = DraftBodySchema.parse({
          checkoutKey: input.checkoutKey,
          lines: input.lines,
          discount: input.discount,
        });
        if (
          draft
            ? draft.revision !== input.expectedDraftRevision ||
              JSON.stringify(draft.body) !== JSON.stringify(body)
            : input.expectedDraftRevision !== undefined
        )
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recuperalo antes de cerrar la venta.',
          );
        const products = input.lines.map((line) => {
          const p = this.catalog.get(line.productId);
          if (!p.active) throw new DomainError('INACTIVE', `El producto ${p.name} está inactivo.`);
          if (
            p.revision !== line.expectedProductRevision ||
            p.priceCents !== line.expectedPriceCents
          )
            throw new DomainError(
              'REVISION_CONFLICT',
              `Cambió el producto ${p.name}. Revisá su precio antes de cobrar.`,
            );
          return p;
        });
        const totals = calculateSale(
          products.map((p, i) => ({
            unit: p.saleUnit,
            priceCents: p.priceCents,
            quantityBase: input.lines[i]!.quantityBase,
          })),
          input.discount,
        );
        const payments = validatePayments(input.payments, totals.totalCents);
        const id = randomUUID();
        const now = new Date().toISOString();
        const date = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(now));
        const number = (
          this.db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM sales').get() as { n: number }
        ).n;
        this.db
          .prepare('INSERT INTO sales VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
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
          );
        for (const [i, line] of input.lines.entries()) {
          const p = products[i]!;
          const itemId = randomUUID();
          const amount = totals.lines[i]!;
          this.db
            .prepare('INSERT INTO sale_items VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
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
            );
          if (p.trackStock && p.stockInitialized)
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
            );
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
        if (draft) this.db.prepare("DELETE FROM checkout_drafts WHERE id='main'").run();
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
  ) {
    const old = this.ledger.balance(productId);
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
      .prepare('INSERT INTO sale_events VALUES (?,?,?,?,?,?,?,?)')
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
  void(raw: VoidInput): SaleDetail {
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
        if (this.previewVoid(sale.id).countedAfterSale.length && !input.acknowledgeRecount)
          throw new DomainError(
            'VALIDATION',
            'Hubo un conteo posterior. Confirmá la reposición antes de anular.',
          );
        const movements = this.db
          .prepare(
            "SELECT product_id,sale_item_id,delta_base FROM stock_movements WHERE sale_id=? AND kind='SALE' ORDER BY sequence",
          )
          .all(sale.id) as { product_id: string; sale_item_id: string; delta_base: number }[];
        const now = new Date().toISOString();
        for (const m of movements)
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
          );
        this.db.prepare("UPDATE sales SET status='VOIDED' WHERE id=?").run(sale.id);
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
