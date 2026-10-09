import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { normalizeSearch } from '../../domain/values';
import { stockState, nextBalance } from '../../domain/inventory';
import { DomainError } from '../../shared/errors';
import { IdSchema } from '../../shared/catalog';
import {
  StockCountSchema,
  StockRecordSchema,
  StockSearchSchema,
  StockMovementsSchema,
} from '../../shared/stock';
import type {
  StockBalance,
  StockCountInput,
  StockRecordInput,
  StockSearchInput,
  StockPage,
  StockMovementsInput,
  MovementPage,
  StockMovement,
} from '../../shared/stock';
import { CatalogRepository } from '../products/repository';
import { StockRepository } from './repository';

const stateSql = `CASE WHEN p.track_stock=0 THEN 'DISABLED' WHEN p.stock_initialized=0 THEN 'UNKNOWN' WHEN b.quantity_base<0 THEN 'NEGATIVE' WHEN b.quantity_base=0 THEN 'OUT' WHEN b.quantity_base<=p.min_stock_base THEN 'LOW' ELSE 'OK' END`;
const Cursor = z.strictObject({
  name: z.string(),
  id: IdSchema,
  query: z.string(),
  filter: z.string(),
  includeInactive: z.boolean(),
  categoryId: IdSchema.optional(),
  brandId: IdSchema.optional(),
});
const MovementCursor = z.strictObject({
  sequence: z.number().int().positive(),
  productId: IdSchema,
  fromDate: z.string(),
  toDate: z.string(),
});
function decode<T>(schema: z.ZodType<T>, cursor: string): T {
  try {
    return schema.parse(JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')));
  } catch {
    throw new DomainError('VALIDATION', 'La página solicitada no es válida.');
  }
}
const encode = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');

export class StockService {
  private readonly ledger: StockRepository;
  constructor(
    private readonly db: Database.Database,
    private readonly catalog: CatalogRepository,
  ) {
    this.ledger = new StockRepository(db);
  }
  get(rawId: string): StockBalance {
    const product = this.catalog.get(IdSchema.parse(rawId));
    const balance = this.ledger.balance(product.id);
    if (product.stockInitialized && !balance)
      throw new DomainError(
        'BACKUP_INVALID',
        'El balance de este producto no está disponible. Revisá la base antes de continuar.',
      );
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      unit: product.saleUnit,
      quantityBase:
        product.trackStock && product.stockInitialized ? (balance?.quantity_base ?? null) : null,
      minStockBase: product.minStockBase,
      initialized: product.stockInitialized,
      trackStock: product.trackStock,
      active: product.active,
      revision: balance?.revision ?? 0,
      productRevision: product.revision,
      state: stockState(
        product.trackStock,
        product.stockInitialized,
        balance?.quantity_base ?? 0,
        product.minStockBase,
      ),
    };
  }
  opening(input: StockCountInput): StockBalance {
    return this.mutate('opening', StockCountSchema.parse(input));
  }
  operation(key: string): StockBalance | null {
    const row = this.db
      .prepare('SELECT result_json FROM stock_movements WHERE operation_key=?')
      .get(IdSchema.parse(key)) as { result_json: string } | undefined;
    return row ? (JSON.parse(row.result_json) as StockBalance) : null;
  }
  count(input: StockCountInput): StockBalance {
    return this.mutate('count', StockCountSchema.parse(input));
  }
  record(input: StockRecordInput): StockBalance {
    return this.mutate('record', StockRecordSchema.parse(input));
  }
  appendPurchaseVoid(input: {
    productId: string;
    quantityBase: number;
    reason: string;
    operationKey: string;
    purchaseId: string;
    purchaseItemId: string;
  }): StockBalance {
    if (!this.db.inTransaction) throw new Error('La anulación requiere una transacción activa.');
    const current = this.get(input.productId);
    if (!current.trackStock || !current.initialized || current.quantityBase === null)
      throw new DomainError(
        'REVISION_CONFLICT',
        'La existencia requiere revisión antes de anular.',
      );
    const next = nextBalance(current.quantityBase, -input.quantityBase, false);
    const result: StockBalance = {
      ...current,
      quantityBase: next,
      revision: current.revision + 1,
      state: stockState(true, true, next, current.minStockBase),
    };
    this.ledger.appendWithinTransaction({
      productId: input.productId,
      deltaBase: -input.quantityBase,
      nextBase: next,
      revision: result.revision,
      kind: 'VOID',
      reason: input.reason,
      operationKey: input.operationKey,
      hash: createHash('sha256').update(JSON.stringify(input)).digest('hex'),
      result,
      purchaseId: input.purchaseId,
      purchaseItemId: input.purchaseItemId,
    });
    return result;
  }
  private mutate(
    action: 'opening' | 'count' | 'record',
    input: StockCountInput | StockRecordInput,
  ): StockBalance {
    const hash = createHash('sha256')
      .update(JSON.stringify({ action, ...input }))
      .digest('hex');
    return this.db
      .transaction(() => {
        const previous = this.ledger.replay(input.operationKey, hash);
        if (previous) return previous;
        const current = this.get(input.productId);
        if (!current.trackStock)
          throw new DomainError(
            'VALIDATION',
            'Activá el control de stock en Productos antes de contar.',
          );
        if (
          current.revision !== input.expectedRevision ||
          current.productRevision !== input.expectedProductRevision
        )
          throw new DomainError(
            'REVISION_CONFLICT',
            'El producto o su existencia cambió. Recargá los datos antes de registrar.',
          );
        if (action === 'opening' && current.initialized)
          throw new DomainError(
            'VALIDATION',
            'Ya tiene conteo inicial. Usá Contar para registrar una corrección.',
          );
        if (action !== 'opening' && !current.initialized)
          throw new DomainError('VALIDATION', 'Registrá primero un conteo inicial real.');
        const old = this.ledger.balance(input.productId)?.quantity_base ?? 0;
        const counted = 'countedBase' in input;
        const delta = counted ? input.countedBase - old : input.deltaBase;
        const next = nextBalance(
          old,
          delta,
          counted || ('allowNegative' in input && Boolean(input.allowNegative)),
        );
        const kind = counted
          ? action === 'opening' && !this.ledger.balance(input.productId)
            ? 'OPENING'
            : 'ADJUSTMENT'
          : input.kind;
        if (action === 'opening')
          this.db
            .prepare(
              'UPDATE products SET stock_initialized=1,revision=revision+1,updated_at_utc=? WHERE id=?',
            )
            .run(new Date().toISOString(), input.productId);
        const result = {
          ...current,
          productRevision: current.productRevision + (action === 'opening' ? 1 : 0),
          quantityBase: next,
          initialized: true,
          revision: current.revision + 1,
          state: stockState(true, true, next, current.minStockBase),
        };
        this.ledger.appendWithinTransaction({
          productId: input.productId,
          deltaBase: delta,
          nextBase: next,
          revision: result.revision,
          kind,
          reason: input.reason,
          operationKey: input.operationKey,
          hash,
          result,
        });
        return result;
      })
      .immediate();
  }
  search(raw: StockSearchInput): StockPage {
    const input = StockSearchSchema.parse(raw);
    const query = normalizeSearch(input.query);
    const pattern = `%${query.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const shortageFilter = input.filter === 'SHORTAGES';
    const stateFilter = !shortageFilter && input.filter !== 'ALL';
    const where = `(p.search_name LIKE ? ESCAPE '\\' OR bocha_search(p.sku) LIKE ? ESCAPE '\\' OR bocha_search(p.barcode) LIKE ? ESCAPE '\\')${input.includeInactive ? '' : ' AND p.active=1'}${shortageFilter ? ' AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base' : stateFilter ? ` AND (${stateSql})=?` : ''}${input.categoryId ? ' AND p.category_id=?' : ''}${input.brandId ? ' AND p.brand_id=?' : ''}`;
    const parameters: (string | number)[] = [pattern, pattern, pattern];
    if (stateFilter) parameters.push(input.filter);
    if (input.categoryId) parameters.push(input.categoryId);
    if (input.brandId) parameters.push(input.brandId);
    const from = 'FROM products p LEFT JOIN inventory_balances b ON b.product_id=p.id';
    const total = (
      this.db.prepare(`SELECT COUNT(*) AS count ${from} WHERE ${where}`).get(...parameters) as {
        count: number;
      }
    ).count;
    let after = '';
    const pageParams = [...parameters];
    if (input.cursor) {
      const cursor = decode(Cursor, input.cursor);
      if (
        cursor.query !== query ||
        cursor.filter !== input.filter ||
        cursor.includeInactive !== input.includeInactive ||
        cursor.categoryId !== input.categoryId ||
        cursor.brandId !== input.brandId
      )
        throw new DomainError('VALIDATION', 'La búsqueda cambió; volvé a la primera página.');
      after = ' AND (p.search_name>? OR (p.search_name=? AND p.id>?))';
      pageParams.push(cursor.name, cursor.name, cursor.id);
    }
    const rows = this.db
      .prepare(
        `SELECT p.id,p.search_name ${from} WHERE ${where}${after} ORDER BY p.search_name,p.id LIMIT ?`,
      )
      .all(...pageParams, input.limit + 1) as { id: string; search_name: string }[];
    const page = rows.slice(0, input.limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => this.get(row.id)),
      total,
      nextCursor:
        rows.length > input.limit && last
          ? encode({
              name: last.search_name,
              id: last.id,
              query,
              filter: input.filter,
              includeInactive: input.includeInactive,
              categoryId: input.categoryId,
              brandId: input.brandId,
            })
          : null,
    };
  }
  listLow(input: { limit: number; cursor?: string }): StockPage {
    // OUT and NEGATIVE are also shortages; UNKNOWN and DISABLED are deliberately excluded.
    const parsed = z
      .strictObject({
        limit: z.number().int().min(1).max(100),
        cursor: z.string().max(1200).optional(),
      })
      .parse(input);
    // Use a dedicated predicate while preserving the same paging implementation.
    return this.lowPage({
      limit: parsed.limit,
      ...(parsed.cursor ? { cursor: parsed.cursor } : {}),
    });
  }
  private lowPage(input: { limit: number; cursor?: string }): StockPage {
    const predicate =
      'p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base';
    const from = 'FROM products p JOIN inventory_balances b ON b.product_id=p.id';
    const total = (
      this.db.prepare(`SELECT COUNT(*) AS count ${from} WHERE ${predicate}`).get() as {
        count: number;
      }
    ).count;
    let after = '';
    const params: (number | string)[] = [];
    if (input.cursor) {
      const cursor = decode(Cursor, input.cursor);
      if (cursor.filter !== 'SHORTAGES' || cursor.query !== '' || cursor.includeInactive)
        throw new DomainError('VALIDATION', 'La página de reposición no es válida.');
      after = ' AND (p.search_name>? OR (p.search_name=? AND p.id>?))';
      params.push(cursor.name, cursor.name, cursor.id);
    }
    const rows = this.db
      .prepare(
        `SELECT p.id,p.search_name ${from} WHERE ${predicate}${after} ORDER BY p.search_name,p.id LIMIT ?`,
      )
      .all(...params, input.limit + 1) as { id: string; search_name: string }[];
    const page = rows.slice(0, input.limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => this.get(row.id)),
      total,
      nextCursor:
        rows.length > input.limit && last
          ? encode({
              name: last.search_name,
              id: last.id,
              query: '',
              filter: 'SHORTAGES',
              includeInactive: false,
            })
          : null,
    };
  }
  movements(raw: StockMovementsInput): MovementPage {
    const input = StockMovementsSchema.parse(raw);
    this.catalog.get(input.productId);
    let where = 'product_id=?';
    const params: (number | string)[] = [input.productId];
    if (input.fromDate) {
      where += ' AND business_date>=?';
      params.push(input.fromDate);
    }
    if (input.toDate) {
      where += ' AND business_date<=?';
      params.push(input.toDate);
    }
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM stock_movements WHERE ${where}`)
        .get(...params) as { count: number }
    ).count;
    if (input.cursor) {
      const cursor = decode(MovementCursor, input.cursor);
      if (
        cursor.productId !== input.productId ||
        cursor.fromDate !== (input.fromDate ?? '') ||
        cursor.toDate !== (input.toDate ?? '')
      )
        throw new DomainError('VALIDATION', 'El filtro cambió; volvé a la primera página.');
      where += ' AND sequence<?';
      params.push(cursor.sequence);
    }
    const rows = this.db
      .prepare(`SELECT * FROM stock_movements WHERE ${where} ORDER BY sequence DESC LIMIT ?`)
      .all(...params, input.limit + 1) as {
      sequence: number;
      id: string;
      product_id: string;
      delta_base: number;
      balance_after_base: number;
      kind: StockMovement['kind'];
      reason: string;
      created_at_utc: string;
      business_date: string;
    }[];
    const page = rows.slice(0, input.limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => ({
        id: row.id,
        productId: row.product_id,
        deltaBase: row.delta_base,
        balanceAfterBase: row.balance_after_base,
        kind: row.kind,
        reason: row.reason,
        createdAt: row.created_at_utc,
        businessDate: row.business_date,
      })),
      total,
      nextCursor:
        rows.length > input.limit && last
          ? encode({
              sequence: last.sequence,
              productId: input.productId,
              fromDate: input.fromDate ?? '',
              toDate: input.toDate ?? '',
            })
          : null,
    };
  }
}
