import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import type { InventoryLot, LotProductStatus } from '../../shared/lots';

export interface LotAllocation {
  lotId: string;
  code: string;
  quantityBase: number;
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class LotService {
  constructor(private readonly db: Database.Database) {}
  private defaultLocationId():string{return (this.db.prepare('SELECT id FROM locations WHERE is_default=1').get() as {id:string}).id;}
  private changeLocal(lotId:string,delta:number,locationId?:string){const id=locationId??this.defaultLocationId();const row=this.db.prepare('SELECT quantity_base,revision FROM location_lot_balances WHERE location_id=? AND lot_id=?').get(id,lotId) as {quantity_base:number;revision:number}|undefined;const next=(row?.quantity_base??0)+delta;if(next<0)throw new DomainError('INSUFFICIENT_STOCK','No hay cantidad suficiente de ese lote en la ubicación.');this.db.prepare('INSERT INTO location_lot_balances(location_id,lot_id,quantity_base,revision) VALUES (?,?,?,?) ON CONFLICT(location_id,lot_id) DO UPDATE SET quantity_base=excluded.quantity_base,revision=excluded.revision').run(id,lotId,next,(row?.revision??0)+1);}

  enabled(productId: string): boolean {
    return Boolean(
      (
        this.db.prepare('SELECT enabled FROM lot_product_settings WHERE product_id=?').get(productId) as
          | { enabled: number }
          | undefined
      )?.enabled,
    );
  }

  status(productId: string): LotProductStatus {
    const product = this.db.prepare('SELECT id FROM products WHERE id=?').get(productId);
    if (!product) throw new DomainError('NOT_FOUND', 'El producto no existe.');
    const settings = this.db
      .prepare('SELECT enabled,reconciled FROM lot_product_settings WHERE product_id=?')
      .get(productId) as { enabled: number; reconciled: number } | undefined;
    const balance = this.db
      .prepare('SELECT quantity_base FROM inventory_balances WHERE product_id=?')
      .get(productId) as { quantity_base: number | null } | undefined;
    return {
      productId,
      enabled: Boolean(settings?.enabled),
      reconciled: Boolean(settings?.reconciled),
      stockQuantityBase: balance?.quantity_base ?? null,
      lots: settings?.enabled ? this.list(productId) : [],
    };
  }

  enable(productId: string, actor: User): void {
    const product = this.db
      .prepare('SELECT track_stock,stock_initialized FROM products WHERE id=?')
      .get(productId) as { track_stock: number; stock_initialized: number } | undefined;
    if (!product) throw new DomainError('NOT_FOUND', 'El producto no existe.');
    if (!product.track_stock || !product.stock_initialized)
      throw new DomainError('VALIDATION', 'El producto necesita control y conteo de stock.');
    const quantity = (
      this.db.prepare('SELECT quantity_base FROM inventory_balances WHERE product_id=?').get(productId) as
        | { quantity_base: number }
        | undefined
    )?.quantity_base ?? 0;
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO lot_product_settings(product_id,enabled,reconciled,revision,updated_at_utc,actor_user_id,actor_name)
         VALUES (?,1,?,1,?,?,?) ON CONFLICT(product_id) DO UPDATE SET enabled=1,revision=revision+1,updated_at_utc=excluded.updated_at_utc,actor_user_id=excluded.actor_user_id,actor_name=excluded.actor_name`,
      )
      .run(productId, Number(quantity === 0), now, actor.id, actor.name);
  }

  get(id: string): InventoryLot {
    const row = this.db
      .prepare(
        'SELECT id,product_id AS productId,code,expires_on AS expiresOn,status,quantity_base AS quantityBase,revision,created_at_utc AS createdAt,updated_at_utc AS updatedAt FROM inventory_lots WHERE id=?',
      )
      .get(id) as InventoryLot | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'El lote no existe.');
    return row;
  }

  list(productId: string): InventoryLot[] {
    return this.db
      .prepare(
        'SELECT id,product_id AS productId,code,expires_on AS expiresOn,status,quantity_base AS quantityBase,revision,created_at_utc AS createdAt,updated_at_utc AS updatedAt FROM inventory_lots WHERE product_id=? ORDER BY expires_on IS NULL,expires_on,created_at_utc,id',
      )
      .all(productId) as InventoryLot[];
  }

  reconcile(input: {
    productId: string;
    operationKey: string;
    actor: User;
    lots: { code: string; expiresOn: string | null; quantityBase: number }[];
  }): InventoryLot[] {
    const normalized = input.lots.map((lot) => ({ ...lot, code: lot.code.trim().toUpperCase() }));
    const payloadHash = digest({ ...input, lots: normalized, actor: input.actor.id });
    return this.db
      .transaction(() => {
        const replay = this.replay<InventoryLot[]>(input.operationKey, payloadHash);
        if (replay) return replay;
        const settings = this.db
          .prepare('SELECT enabled,reconciled FROM lot_product_settings WHERE product_id=?')
          .get(input.productId) as { enabled: number; reconciled: number } | undefined;
        if (!settings?.enabled) throw new DomainError('VALIDATION', 'Activá lotes para este producto.');
        if (settings.reconciled)
          throw new DomainError('VALIDATION', 'El producto ya tiene sus lotes reconciliados.');
        if (!normalized.length || new Set(normalized.map((lot) => lot.code)).size !== normalized.length)
          throw new DomainError('VALIDATION', 'Ingresá lotes con códigos diferentes.');
        for (const lot of normalized)
          if (
            !lot.code ||
            lot.code.length > 80 ||
            !Number.isSafeInteger(lot.quantityBase) ||
            lot.quantityBase <= 0 ||
            (lot.expiresOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(lot.expiresOn))
          )
            throw new DomainError('VALIDATION', 'Revisá los datos de los lotes actuales.');
        const expected = (
          this.db.prepare('SELECT quantity_base FROM inventory_balances WHERE product_id=?').get(input.productId) as
            | { quantity_base: number }
            | undefined
        )?.quantity_base;
        const total = normalized.reduce((sum, lot) => sum + lot.quantityBase, 0);
        if (expected === undefined || total !== expected)
          throw new DomainError(
            'VALIDATION',
            `La distribución debe sumar exactamente ${expected ?? 0}.`,
          );
        const now = new Date().toISOString();
        this.operation(input.operationKey, payloadHash, 'RECONCILIATION', [], now);
        const result: InventoryLot[] = [];
        for (const lot of normalized) {
          const id = randomUUID();
          this.db
            .prepare(
              "INSERT INTO inventory_lots(id,product_id,code,expires_on,status,quantity_base,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,'ACTIVE',?,1,?,?)",
            )
            .run(id, input.productId, lot.code, lot.expiresOn, lot.quantityBase, now, now);
          this.movement({
            lotId: id,
            delta: lot.quantityBase,
            next: lot.quantityBase,
            kind: 'ADJUSTMENT',
            reason: 'Distribución inicial de existencias',
            operationKey: input.operationKey,
            actor: input.actor,
            now,
          });
          result.push(this.get(id));
          this.changeLocal(id,lot.quantityBase);
        }
        this.db
          .prepare(
            'UPDATE lot_product_settings SET reconciled=1,revision=revision+1,updated_at_utc=?,actor_user_id=?,actor_name=? WHERE product_id=?',
          )
          .run(now, input.actor.id, input.actor.name, input.productId);
        this.db
          .prepare('UPDATE lot_operations SET result_json=? WHERE operation_key=?')
          .run(JSON.stringify(result), input.operationKey);
        return result;
      })
      .immediate();
  }

  receive(input: {
    productId: string;
    code: string;
    expiresOn: string | null;
    quantityBase: number;
    operationKey: string;
    actor: User;
    purchaseItemId?: string;
    locationId?: string;
  }): InventoryLot {
    if (!this.enabled(input.productId))
      throw new DomainError('VALIDATION', 'Activá lotes para este producto.');
    if (!Number.isSafeInteger(input.quantityBase) || input.quantityBase <= 0)
      throw new DomainError('VALIDATION', 'La cantidad del lote debe ser positiva.');
    const code = input.code.trim().toUpperCase();
    if (!code || code.length > 80) throw new DomainError('VALIDATION', 'El código de lote no es válido.');
    if (input.expiresOn && !/^\d{4}-\d{2}-\d{2}$/.test(input.expiresOn))
      throw new DomainError('VALIDATION', 'La fecha de vencimiento no es válida.');
    const payloadHash = digest({ ...input, actor: input.actor.id });
    return this.db
      .transaction(() => {
        const replay = this.replay<InventoryLot>(input.operationKey, payloadHash);
        if (replay) return replay;
        const settings = this.db
          .prepare('SELECT reconciled FROM lot_product_settings WHERE product_id=? AND enabled=1')
          .get(input.productId) as { reconciled: number } | undefined;
        if (!settings?.reconciled)
          throw new DomainError('VALIDATION', 'Distribuí primero las existencias actuales en lotes.');
        const now = new Date().toISOString();
        const row = this.db
          .prepare('SELECT id,quantity_base,revision,expires_on FROM inventory_lots WHERE product_id=? AND code=?')
          .get(input.productId, code) as
          | { id: string; quantity_base: number; revision: number; expires_on: string | null }
          | undefined;
        if (row && row.expires_on !== input.expiresOn)
          throw new DomainError('REVISION_CONFLICT', 'El lote ya existe con otro vencimiento.');
        const id = row?.id ?? randomUUID();
        const next = (row?.quantity_base ?? 0) + input.quantityBase;
        if (!Number.isSafeInteger(next) || next > 1_000_000_000)
          throw new DomainError('VALIDATION', 'La cantidad del lote supera el límite.');
        if (row)
          this.db
            .prepare('UPDATE inventory_lots SET quantity_base=?,revision=revision+1,updated_at_utc=? WHERE id=?')
            .run(next, now, id);
        else
          this.db
            .prepare(
              "INSERT INTO inventory_lots(id,product_id,code,expires_on,status,quantity_base,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,'ACTIVE',?,1,?,?)",
            )
            .run(id, input.productId, code, input.expiresOn, next, now, now);
        const result = this.get(id);
        this.changeLocal(id,input.quantityBase,input.locationId);
        this.operation(input.operationKey, payloadHash, 'RECEIPT', result, now);
        this.movement({
          lotId: id,
          delta: input.quantityBase,
          next,
          kind: 'RECEIPT',
          reason: 'Ingreso de lote',
          operationKey: input.operationKey,
          actor: input.actor,
          now,
          ...(input.purchaseItemId ? { purchaseItemId: input.purchaseItemId } : {}),
        });
        return result;
      })
      .immediate();
  }

  allocate(input: {
    productId: string;
    quantityBase: number;
    businessDate: string;
    operationKey: string;
    actor: User;
    saleItemId?: string;
    locationId?: string;
  }): LotAllocation[] {
    const payloadHash = digest({ ...input, actor: input.actor.id });
    return this.db
      .transaction(() => {
        const replay = this.replay<LotAllocation[]>(input.operationKey, payloadHash);
        if (replay) return replay;
        if (!this.enabled(input.productId)) return [];
        const locationId=input.locationId??this.defaultLocationId();
        const lots = this.db
          .prepare(
            `SELECT l.id,l.code,lb.quantity_base FROM inventory_lots l JOIN location_lot_balances lb ON lb.lot_id=l.id AND lb.location_id=?
             WHERE l.product_id=? AND l.status='ACTIVE' AND lb.quantity_base>0 AND (l.expires_on IS NULL OR l.expires_on>=?)
             ORDER BY l.expires_on IS NULL,l.expires_on,l.created_at_utc,l.id`,
          )
          .all(locationId,input.productId, input.businessDate) as {
          id: string;
          code: string;
          quantity_base: number;
        }[];
        if (lots.reduce((sum, lot) => sum + lot.quantity_base, 0) < input.quantityBase)
          throw new DomainError('INSUFFICIENT_STOCK', 'No hay cantidad suficiente en lotes disponibles.');
        let remaining = input.quantityBase;
        const result: LotAllocation[] = [];
        const now = new Date().toISOString();
        this.operation(input.operationKey, payloadHash, 'ALLOCATION', result, now);
        for (const lot of lots) {
          if (!remaining) break;
          const quantity = Math.min(remaining, lot.quantity_base);
          const globalNext=this.get(lot.id).quantityBase-quantity;
          this.db
            .prepare('UPDATE inventory_lots SET quantity_base=?,revision=revision+1,updated_at_utc=? WHERE id=?')
            .run(globalNext, now, lot.id);
          this.changeLocal(lot.id,-quantity,locationId);
          this.movement({
            lotId: lot.id,
            delta: -quantity,
            next:globalNext,
            kind: 'SALE',
            reason: 'Asignación automática FEFO',
            operationKey: input.operationKey,
            actor: input.actor,
            now,
            ...(input.saleItemId ? { saleItemId: input.saleItemId } : {}),
          });
          if (input.saleItemId)
            this.db
              .prepare('INSERT INTO sale_item_lots(sale_item_id,lot_id,quantity_base) VALUES (?,?,?)')
              .run(input.saleItemId, lot.id, quantity);
          result.push({ lotId: lot.id, code: lot.code, quantityBase: quantity });
          remaining -= quantity;
        }
        this.db
          .prepare('UPDATE lot_operations SET result_json=? WHERE operation_key=?')
          .run(JSON.stringify(result), input.operationKey);
        return result;
      })
      .immediate();
  }

  setBlocked(lotId: string, blocked: boolean, actor: User): InventoryLot {
    const lot = this.get(lotId);
    this.db
      .prepare('UPDATE inventory_lots SET status=?,revision=revision+1,updated_at_utc=? WHERE id=?')
      .run(blocked ? 'BLOCKED' : 'ACTIVE', new Date().toISOString(), lot.id);
    void actor;
    return this.get(lot.id);
  }

  restoreSaleItem(input: {
    saleItemId: string;
    quantityBase: number;
    operationKey: string;
    actor: User;
    returnItemId?: string;
  }): LotAllocation[] {
    const payloadHash = digest({ ...input, actor: input.actor.id });
    return this.db
      .transaction(() => {
        const replay = this.replay<LotAllocation[]>(input.operationKey, payloadHash);
        if (replay) return replay;
        const allocations = this.db
          .prepare(
            `SELECT sil.lot_id id,l.code,sil.quantity_base-COALESCE((SELECT SUM(ril.quantity_base) FROM sale_return_item_lots ril JOIN sale_return_items ri ON ri.id=ril.return_item_id WHERE ril.lot_id=sil.lot_id AND ri.sale_item_id=sil.sale_item_id),0) available
             FROM sale_item_lots sil JOIN inventory_lots l ON l.id=sil.lot_id
             WHERE sil.sale_item_id=? ORDER BY l.expires_on IS NULL,l.expires_on,l.created_at_utc,l.id`,
          )
          .all(input.saleItemId) as { id: string; code: string; available: number }[];
        if (allocations.reduce((sum, lot) => sum + lot.available, 0) < input.quantityBase)
          throw new DomainError('VALIDATION', 'La cantidad supera la asignación original de lotes.');
        const now = new Date().toISOString();
        const result: LotAllocation[] = [];
        this.operation(input.operationKey, payloadHash, 'ALLOCATION', result, now);
        let remaining = input.quantityBase;
        for (const allocation of allocations) {
          if (!remaining) break;
          const quantity = Math.min(remaining, allocation.available);
          const lot = this.get(allocation.id);
          const next = lot.quantityBase + quantity;
          this.db
            .prepare('UPDATE inventory_lots SET quantity_base=?,revision=revision+1,updated_at_utc=? WHERE id=?')
            .run(next, now, lot.id);
          const location=(this.db.prepare('SELECT location_id FROM stock_movements WHERE sale_item_id=? AND kind=\'SALE\' LIMIT 1').get(input.saleItemId) as {location_id:string|null}|undefined)?.location_id??undefined;
          this.changeLocal(lot.id,quantity,location);
          this.movement({
            lotId: lot.id,
            delta: quantity,
            next,
            kind: 'RETURN',
            reason: 'Reingreso de venta',
            operationKey: input.operationKey,
            actor: input.actor,
            now,
            saleItemId: input.saleItemId,
            ...(input.returnItemId ? { returnItemId: input.returnItemId } : {}),
          });
          if (input.returnItemId)
            this.db
              .prepare('INSERT INTO sale_return_item_lots(return_item_id,lot_id,quantity_base) VALUES (?,?,?)')
              .run(input.returnItemId, lot.id, quantity);
          result.push({ lotId: lot.id, code: lot.code, quantityBase: quantity });
          remaining -= quantity;
        }
        this.db
          .prepare('UPDATE lot_operations SET result_json=? WHERE operation_key=?')
          .run(JSON.stringify(result), input.operationKey);
        return result;
      })
      .immediate();
  }

  canReversePurchaseItem(purchaseItemId: string): { reversible: boolean; reason?: string } {
    const movements = this.db
      .prepare("SELECT sequence,lot_id FROM lot_movements WHERE purchase_item_id=? AND kind='RECEIPT'")
      .all(purchaseItemId) as { sequence: number; lot_id: string }[];
    for (const movement of movements) {
      const later = this.db
        .prepare('SELECT 1 FROM lot_movements WHERE lot_id=? AND sequence>? LIMIT 1')
        .get(movement.lot_id, movement.sequence);
      if (later)
        return { reversible: false, reason: 'El lote de esta compra ya tuvo movimientos.' };
    }
    return { reversible: true };
  }

  reversePurchaseItem(purchaseItemId: string, operationKey: string, actor: User, reason: string): void {
    const payloadHash = digest({ purchaseItemId, operationKey, actor: actor.id, reason });
    this.db.transaction(() => {
      const existing = this.db
        .prepare('SELECT payload_hash FROM lot_operations WHERE operation_key=?')
        .get(operationKey) as { payload_hash: string } | undefined;
      if (existing) {
        if (existing.payload_hash !== payloadHash)
          throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave corresponde a otra operación de lotes.');
        return;
      }
      const check = this.canReversePurchaseItem(purchaseItemId);
      if (!check.reversible) throw new DomainError('REVISION_CONFLICT', check.reason!);
      const movements = this.db
        .prepare("SELECT lot_id,delta_base FROM lot_movements WHERE purchase_item_id=? AND kind='RECEIPT'")
        .all(purchaseItemId) as { lot_id: string; delta_base: number }[];
      const now = new Date().toISOString();
      this.operation(operationKey, payloadHash, 'VOID', null, now);
      for (const movement of movements) {
        const lot = this.get(movement.lot_id);
        const next = lot.quantityBase - movement.delta_base;
        if (next < 0) throw new DomainError('REVISION_CONFLICT', 'El lote no tiene existencia suficiente.');
        this.db
          .prepare('UPDATE inventory_lots SET quantity_base=?,revision=revision+1,updated_at_utc=? WHERE id=?')
          .run(next, now, lot.id);
        this.changeLocal(lot.id,-movement.delta_base);
        this.movement({
          lotId: lot.id,
          delta: -movement.delta_base,
          next,
          kind: 'VOID',
          reason,
          operationKey,
          actor,
          now,
          purchaseItemId,
        });
      }
    }).immediate();
  }

  private replay<T>(key: string, payloadHash: string): T | null {
    const row = this.db
      .prepare('SELECT payload_hash,result_json FROM lot_operations WHERE operation_key=?')
      .get(key) as { payload_hash: string; result_json: string } | undefined;
    if (!row) return null;
    if (row.payload_hash !== payloadHash)
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave corresponde a otra operación de lotes.');
    return JSON.parse(row.result_json) as T;
  }

  private operation(
    key: string,
    payloadHash: string,
    kind: 'RECEIPT' | 'ALLOCATION' | 'RECONCILIATION' | 'VOID',
    result: unknown,
    now: string,
  ) {
    this.db
      .prepare('INSERT INTO lot_operations VALUES (?,?,?,?,?)')
      .run(key, payloadHash, kind, JSON.stringify(result), now);
  }

  private movement(input: {
    lotId: string;
    delta: number;
    next: number;
    kind: 'RECEIPT' | 'SALE' | 'RETURN' | 'VOID' | 'WASTE' | 'ADJUSTMENT';
    reason: string;
    operationKey: string;
    actor: User;
    now: string;
    saleItemId?: string;
    purchaseItemId?: string;
    returnItemId?: string;
  }) {
    this.db
      .prepare(
        'INSERT INTO lot_movements(id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,sale_item_id,purchase_item_id,return_item_id,actor_user_id,actor_name,created_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        input.lotId,
        input.delta,
        input.next,
        input.kind,
        input.reason,
        input.operationKey,
        input.saleItemId ?? null,
        input.purchaseItemId ?? null,
        input.returnItemId ?? null,
        input.actor.id,
        input.actor.name,
        input.now,
      );
  }
}
