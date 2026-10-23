import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import {
  ReturnConfirmSchema,
  type ReturnConfirmInput,
  type ReturnPreview,
  type SaleReturnDetail,
} from '../../shared/returns';
import { proportionalIncrement } from '../../domain/returns';
import { nextBalance, stockState } from '../../domain/inventory';
import type { SalesService } from '../sales/service';
import type { StockService } from '../stock/service';
import { StockRepository } from '../stock/repository';
import type { LotService } from '../lots/service';
import type { CustomerService } from '../customers/service';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

type ItemRow = {
  id: string;
  product_id: string;
  name: string;
  unit: 'UNIT' | 'KG';
  quantity_base: number;
  gross_cents: number;
  discount_cents: number;
  net_cents: number;
  cost_cents: number | null;
};

export class ReturnService {
  private readonly ledger: StockRepository;
  constructor(
    private readonly db: Database.Database,
    private readonly stock: StockService,
    private readonly sales: SalesService,
    private readonly lots?: LotService,
    private readonly lotsEnabled: () => boolean = () => false,
    private readonly customers?: CustomerService,
  ) {
    this.ledger = new StockRepository(db);
  }

  preview(saleId: string): ReturnPreview {
    const sale = this.sales.detail(saleId);
    if (sale.status === 'VOIDED')
      throw new DomainError('VALIDATION', 'Una venta anulada no admite devoluciones.');
    const items = this.db
      .prepare(
        `SELECT i.id,i.product_id,i.name,i.unit,i.quantity_base,i.net_cents,
          COALESCE(SUM(ri.quantity_base),0) AS returned_quantity,
          COALESCE(SUM(ri.net_cents),0) AS returned_cents,
          EXISTS(SELECT 1 FROM stock_movements sm WHERE sm.sale_item_id=i.id AND sm.kind='SALE') AS trackable
         FROM sale_order_items i
         LEFT JOIN sale_return_items ri ON ri.sale_item_id=i.id
         WHERE i.sale_id=?
         GROUP BY i.id ORDER BY i.position`,
      )
      .all(sale.id) as {
      id: string;
      product_id: string;
      name: string;
      unit: 'UNIT' | 'KG';
      quantity_base: number;
      net_cents: number;
      returned_quantity: number;
      returned_cents: number;
      trackable: number;
    }[];
    return {
      saleId: sale.id,
      saleNumber: sale.number,
      items: items.map((item) => ({
        saleItemId: item.id,
        productId: item.product_id,
        name: item.name,
        unit: item.unit,
        soldQuantityBase: item.quantity_base,
        returnedQuantityBase: item.returned_quantity,
        availableQuantityBase: item.quantity_base - item.returned_quantity,
        refundableCents: item.net_cents - item.returned_cents,
        soldNetCents: item.net_cents,
        returnedNetCents: item.returned_cents,
        trackableReturn: Boolean(item.trackable),
      })),
    };
  }

  detail(id: string): SaleReturnDetail {
    const row = this.db
      .prepare(
        `SELECT r.id,r.number,r.sale_id AS saleId,s.number AS saleNumber,r.status,r.reason,
          r.total_cents AS totalCents,r.cost_cents AS costCents,r.actor_user_id AS actorUserId,
          r.actor_name AS actorName,r.created_at_utc AS createdAt,r.input_json AS inputJson,
          r.total_cents-f.amount_cents AS accountOffsetCents,f.method AS refundMethod,f.amount_cents AS refundCents
         FROM sale_returns r JOIN sale_orders s ON s.id=r.sale_id
         JOIN sale_return_refunds f ON f.return_id=r.id WHERE r.id=?`,
      )
      .get(id) as (Omit<SaleReturnDetail, 'items' | 'input'> & { inputJson: string }) | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'La devolución no existe.');
    const { inputJson, ...detail } = row;
    const input = ReturnConfirmSchema.parse(JSON.parse(inputJson));
    const items = this.db
      .prepare(
        `SELECT ri.id,ri.sale_item_id AS saleItemId,ri.product_id AS productId,i.name,i.unit,
          ri.quantity_base AS quantityBase,ri.disposition,ri.net_cents AS netCents,ri.cost_cents AS costCents
         FROM sale_return_items ri JOIN sale_order_items i ON i.id=ri.sale_item_id
         WHERE ri.return_id=? ORDER BY i.position`,
      )
      .all(id) as SaleReturnDetail['items'];
    return { ...detail, input, items };
  }

  listForSale(saleId: string): SaleReturnDetail[] {
    this.sales.detail(saleId);
    const rows = this.db
      .prepare('SELECT id FROM sale_returns WHERE sale_id=? ORDER BY number')
      .all(saleId) as { id: string }[];
    return rows.map((row) => this.detail(row.id));
  }

  confirm(raw: ReturnConfirmInput, actor: User): SaleReturnDetail {
    const input = ReturnConfirmSchema.parse(raw);
    const payloadHash = hash(input);
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare('SELECT id,payload_hash FROM sale_returns WHERE operation_key=?')
          .get(input.operationKey) as { id: string; payload_hash: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== payloadHash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'La clave corresponde a otra devolución.',
            );
          return this.detail(replay.id);
        }
        const sale = this.sales.detail(input.saleId);
        if (sale.status === 'VOIDED')
          throw new DomainError('VALIDATION', 'Una venta anulada no admite devoluciones.');
        const id = randomUUID();
        const now = new Date().toISOString();
        const date = new Intl.DateTimeFormat('sv-SE', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date(now));
        const number = (
          this.db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM sale_returns').get() as {
            n: number;
          }
        ).n;
        const prepared = input.items.map((request) => {
          const item = this.db
            .prepare(
              'SELECT id,product_id,name,unit,quantity_base,gross_cents,discount_cents,net_cents,cost_cents FROM sale_order_items WHERE id=? AND sale_id=?',
            )
            .get(request.saleItemId, sale.id) as ItemRow | undefined;
          if (!item) throw new DomainError('VALIDATION', 'Un producto no pertenece a esta venta.');
          const returned = this.db
            .prepare(
              'SELECT COALESCE(SUM(quantity_base),0) AS quantity FROM sale_return_items WHERE sale_item_id=?',
            )
            .get(item.id) as { quantity: number };
          if (returned.quantity + request.quantityBase > item.quantity_base)
            throw new DomainError('VALIDATION', `${item.name} ya fue devuelta por completo.`);
          const portion = (amount: number) =>
            proportionalIncrement({
              totalAmountCents: amount,
              totalQuantityBase: item.quantity_base,
              previousQuantityBase: returned.quantity,
              returnedQuantityBase: request.quantityBase,
            });
          const netCents = portion(item.net_cents);
          const discountCents = portion(item.discount_cents);
          return {
            request,
            item,
            // Derive gross from the allocated net and discount. Rounding all three
            // independently can violate gross - discount = net by one cent.
            grossCents: netCents + discountCents,
            discountCents,
            netCents,
            costCents: item.cost_cents === null ? null : portion(item.cost_cents),
          };
        });
        const totalCents = prepared.reduce((sum, item) => sum + item.netCents, 0);
        const knownCosts = prepared.filter((item) => item.costCents !== null);
        const costCents =
          knownCosts.length === prepared.length
            ? knownCosts.reduce((sum, item) => sum + item.costCents!, 0)
            : null;
        const accountOffsetCents = this.customers?.applyReturn(sale.id, totalCents) ?? 0;
        const refundCents = totalCents - accountOffsetCents;
        this.db
          .prepare(
            `INSERT INTO sales(id,number,original_sale_id,operation_key,payload_hash,input_json,status,reason,total_cents,cost_cents,actor_user_id,actor_name,created_at_utc,business_date,local_month,document_type)
             VALUES (?,?,?,?,?,?,'CONFIRMED',?,?,?,?,?,?,?,?,'RETURN')`,
          )
          .run(
            id,
            number,
            sale.id,
            input.operationKey,
            payloadHash,
            JSON.stringify(input),
            input.reason,
            totalCents,
            costCents,
            actor.id,
            actor.name,
            now,
            date,
            date.slice(0, 7),
          );
        for (const preparedItem of prepared) {
          const returnItemId = randomUUID();
          this.db
            .prepare(
              `WITH input(id,sale_id,original_sale_item_id,product_id,quantity_base,gross_cents,discount_cents,net_cents,cost_cents,disposition) AS (VALUES (?,?,?,?,?,?,?,?,?,?))
               INSERT INTO sale_items(id,sale_id,original_sale_item_id,product_id,quantity_base,gross_cents,discount_cents,net_cents,cost_cents,disposition,document_type,line_id,position,sku,barcode,name,unit,unit_price_cents)
               SELECT v.id,v.sale_id,v.original_sale_item_id,v.product_id,v.quantity_base,v.gross_cents,v.discount_cents,v.net_cents,v.cost_cents,v.disposition,'RETURN',i.id,i.position,i.sku,i.barcode,i.name,i.unit,i.unit_price_cents FROM input v JOIN sale_order_items i ON i.id=v.original_sale_item_id AND i.document_type='SALE'`,
            )
            .run(
              returnItemId,
              id,
              preparedItem.item.id,
              preparedItem.item.product_id,
              preparedItem.request.quantityBase,
              preparedItem.grossCents,
              preparedItem.discountCents,
              preparedItem.netCents,
              preparedItem.costCents,
              preparedItem.request.disposition,
            );
          if (preparedItem.request.disposition === 'RESTOCK')
            this.restock(
              preparedItem.item,
              preparedItem.request.quantityBase,
              id,
              returnItemId,
              input.reason,
              payloadHash,
              now,
              actor,
            );
        }
        this.db
          .prepare(
            "INSERT INTO sale_payments(id,sale_id,method,amount_cents,position,change_cents,direction) VALUES (?,?,?,?,0,0,'REFUND')",
          )
          .run(randomUUID(), id, input.refundMethod, refundCents);
        this.db
          .prepare(
            "INSERT INTO sale_events(id,sale_id,kind,reason,actor_user_id,actor_name,created_at_utc) VALUES (?,?,'CONFIRMED',?,?,?,?)",
          )
          .run(randomUUID(), id, input.reason, actor.id, actor.name, now);
        return this.detail(id);
      })
      .immediate();
  }

  private restock(
    item: ItemRow,
    quantity: number,
    returnId: string,
    returnItemId: string,
    reason: string,
    payloadHash: string,
    now: string,
    actor: User,
  ) {
    const originalMovement = this.db
      .prepare("SELECT 1 FROM stock_movements WHERE sale_item_id=? AND kind='SALE'")
      .get(item.id);
    if (!originalMovement)
      throw new DomainError('VALIDATION', `${item.name} no tenía stock controlado al venderse.`);
    const old = this.ledger.balance(item.product_id);
    if (!old) throw new DomainError('BACKUP_INVALID', 'Falta el saldo de stock del producto.');
    const next = nextBalance(old.quantity_base, quantity, true);
    const current = this.stock.get(item.product_id);
    const result = {
      ...current,
      quantityBase: next,
      revision: old.revision + 1,
      state: stockState(true, true, next, current.minStockBase),
    };
    this.ledger.appendWithinTransaction({
      productId: item.product_id,
      deltaBase: quantity,
      nextBase: next,
      revision: result.revision,
      kind: 'VOID',
      reason: `Devolución: ${reason}`,
      operationKey: randomUUID(),
      hash: payloadHash,
      result,
      returnId,
      returnItemId,
      timestamp: now,
    });
    if (this.lotsEnabled() && this.lots?.enabled(item.product_id))
      this.lots.restoreSaleItem({
        saleItemId: item.id,
        quantityBase: quantity,
        operationKey: returnItemId,
        actor,
        returnItemId,
      });
  }
}
