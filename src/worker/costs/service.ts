import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { Product } from '../../shared/catalog';
import type { User } from '../../shared/auth';
import { CostReferenceSchema, type CostReferenceInput, type ProductCost } from '../../shared/costs';
import { DomainError } from '../../shared/errors';
import { costRateFromUnitCost, unitCostFromRate, weightedAverageCost } from '../../domain/costs';

type CostRow = {
  product_id: string;
  method: ProductCost['method'];
  rate_micros_per_base: number;
  covered_quantity_base: number;
  revision: number;
  effective_at_utc: string;
  actor_user_id: string;
  actor_name: string;
};

export class CostService {
  constructor(private readonly db: Database.Database) {}

  get(productId: string): ProductCost | null {
    const row = this.db
      .prepare('SELECT * FROM product_cost_states WHERE product_id=?')
      .get(productId) as CostRow | undefined;
    if (!row) return null;
    const unit = (
      this.db.prepare('SELECT sale_unit unit FROM products WHERE id=?').get(productId) as
        { unit: 'UNIT' | 'KG' } | undefined
    )?.unit;
    if (!unit) throw new DomainError('NOT_FOUND', 'El producto no existe.');
    return {
      productId: row.product_id,
      method: row.method,
      rateMicrosPerBase: row.rate_micros_per_base,
      unitCostCents: unitCostFromRate(unit, row.rate_micros_per_base),
      coveredQuantityBase: row.covered_quantity_base,
      revision: row.revision,
      effectiveAt: row.effective_at_utc,
      actorUserId: row.actor_user_id,
      actorName: row.actor_name,
    };
  }

  getUsable(productId: string, quantityOnHand: number | null): ProductCost | null {
    const cost = this.get(productId);
    if (!cost || cost.method === 'REFERENCE') return cost;
    if (quantityOnHand === null || Math.max(0, quantityOnHand) > cost.coveredQuantityBase)
      return null;
    return cost;
  }

  setReference(raw: CostReferenceInput, actor: User): ProductCost {
    const input = CostReferenceSchema.parse(raw);
    const product = this.db
      .prepare('SELECT sale_unit unit,track_stock trackStock FROM products WHERE id=?')
      .get(input.productId) as { unit: 'UNIT' | 'KG'; trackStock: number } | undefined;
    if (!product) throw new DomainError('NOT_FOUND', 'El producto no existe.');
    if (product.trackStock)
      throw new DomainError(
        'VALIDATION',
        'El costo de un producto con stock se calcula desde sus compras.',
      );
    const before = this.get(input.productId);
    if ((before?.revision ?? 0) !== input.expectedRevision)
      throw new DomainError('REVISION_CONFLICT', 'El costo cambió. Actualizalo antes de guardar.');
    return this.write({
      productId: input.productId,
      method: 'REFERENCE',
      rate: costRateFromUnitCost(product.unit, input.unitCostCents),
      covered: 0,
      before,
      kind: 'REFERENCE',
      reason: 'Costo de referencia actualizado',
      actor,
    });
  }

  invalidateForUnitChange(
    productId: string,
    previousUnit: Product['saleUnit'],
    nextUnit: Product['saleUnit'],
    actor: User,
  ): void {
    if (previousUnit === nextUnit) return;
    const before = this.get(productId);
    if (!before) return;
    const now = new Date().toISOString();
    this.clear(productId);
    this.insertEvent({
      productId,
      kind: 'INVALIDATED',
      before,
      afterMethod: null,
      afterRate: null,
      afterCovered: null,
      afterRevision: null,
      reason: `Unidad cambiada de ${previousUnit} a ${nextUnit}`,
      actor,
      now,
    });
  }

  receive(input: {
    product: Product;
    oldQuantityBase: number;
    receivedQuantityBase: number;
    unitCostCents: number;
    purchaseId: string;
    purchaseItemId: string;
    actor: User;
  }): ProductCost {
    const before = this.get(input.product.id);
    const receivedRate = costRateFromUnitCost(input.product.saleUnit, input.unitCostCents);
    const usableOldQuantity =
      before?.method === 'WEIGHTED_AVERAGE'
        ? Math.min(Math.max(input.oldQuantityBase, 0), before.coveredQuantityBase)
        : 0;
    const rate = weightedAverageCost({
      oldQuantityBase: usableOldQuantity,
      oldRateMicros: before?.method === 'WEIGHTED_AVERAGE' ? before.rateMicrosPerBase : 0,
      receivedQuantityBase: input.receivedQuantityBase,
      receivedRateMicros: receivedRate,
    });
    return this.write({
      productId: input.product.id,
      method: 'WEIGHTED_AVERAGE',
      rate,
      covered: usableOldQuantity + input.receivedQuantityBase,
      before,
      kind: 'RECEIPT',
      reason: 'Compra recibida',
      purchaseId: input.purchaseId,
      purchaseItemId: input.purchaseItemId,
      actor: input.actor,
    });
  }

  canReversePurchaseItem(purchaseItemId: string): { reversible: boolean; reason: string | null } {
    const event = this.db
      .prepare(
        "SELECT product_id,after_revision FROM product_cost_events WHERE purchase_item_id=? AND kind='RECEIPT'",
      )
      .get(purchaseItemId) as { product_id: string; after_revision: number } | undefined;
    if (!event) return { reversible: true, reason: null };
    const current = this.get(event.product_id);
    return !current || current.revision !== event.after_revision
      ? { reversible: false, reason: 'Tiene una compra o corrección de costo posterior.' }
      : { reversible: true, reason: null };
  }

  reversePurchaseItem(purchaseItemId: string, actor: User, reason: string): ProductCost | null {
    const event = this.db
      .prepare("SELECT * FROM product_cost_events WHERE purchase_item_id=? AND kind='RECEIPT'")
      .get(purchaseItemId) as Record<string, unknown> | undefined;
    if (!event) return null;
    const productId = String(event.product_id);
    const current = this.get(productId);
    if (!current || current.revision !== Number(event.after_revision))
      throw new DomainError(
        'REVISION_CONFLICT',
        'Hay un costo posterior. Anulá o corregí esa compra antes de continuar.',
      );
    const now = new Date().toISOString();
    const nextRevision = current.revision + 1;
    if (event.before_method === null) this.clear(productId);
    else
      this.db
        .prepare(
          'UPDATE products SET cost_method=?,cost_rate_micros_per_base=?,cost_covered_quantity_base=?,cost_revision=?,cost_effective_at_utc=?,cost_actor_user_id=?,cost_actor_name=? WHERE id=?',
        )
        .run(
          event.before_method,
          event.before_rate_micros_per_base,
          event.before_covered_quantity_base,
          nextRevision,
          now,
          actor.id,
          actor.name,
          productId,
        );
    this.insertEvent({
      productId,
      kind: 'VOID',
      before: current,
      afterMethod: event.before_method as ProductCost['method'] | null,
      afterRate: event.before_rate_micros_per_base as number | null,
      afterCovered: event.before_covered_quantity_base as number | null,
      afterRevision: event.before_method === null ? null : nextRevision,
      purchaseId: event.purchase_id as string,
      purchaseItemId,
      reason,
      actor,
      now,
    });
    return this.get(productId);
  }

  private write(input: {
    productId: string;
    method: ProductCost['method'];
    rate: number;
    covered: number;
    before: ProductCost | null;
    kind: 'REFERENCE' | 'RECEIPT';
    reason: string;
    purchaseId?: string;
    purchaseItemId?: string;
    actor: User;
  }): ProductCost {
    const now = new Date().toISOString();
    const revision = (input.before?.revision ?? 0) + 1;
    this.db
      .prepare(
        `UPDATE products SET cost_method=?,cost_rate_micros_per_base=?,cost_covered_quantity_base=?,cost_revision=?,cost_effective_at_utc=?,cost_actor_user_id=?,cost_actor_name=? WHERE id=?`,
      )
      .run(
        input.method,
        input.rate,
        input.covered,
        revision,
        now,
        input.actor.id,
        input.actor.name,
        input.productId,
      );
    this.insertEvent({
      productId: input.productId,
      kind: input.kind,
      before: input.before,
      afterMethod: input.method,
      afterRate: input.rate,
      afterCovered: input.covered,
      afterRevision: revision,
      ...(input.purchaseId ? { purchaseId: input.purchaseId } : {}),
      ...(input.purchaseItemId ? { purchaseItemId: input.purchaseItemId } : {}),
      reason: input.reason,
      actor: input.actor,
      now,
    });
    return this.get(input.productId)!;
  }

  private clear(productId: string): void {
    this.db
      .prepare(
        `UPDATE products SET cost_method=NULL,cost_rate_micros_per_base=NULL,
      cost_covered_quantity_base=NULL,cost_revision=NULL,cost_effective_at_utc=NULL,
      cost_actor_user_id=NULL,cost_actor_name=NULL WHERE id=?`,
      )
      .run(productId);
  }

  private insertEvent(input: {
    productId: string;
    kind: 'REFERENCE' | 'RECEIPT' | 'VOID' | 'INVALIDATED';
    before: ProductCost | null;
    afterMethod: ProductCost['method'] | null;
    afterRate: number | null;
    afterCovered: number | null;
    afterRevision: number | null;
    purchaseId?: string;
    purchaseItemId?: string;
    reason: string;
    actor: User;
    now: string;
  }) {
    this.db
      .prepare(
        'INSERT INTO product_cost_events(id,product_id,kind,before_method,before_rate_micros_per_base,before_covered_quantity_base,before_revision,after_method,after_rate_micros_per_base,after_covered_quantity_base,after_revision,purchase_id,purchase_item_id,reason,actor_user_id,actor_name,created_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
      )
      .run(
        randomUUID(),
        input.productId,
        input.kind,
        input.before?.method ?? null,
        input.before?.rateMicrosPerBase ?? null,
        input.before?.coveredQuantityBase ?? null,
        input.before?.revision ?? null,
        input.afterMethod,
        input.afterRate,
        input.afterCovered,
        input.afterRevision,
        input.purchaseId ?? null,
        input.purchaseItemId ?? null,
        input.reason,
        input.actor.id,
        input.actor.name,
        input.now,
      );
  }
}
