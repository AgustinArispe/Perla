import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { DomainError } from '../../shared/errors';
import type { User } from '../../shared/auth';
import { DraftBodySchema } from '../../shared/catalog';
import type { CheckoutInput, SaleDetail, SaleQuote } from '../../shared/sales';
import {
  PreparedOrderCreateSchema,
  PreparedOrderListSchema,
  PreparedOrderCancelSchema,
  type PreparedOrder,
  type PreparedOrderCreate,
  type PreparedOrderList,
  type PreparedOrderCancel,
} from '../../shared/prepared-orders';
import { FeatureService } from '../features/service';
import { BusinessUnitService } from '../business-units/service';
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const select = `SELECT o.*,l.name location_name,s.number sale_number FROM prepared_orders o JOIN locations l ON l.id=o.location_id LEFT JOIN sales s ON s.id=o.sale_id`;
type Row = {
  business_unit_id: string;
  business_unit_name: string;
  id: string;
  number: number;
  status: PreparedOrder['status'];
  revision: number;
  customer_name: string;
  note: string;
  location_id: string;
  location_name: string;
  body_json: string;
  quote_json: string;
  items_json: string;
  created_at_utc: string;
  prepared_by_name: string;
  sale_id: string | null;
  sale_number: number | null;
  paid_at_utc: string | null;
  paid_by_name: string | null;
  cancelled_at_utc: string | null;
  cancelled_by_name: string | null;
  cancel_reason: string | null;
  cancel_key: string | null;
  cancel_hash: string | null;
};
const render = (r: Row): PreparedOrder => ({
  businessUnitId: r.business_unit_id,
  businessUnitName: r.business_unit_name,
  id: r.id,
  number: r.number,
  status: r.status,
  revision: r.revision,
  customerName: r.customer_name,
  note: r.note,
  locationId: r.location_id,
  locationName: r.location_name,
  body: JSON.parse(r.body_json),
  quote: JSON.parse(r.quote_json),
  items: JSON.parse(r.items_json),
  createdAt: r.created_at_utc,
  preparedBy: r.prepared_by_name,
  saleId: r.sale_id,
  saleNumber: r.sale_number,
  paidAt: r.paid_at_utc,
  paidBy: r.paid_by_name,
  cancelledAt: r.cancelled_at_utc,
  cancelledBy: r.cancelled_by_name,
  cancelReason: r.cancel_reason,
});
export class PreparedOrderService {
  constructor(
    private readonly db: Database.Database,
    private readonly quote: (body: PreparedOrder['body']) => SaleQuote,
  ) {}
  private authorize(actor: User, create = false) {
    if (!['SELLER', 'SUPERVISOR', 'OWNER', 'ADMIN'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Tu perfil no puede usar órdenes.');
    if (create && !new FeatureService(this.db).isEnabled('PREPARED_ORDERS'))
      throw new DomainError('FORBIDDEN', 'Órdenes para caja está desactivado.');
  }
  byNumber(number: number, actor: User) {
    this.authorize(actor);
    const row = this.db.prepare(`${select} WHERE o.number=?`).get(number) as Row | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'La orden no existe.');
    return render(row);
  }
  list(raw: PreparedOrderList, actor: User) {
    this.authorize(actor);
    const input = PreparedOrderListSchema.parse(raw);
    const where =
      [
        ...(input.status ? ['o.status=@status'] : []),
        ...(input.number ? ['o.number=@number'] : []),
      ].join(' AND ') || '1=1';
    const args = { ...input };
    const items = (
      this.db
        .prepare(`${select} WHERE ${where} ORDER BY o.number DESC LIMIT @limit OFFSET @offset`)
        .all(args) as Row[]
    ).map(render);
    const total = (
      this.db.prepare(`SELECT count(*) n FROM prepared_orders o WHERE ${where}`).get(args) as {
        n: number;
      }
    ).n;
    return { items, total };
  }
  create(raw: PreparedOrderCreate, actor: User): PreparedOrder {
    this.authorize(actor, true);
    const input = PreparedOrderCreateSchema.parse(raw);
    const work = () => {
      const payloadHash = hash(input);
      const old = this.db
        .prepare('SELECT number,payload_hash FROM prepared_orders WHERE operation_key=?')
        .get(input.operationKey) as { number: number; payload_hash: string } | undefined;
      if (old) {
        if (old.payload_hash !== payloadHash)
          throw new DomainError(
            'IDEMPOTENCY_CONFLICT',
            'La clave de preparación ya tiene otros datos.',
          );
        return this.byNumber(old.number, actor);
      }
      const body = DraftBodySchema.parse({ ...input.body, checkoutKey: randomUUID() });
      const quote = this.quote(body);
      const items = body.lines.map((line) => {
        const p = this.db
          .prepare('SELECT name,sku,sale_unit unit FROM products WHERE id=?')
          .get(line.productId) as { name: string; sku: string; unit: 'UNIT' | 'KG' };
        return {
          ...p,
          productId: line.productId,
          quantityBase: line.quantityBase,
          unitPriceCents: line.expectedPriceCents,
        };
      });
      const location = this.db
        .prepare('SELECT id FROM locations WHERE is_default=1 AND active=1')
        .get() as { id: string } | undefined;
      if (!location)
        throw new DomainError('VALIDATION', 'Configurá una ubicación principal activa.');
      const number = (
        this.db.prepare('SELECT COALESCE(MAX(number),0)+1 n FROM prepared_orders').get() as {
          n: number;
        }
      ).n;
      const unit = new BusinessUnitService(this.db).resolve(actor);
      this.db
        .prepare(
          `INSERT INTO prepared_orders(id,number,status,operation_key,payload_hash,checkout_key,location_id,customer_name,note,body_json,quote_json,items_json,created_at_utc,prepared_by,prepared_by_name,business_unit_id,business_unit_name) VALUES(?,?,'READY',?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          randomUUID(),
          number,
          input.operationKey,
          payloadHash,
          body.checkoutKey,
          location.id,
          input.customerName,
          input.note,
          JSON.stringify(body),
          JSON.stringify(quote),
          JSON.stringify(items),
          new Date().toISOString(),
          actor.id,
          actor.name,
          unit.id,
          unit.name,
        );
      return this.byNumber(number, actor);
    };
    return this.db.inTransaction ? work() : this.db.transaction(work).immediate();
  }
  settle(
    input: CheckoutInput,
    actor: User,
    complete: (input: CheckoutInput) => SaleDetail,
  ): SaleDetail {
    const work = () => this.settlePrepared(input, actor, complete);
    return this.db.inTransaction ? work() : this.db.transaction(work).immediate();
  }
  private settlePrepared(
    input: CheckoutInput,
    actor: User,
    complete: (input: CheckoutInput) => SaleDetail,
  ): SaleDetail {
    const matching = this.db
      .prepare(`${select} WHERE o.checkout_key=? OR o.id=?`)
      .all(input.checkoutKey, input.preparedOrderId ?? '') as Row[];
    if (!input.preparedOrderId) {
      if (matching.length)
        throw new DomainError('VALIDATION', 'Esta venta debe cobrarse desde la orden preparada.');
      return complete(input);
    }
    this.authorize(actor);
    const row = matching.find((r) => r.id === input.preparedOrderId);
    if (!row || matching.length !== 1)
      throw new DomainError('VALIDATION', 'La orden no corresponde a esta operación.');
    const order = render(row);
    if (order.status === 'CANCELLED')
      throw new DomainError('VALIDATION', 'La orden está cancelada.');
    const body = DraftBodySchema.parse({
      checkoutKey: input.checkoutKey,
      lines: input.lines,
      discount: input.discount,
    });
    if (JSON.stringify(body) !== JSON.stringify(order.body))
      throw new DomainError(
        'VALIDATION',
        'Los artículos, cantidades o precios no corresponden a la orden.',
      );
    if (input.onAccountCents)
      throw new DomainError('VALIDATION', 'Esta orden requiere cobro completo en caja.');
    if (input.locationId && input.locationId !== order.locationId)
      throw new DomainError('VALIDATION', 'La caja debe operar en la ubicación de la orden.');
    if (order.status === 'PAID')
      return complete({
        ...input,
        expectedQuoteHash: order.quote.quoteHash,
        locationId: order.locationId,
      });
    const current = this.quote(order.body);
    if (current.quoteHash !== order.quote.quoteHash)
      throw new DomainError(
        'REVISION_CONFLICT',
        'Cambiaron los precios o promociones. Cancelá y prepará una nueva orden antes de cobrar.',
      );
    const sale = complete({
      ...input,
      expectedQuoteHash: order.quote.quoteHash,
      locationId: order.locationId,
    });
    this.db
      .prepare(
        "UPDATE prepared_orders SET status='PAID',revision=revision+1,sale_id=?,paid_at_utc=?,paid_by=?,paid_by_name=? WHERE id=? AND status='READY'",
      )
      .run(sale.id, new Date().toISOString(), actor.id, actor.name, order.id);
    return sale;
  }
  cancel(raw: PreparedOrderCancel, actor: User) {
    this.authorize(actor);
    const input = PreparedOrderCancelSchema.parse(raw);
    const work = () => {
      const row = this.db.prepare(`${select} WHERE o.id=?`).get(input.orderId) as Row | undefined;
      if (!row) throw new DomainError('NOT_FOUND', 'La orden no existe.');
      if (
        actor.role === 'SELLER' &&
        (
          this.db.prepare('SELECT prepared_by FROM prepared_orders WHERE id=?').get(row.id) as {
            prepared_by: string;
          }
        ).prepared_by !== actor.id
      )
        throw new DomainError('FORBIDDEN', 'Solo podés cancelar tus propias órdenes.');
      const payloadHash = hash(input);
      const retry = this.db
        .prepare('SELECT id,cancel_hash FROM prepared_orders WHERE cancel_key=?')
        .get(input.operationKey) as { id: string; cancel_hash: string } | undefined;
      if (retry) {
        if (retry.id !== row.id || retry.cancel_hash !== payloadHash)
          throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave ya se usó con otros datos.');
        return render(row);
      }
      if (row.status !== 'READY')
        throw new DomainError('VALIDATION', 'Solo se cancelan órdenes pendientes de cobro.');
      if (row.revision !== input.expectedRevision)
        throw new DomainError('REVISION_CONFLICT', 'La orden cambió. Actualizá el detalle.');
      this.db
        .prepare(
          "UPDATE prepared_orders SET status='CANCELLED',revision=revision+1,cancelled_at_utc=?,cancelled_by=?,cancelled_by_name=?,cancel_reason=?,cancel_key=?,cancel_hash=? WHERE id=?",
        )
        .run(
          new Date().toISOString(),
          actor.id,
          actor.name,
          input.reason,
          input.operationKey,
          payloadHash,
          row.id,
        );
      return this.byNumber(row.number, actor);
    };
    return this.db.inTransaction ? work() : this.db.transaction(work).immediate();
  }
}
