import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { purchaseLineSubtotal, purchaseTotal } from '../../domain/purchases';
import { DomainError } from '../../shared/errors';
import {
  PurchaseReceiveSchema,
  PurchaseDraftBodySchema,
  PurchaseDraftSaveSchema,
  PurchaseSearchSchema,
  PurchaseVoidSchema,
  SupplierSaveSchema,
  SupplierSearchSchema,
  SupplierSetActiveSchema,
  type PurchaseDetail,
  type PurchaseReceiveInput,
  type PurchaseDraftRecord,
  type PurchaseDraftSaveInput,
  type PurchasePage,
  type PurchaseSummary,
  type PurchaseSearchInput,
  type PurchaseVoidInput,
  type PurchaseVoidPreview,
  type SupplierSaveInput,
  type SupplierSearchInput,
  type SupplierSetActiveInput,
} from '../../shared/purchases';
import type { User } from '../../shared/auth';
import type { CatalogRepository } from '../products/repository';
import type { StockService } from '../stock/service';
import { CostService } from '../costs/service';
import { PurchaseRepository } from './repository';
import { purchasePayloadHash } from './hash';
import type { LotService } from '../lots/service';
import type { SupplierAccountService } from '../supplier-accounts/service';

type PurchaseRow = {
  id: string;
  number: number;
  receipt_key: string;
  payload_hash: string;
  supplier_id: string;
  supplier_name: string;
  supplier_phone: string | null;
  status: 'RECEIVED' | 'VOIDED';
  received_at_utc: string;
  business_date: string;
  total_cents: number;
  stock_applied: number;
  actor_user_id: string;
  actor_name: string;
};

function validatedSubtotal(unit: 'UNIT' | 'KG', quantity: number, cost: number): number {
  try {
    return purchaseLineSubtotal(unit, quantity, cost);
  } catch (error) {
    throw new DomainError(
      'VALIDATION',
      error instanceof Error ? error.message : 'El costo de la compra no es válido.',
    );
  }
}

function validatedTotal(subtotals: number[]): number {
  try {
    return purchaseTotal(subtotals);
  } catch (error) {
    throw new DomainError(
      'VALIDATION',
      error instanceof Error ? error.message : 'El total de la compra no es válido.',
    );
  }
}

export class PurchaseService {
  private readonly repository: PurchaseRepository;
  private readonly costs: CostService;
  constructor(
    private readonly db: Database.Database,
    private readonly catalog: CatalogRepository,
    private readonly stock: StockService,
    private readonly stockEnabled: () => boolean,
    private readonly lots?: LotService,
    private readonly lotsEnabled: () => boolean = () => false,
    private readonly accounts?: SupplierAccountService,
    private readonly accountsEnabled: () => boolean = () => false,
  ) {
    this.repository = new PurchaseRepository(db);
    this.costs = new CostService(db);
  }

  saveSupplier(raw: SupplierSaveInput) {
    const input = SupplierSaveSchema.parse(raw);
    return this.db.transaction(() => this.repository.saveSupplier(input)).immediate();
  }

  setSupplierActive(raw: SupplierSetActiveInput) {
    const input = SupplierSetActiveSchema.parse(raw);
    return this.db.transaction(() => this.repository.setSupplierActive(input)).immediate();
  }

  searchSuppliers(raw: SupplierSearchInput) {
    return this.repository.searchSuppliers(SupplierSearchSchema.parse(raw));
  }

  supplier(id: string) {
    return this.repository.supplier(id);
  }

  getDraft(userId: string): PurchaseDraftRecord | null {
    const row = this.db.prepare('SELECT * FROM purchase_drafts WHERE user_id=?').get(userId) as
      { body_json: string; revision: number; updated_at_utc: string } | undefined;
    return row
      ? {
          body: PurchaseDraftBodySchema.parse(JSON.parse(row.body_json)),
          revision: row.revision,
          updatedAt: row.updated_at_utc,
        }
      : null;
  }

  saveDraft(raw: PurchaseDraftSaveInput, userId: string, terminalId: string | null) {
    const input = PurchaseDraftSaveSchema.parse(raw);
    return this.db
      .transaction(() => {
        const current = this.getDraft(userId);
        if ((current?.revision ?? 0) !== input.expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recuperalo antes de reemplazarlo.',
          );
        const now = new Date().toISOString();
        this.db
          .prepare(
            `WITH input(owner,terminal,rev,body,updated) AS (VALUES (?,?,?,?,?)) INSERT INTO drafts(document_type,id,owner_user_id,terminal_id,revision,body_json,updated_at_utc) SELECT 'PURCHASE',owner,owner,terminal,rev,body,updated FROM input WHERE true ON CONFLICT(document_type,id) DO UPDATE SET terminal_id=excluded.terminal_id,revision=excluded.revision,body_json=excluded.body_json,updated_at_utc=excluded.updated_at_utc`,
          )
          .run(userId, terminalId, input.expectedRevision + 1, JSON.stringify(input.body), now);
        return this.getDraft(userId)!;
      })
      .immediate();
  }

  cancelDraft(expectedRevision: number, userId: string): null {
    return this.db
      .transaction(() => {
        const current = this.getDraft(userId);
        if ((current?.revision ?? 0) !== expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recuperalo antes de descartarlo.',
          );
        this.db.prepare("DELETE FROM drafts WHERE document_type='PURCHASE' AND id=?").run(userId);
        return null;
      })
      .immediate();
  }

  receive(raw: PurchaseReceiveInput, actor: User): PurchaseDetail {
    const input = PurchaseReceiveSchema.parse(raw);
    const hash = purchasePayloadHash(input);
    return this.db
      .transaction(() => {
        const previous = this.db
          .prepare('SELECT id,payload_hash FROM purchases WHERE receipt_key=?')
          .get(input.receiptKey) as { id: string; payload_hash: string } | undefined;
        if (previous) {
          if (previous.payload_hash !== hash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador ya corresponde a otra compra. Conservá la operación original.',
            );
          return this.detail(previous.id);
        }
        if (input.expectedDraftRevision !== undefined) {
          const draft = this.getDraft(actor.id);
          if (!draft || draft.revision !== input.expectedDraftRevision)
            throw new DomainError(
              'REVISION_CONFLICT',
              'El borrador cambió. Recuperalo antes de confirmar.',
            );
        }
        const supplier = this.repository.supplier(input.supplierId!);
        if (!supplier.active) throw new DomainError('INACTIVE', 'El proveedor está inactivo.');
        const stockApplied = this.stockEnabled();
        const items = input.lines.map((line, position) => {
          const product = this.catalog.get(line.productId);
          if (!product.active) throw new DomainError('INACTIVE', `${product.name} está inactivo.`);
          if (product.revision !== line.expectedProductRevision)
            throw new DomainError(
              'REVISION_CONFLICT',
              `${product.name} cambió. Revisá el renglón antes de recibir.`,
            );
          if (stockApplied && product.trackStock && !product.stockInitialized)
            throw new DomainError(
              'REVISION_CONFLICT',
              `${product.name} necesita un conteo inicial antes de recibirlo.`,
            );
          return {
            id: randomUUID(),
            lineId: line.lineId,
            product,
            position,
            quantityBase: line.quantityBase,
            unitCostCents: line.unitCostCents,
            subtotalCents: validatedSubtotal(
              product.saleUnit,
              line.quantityBase,
              line.unitCostCents,
            ),
          };
        });
        const totalCents = validatedTotal(items.map((item) => item.subtotalCents));
        const number = (
          this.db.prepare('SELECT COALESCE(MAX(number),0)+1 AS n FROM purchases').get() as {
            n: number;
          }
        ).n;
        const id = randomUUID();
        const now = new Date().toISOString();
        this.db
          .prepare(
            "INSERT INTO purchases (id,number,receipt_key,payload_hash,supplier_id,supplier_name,supplier_phone,status,received_at_utc,business_date,total_cents,stock_applied,actor_user_id,actor_name) VALUES (?,?,?,?,?,?,?,'RECEIVED',?,?,?,?,?,?)",
          )
          .run(
            id,
            number,
            input.receiptKey,
            hash,
            supplier.id,
            supplier.name,
            supplier.phone,
            now,
            input.businessDate,
            totalCents,
            Number(stockApplied),
            actor.id,
            actor.name,
          );
        const insertItem = this.db.prepare(
          'INSERT INTO purchase_items (id,purchase_id,position,line_id,product_id,sku,barcode,name,unit,quantity_base,unit_cost_cents,subtotal_cents,product_revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        );
        for (const item of items) {
          insertItem.run(
            item.id,
            id,
            item.position,
            item.lineId,
            item.product.id,
            item.product.sku,
            item.product.barcode,
            item.product.name,
            item.product.saleUnit,
            item.quantityBase,
            item.unitCostCents,
            item.subtotalCents,
            item.product.revision,
          );
          if (stockApplied && item.product.trackStock) {
            const current = this.stock.get(item.product.id);
            this.costs.receive({
              product: item.product,
              oldQuantityBase: current.quantityBase ?? 0,
              receivedQuantityBase: item.quantityBase,
              unitCostCents: item.unitCostCents,
              purchaseId: id,
              purchaseItemId: item.id,
              actor,
            });
            this.stock.record({
              productId: item.product.id,
              deltaBase: item.quantityBase,
              kind: 'RECEIPT',
              reason: `Compra N.º ${number}`,
              operationKey: item.id,
              expectedRevision: current.revision,
              expectedProductRevision: current.productRevision,
            });
            this.db
              .prepare(
                'UPDATE stock_movements SET purchase_id=?,purchase_item_id=? WHERE operation_key=?',
              )
              .run(id, item.id, item.id);
            if (this.lotsEnabled() && this.lots?.enabled(item.product.id)) {
              const line = input.lines[item.position]!;
              if (!line.lotCode)
                throw new DomainError(
                  'VALIDATION',
                  `${item.product.name} requiere un código de lote.`,
                );
              this.lots.receive({
                productId: item.product.id,
                code: line.lotCode,
                expiresOn: line.expiresOn ?? null,
                quantityBase: item.quantityBase,
                operationKey: item.id,
                actor,
                purchaseItemId: item.id,
              });
            }
          }
        }
        const result = this.detail(id);
        if (this.accountsEnabled())
          this.accounts?.recordPurchase({ id, supplierId: supplier.id, totalCents });
        this.db
          .prepare(
            "INSERT INTO purchase_events (id,purchase_id,kind,reason,operation_key,payload_hash,result_json,actor_user_id,actor_name,created_at_utc) VALUES (?,?,'RECEIVED',?,?,?,?,?,?,?)",
          )
          .run(
            randomUUID(),
            id,
            'Mercadería recibida',
            input.receiptKey,
            hash,
            JSON.stringify(result),
            actor.id,
            actor.name,
            now,
          );
        if (input.expectedDraftRevision !== undefined)
          this.db
            .prepare("DELETE FROM drafts WHERE document_type='PURCHASE' AND id=?")
            .run(actor.id);
        return this.detail(id);
      })
      .immediate();
  }

  findByReceiptKey(receiptKey: string): PurchaseDetail | null {
    const row = this.db.prepare('SELECT id FROM purchases WHERE receipt_key=?').get(receiptKey) as
      { id: string } | undefined;
    return row ? this.detail(row.id) : null;
  }

  lastCost(productId: string) {
    const row = this.db
      .prepare(
        `SELECT i.unit_cost_cents,p.id AS purchase_id,p.received_at_utc
         FROM purchase_items i JOIN purchases p ON p.id=i.purchase_id
         WHERE i.product_id=? AND p.status='RECEIVED'
         ORDER BY p.received_at_utc DESC,p.number DESC LIMIT 1`,
      )
      .get(productId) as
      { unit_cost_cents: number; purchase_id: string; received_at_utc: string } | undefined;
    return row
      ? {
          productId,
          unitCostCents: row.unit_cost_cents,
          purchaseId: row.purchase_id,
          receivedAt: row.received_at_utc,
        }
      : null;
  }

  detail(id: string): PurchaseDetail {
    const row = this.db.prepare('SELECT * FROM purchases WHERE id=?').get(id) as
      PurchaseRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'La compra no existe.');
    const items = this.db
      .prepare('SELECT * FROM purchase_items WHERE purchase_id=? ORDER BY position')
      .all(id) as {
      id: string;
      line_id: string;
      product_id: string;
      sku: string;
      barcode: string | null;
      name: string;
      unit: 'UNIT' | 'KG';
      quantity_base: number;
      unit_cost_cents: number;
      subtotal_cents: number;
      product_revision: number;
    }[];
    const events = this.db
      .prepare(
        'SELECT id,kind,reason,actor_user_id,actor_name,created_at_utc FROM purchase_events WHERE purchase_id=? ORDER BY created_at_utc,id',
      )
      .all(id) as {
      id: string;
      kind: 'RECEIVED' | 'VOIDED';
      reason: string;
      actor_user_id: string;
      actor_name: string;
      created_at_utc: string;
    }[];
    return {
      id: row.id,
      number: row.number,
      receiptKey: row.receipt_key,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      supplierPhone: row.supplier_phone,
      status: row.status,
      receivedAt: row.received_at_utc,
      businessDate: row.business_date,
      totalCents: row.total_cents,
      stockApplied: Boolean(row.stock_applied),
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
      items: items.map((item) => ({
        id: item.id,
        lineId: item.line_id,
        productId: item.product_id,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        unit: item.unit,
        quantityBase: item.quantity_base,
        unitCostCents: item.unit_cost_cents,
        subtotalCents: item.subtotal_cents,
        productRevision: item.product_revision,
      })),
      events: events.map((event) => ({
        id: event.id,
        kind: event.kind,
        reason: event.reason,
        actorUserId: event.actor_user_id,
        actorName: event.actor_name,
        createdAt: event.created_at_utc,
      })),
    };
  }

  list(raw: PurchaseSearchInput): PurchasePage {
    const input = PurchaseSearchSchema.parse(raw);
    let where = '1=1';
    const params: (string | number)[] = [];
    if (input.fromDate) {
      where += ' AND business_date>=?';
      params.push(input.fromDate);
    }
    if (input.toDate) {
      where += ' AND business_date<=?';
      params.push(input.toDate);
    }
    if (input.supplierId) {
      where += ' AND supplier_id=?';
      params.push(input.supplierId);
    }
    if (input.status !== 'ALL') {
      where += ' AND status=?';
      params.push(input.status);
    }
    const countParams = [...params];
    const total = (
      this.db.prepare(`SELECT COUNT(*) AS n FROM purchases WHERE ${where}`).get(...countParams) as {
        n: number;
      }
    ).n;
    if (input.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')) as {
          date: string;
          number: number;
          filters: string;
        };
        const filters = JSON.stringify({
          fromDate: input.fromDate ?? '',
          toDate: input.toDate ?? '',
          supplierId: input.supplierId ?? '',
          status: input.status,
        });
        if (cursor.filters !== filters) throw new Error();
        where += ' AND (business_date<? OR (business_date=? AND number<?))';
        params.push(cursor.date, cursor.date, cursor.number);
      } catch {
        throw new DomainError('VALIDATION', 'La página solicitada no es válida.');
      }
    }
    const rows = this.db
      .prepare(
        `SELECT id FROM purchases WHERE ${where} ORDER BY business_date DESC,number DESC LIMIT ?`,
      )
      .all(...params, input.limit + 1) as { id: string }[];
    const page = rows.slice(0, input.limit).map((row) => {
      const summary: Partial<PurchaseDetail> = { ...this.detail(row.id) };
      delete summary.items;
      delete summary.events;
      return summary as PurchaseSummary;
    });
    const last = page.at(-1);
    const filters = JSON.stringify({
      fromDate: input.fromDate ?? '',
      toDate: input.toDate ?? '',
      supplierId: input.supplierId ?? '',
      status: input.status,
    });
    return {
      items: page,
      total,
      nextCursor:
        rows.length > input.limit && last
          ? Buffer.from(
              JSON.stringify({ date: last.businessDate, number: last.number, filters }),
            ).toString('base64url')
          : null,
    };
  }

  previewVoid(purchaseId: string): PurchaseVoidPreview {
    const purchase = this.detail(purchaseId);
    if (purchase.status === 'VOIDED')
      return {
        reversible: false,
        conflicts: [{ productId: '', name: '', reason: 'La compra ya está anulada.' }],
      };
    const conflicts: PurchaseVoidPreview['conflicts'] = [];
    if (purchase.stockApplied) {
      for (const item of purchase.items) {
        const cost = this.costs.canReversePurchaseItem(item.id);
        if (!cost.reversible) {
          conflicts.push({
            productId: item.productId,
            name: item.name,
            reason: cost.reason ?? 'Tiene un costo posterior.',
          });
          continue;
        }
        if (this.lotsEnabled() && this.lots?.enabled(item.productId)) {
          const lot = this.lots.canReversePurchaseItem(item.id);
          if (!lot.reversible) {
            conflicts.push({
              productId: item.productId,
              name: item.name,
              reason: lot.reason ?? 'El lote tuvo movimientos posteriores.',
            });
            continue;
          }
        }
        const receipt = this.db
          .prepare(
            "SELECT sequence FROM stock_movements WHERE purchase_item_id=? AND kind='RECEIPT'",
          )
          .get(item.id) as { sequence: number } | undefined;
        if (!receipt) continue;
        const later = this.db
          .prepare(
            "SELECT kind FROM stock_movements WHERE product_id=? AND sequence>? AND kind IN ('SALE','WASTE','ADJUSTMENT','OPENING') LIMIT 1",
          )
          .get(item.productId, receipt.sequence) as { kind: string } | undefined;
        const balance = this.stock.get(item.productId);
        if (later || balance.quantityBase === null || balance.quantityBase < item.quantityBase)
          conflicts.push({
            productId: item.productId,
            name: item.name,
            reason: 'Tiene movimientos posteriores o existencia insuficiente.',
          });
      }
    }
    return { reversible: conflicts.length === 0, conflicts };
  }

  void(raw: PurchaseVoidInput, actor: User): PurchaseDetail {
    const input = PurchaseVoidSchema.parse(raw);
    const hash = purchasePayloadHash(input);
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare('SELECT purchase_id,payload_hash FROM purchase_events WHERE operation_key=?')
          .get(input.operationKey) as { purchase_id: string; payload_hash: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== hash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador ya corresponde a otra operación.',
            );
          return this.detail(replay.purchase_id);
        }
        const purchase = this.detail(input.purchaseId);
        if (purchase.status === 'VOIDED')
          throw new DomainError('VALIDATION', 'La compra ya está anulada.');
        const preview = this.previewVoid(input.purchaseId);
        if (!preview.reversible)
          throw new DomainError(
            'REVISION_CONFLICT',
            'No se puede anular automáticamente porque hay movimientos posteriores.',
          );
        for (const item of purchase.items) {
          const receipt = this.db
            .prepare("SELECT id FROM stock_movements WHERE purchase_item_id=? AND kind='RECEIPT'")
            .get(item.id);
          if (receipt)
            this.stock.appendPurchaseVoid({
              productId: item.productId,
              quantityBase: item.quantityBase,
              reason: input.reason,
              operationKey: randomUUID(),
              purchaseId: purchase.id,
              purchaseItemId: item.id,
            });
          if (this.lotsEnabled() && this.lots?.enabled(item.productId))
            this.lots.reversePurchaseItem(item.id, randomUUID(), actor, input.reason);
          this.costs.reversePurchaseItem(item.id, actor, input.reason);
        }
        this.accounts?.reversePurchase(purchase.id, input.reason);
        this.db.prepare("UPDATE purchases SET status='VOIDED' WHERE id=?").run(purchase.id);
        const result = this.detail(purchase.id);
        this.db
          .prepare(
            "INSERT INTO purchase_events (id,purchase_id,kind,reason,operation_key,payload_hash,result_json,actor_user_id,actor_name,created_at_utc) VALUES (?,?,'VOIDED',?,?,?,?,?,?,?)",
          )
          .run(
            randomUUID(),
            purchase.id,
            input.reason,
            input.operationKey,
            hash,
            JSON.stringify(result),
            actor.id,
            actor.name,
            new Date().toISOString(),
          );
        return this.detail(purchase.id);
      })
      .immediate();
  }
}
