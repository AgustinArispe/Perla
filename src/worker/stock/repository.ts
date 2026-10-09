import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { DomainError } from '../../shared/errors';
import type { StockMovement, StockBalance } from '../../shared/stock';

export class StockRepository {
  constructor(private readonly db: Database.Database) {}
  private defaultLocationId(): string {
    return (this.db.prepare('SELECT id FROM locations WHERE is_default=1').get() as { id: string }).id;
  }
  balance(id: string, locationId?: string): { quantity_base: number; revision: number } | undefined {
    if (locationId)
      return this.db
        .prepare('SELECT quantity_base,revision FROM location_inventory_balances WHERE location_id=? AND product_id=?')
        .get(locationId, id) as { quantity_base: number; revision: number } | undefined;
    return this.db
      .prepare('SELECT quantity_base,revision FROM inventory_balances WHERE product_id=?')
      .get(id) as { quantity_base: number; revision: number } | undefined;
  }
  replay(key: string, hash: string): StockBalance | undefined {
    const row = this.db
      .prepare('SELECT payload_hash,result_json FROM stock_movements WHERE operation_key=?')
      .get(key) as { payload_hash: string; result_json: string } | undefined;
    if (!row) return;
    if (row.payload_hash !== hash)
      throw new DomainError(
        'IDEMPOTENCY_CONFLICT',
        'Ese identificador ya corresponde a otro movimiento. Conservá la operación original.',
      );
    return JSON.parse(row.result_json) as StockBalance;
  }
  // The caller owns the transaction: future sales can include this write in their commit.
  appendWithinTransaction(input: {
    productId: string;
    deltaBase: number;
    nextBase: number;
    revision: number;
    kind: StockMovement['kind'];
    reason: string;
    operationKey: string;
    hash: string;
    result: StockBalance;
    saleId?: string;
    saleItemId?: string;
    purchaseId?: string;
    purchaseItemId?: string;
    returnId?: string;
    returnItemId?: string;
    locationId?: string;
    transferId?: string;
    transferItemId?: string;
    timestamp?: string;
  }): void {
    if (!this.db.inTransaction) throw new Error('El movimiento requiere una transacción activa.');
    const locationId = input.locationId ?? this.defaultLocationId();
    this.db
      .prepare(
        'INSERT INTO location_inventory_balances (location_id,product_id,quantity_base,revision) VALUES (?,?,?,?) ON CONFLICT(location_id,product_id) DO UPDATE SET quantity_base=excluded.quantity_base, revision=excluded.revision',
      )
      .run(locationId, input.productId, input.nextBase, input.revision);
    const consolidated = this.balance(input.productId);
    const consolidatedNext = (consolidated?.quantity_base ?? 0) + input.deltaBase;
    const consolidatedRevision = (consolidated?.revision ?? 0) + 1;
    this.db
      .prepare(
        'INSERT INTO inventory_balances (product_id,quantity_base,revision) VALUES (?,?,?) ON CONFLICT(product_id) DO UPDATE SET quantity_base=excluded.quantity_base, revision=excluded.revision',
      )
      .run(input.productId, consolidatedNext, consolidatedRevision);
    const timestamp = input.timestamp ?? new Date().toISOString();
    const businessDate = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(timestamp));
    this.db
      .prepare(
        'INSERT INTO stock_movements (id,product_id,delta_base,balance_after_base,kind,reason,operation_key,payload_hash,result_json,created_at_utc,business_date,sale_id,sale_item_id,purchase_id,purchase_item_id,return_id,return_item_id,location_id,transfer_id,transfer_item_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        input.productId,
        input.deltaBase,
        input.nextBase,
        input.kind,
        input.reason,
        input.operationKey,
        input.hash,
        JSON.stringify(input.result),
        timestamp,
        businessDate,
        input.saleId ?? null,
        input.saleItemId ?? null,
        input.purchaseId ?? null,
        input.purchaseItemId ?? null,
        input.returnId ?? null,
        input.returnItemId ?? null,
        locationId,
        input.transferId ?? null,
        input.transferItemId ?? null,
      );
  }
}
