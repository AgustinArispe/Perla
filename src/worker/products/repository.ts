import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { normalizeSearch } from '../../domain/values';
import { ProductSaveSchema, ProductSearchSchema, SetActiveSchema } from '../../shared/catalog';
import type {
  Product,
  ProductSaveInput,
  ProductSearchInput,
  ProductPage,
  SetActiveInput,
} from '../../shared/catalog';
import { DomainError } from '../../shared/errors';

interface Row {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  search_name: string;
  category: string | null;
  sale_unit: 'UNIT' | 'KG';
  price_cents: number;
  active: number;
  track_stock: number;
  stock_initialized: number;
  min_stock_base: number;
  revision: number;
  created_at_utc: string;
  updated_at_utc: string;
}
function map(row: Row): Product {
  return {
    id: row.id,
    sku: row.sku,
    barcode: row.barcode,
    name: row.name,
    category: row.category,
    saleUnit: row.sale_unit,
    priceCents: row.price_cents,
    active: Boolean(row.active),
    trackStock: Boolean(row.track_stock),
    stockInitialized: Boolean(row.stock_initialized),
    minStockBase: row.min_stock_base,
    revision: row.revision,
    createdAt: row.created_at_utc,
    updatedAt: row.updated_at_utc,
  };
}
const CursorSchema = z.strictObject({
  name: z.string().max(200),
  id: z.uuid(),
  query: z.string(),
  status: z.string(),
});
export class CatalogRepository {
  constructor(private readonly db: Database.Database) {
    db.function('bocha_search', { deterministic: true }, (value: unknown) =>
      normalizeSearch(String(value ?? '')),
    );
  }
  get(id: string): Product {
    const row = this.db.prepare('SELECT * FROM products WHERE id=?').get(id) as Row | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'No se encontró el producto.');
    return map(row);
  }
  findBySku(sku: string): Product | undefined {
    const row = this.db
      .prepare('SELECT * FROM products WHERE sku=?')
      .get(sku.toUpperCase().trim()) as Row | undefined;
    return row ? map(row) : undefined;
  }
  findByBarcode(barcode: string): Product {
    const row = this.db.prepare('SELECT * FROM products WHERE barcode=?').get(barcode.trim()) as
      Row | undefined;
    if (!row)
      throw new DomainError(
        'NOT_FOUND',
        'Ese código no está cargado. Buscá el producto o agregalo al catálogo.',
      );
    if (!row.active)
      throw new DomainError(
        'INACTIVE',
        'Este producto está inactivo. Activá el producto antes de venderlo.',
      );
    return map(row);
  }
  hasUsage(id: string): boolean {
    for (const table of ['stock_movements', 'sale_items']) {
      if (
        this.db
          .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
          .get(table) &&
        this.db.prepare(`SELECT 1 FROM ${table} WHERE product_id=? LIMIT 1`).get(id)
      )
        return true;
    }
    return false;
  }
  save(raw: ProductSaveInput): Product {
    const input = ProductSaveSchema.parse(raw);
    return this.db
      .transaction(() => {
        const current = input.id ? this.get(input.id) : null;
        if (current && current.revision !== input.expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El producto cambió desde que lo abriste. Recargá sus datos antes de guardar.',
          );
        if (current && current.saleUnit !== input.saleUnit && this.hasUsage(current.id))
          throw new DomainError(
            'VALIDATION',
            'No se puede cambiar la unidad de un producto con ventas o movimientos. Creá otro producto.',
          );
        const id = current?.id ?? randomUUID();
        const now = new Date().toISOString();
        const values = [
          input.sku,
          input.barcode,
          input.name,
          normalizeSearch(input.name),
          input.category,
          input.saleUnit,
          input.priceCents,
          Number(input.active),
          Number(input.trackStock),
          input.minStockBase,
        ];
        if (current) {
          const initialized =
            input.trackStock && current.trackStock && input.saleUnit === current.saleUnit
              ? Number(current.stockInitialized)
              : 0;
          this.db
            .prepare(
              'UPDATE products SET sku=?, barcode=?, name=?, search_name=?, category=?, sale_unit=?, price_cents=?, active=?, track_stock=?, min_stock_base=?, stock_initialized=?, revision=revision+1, updated_at_utc=? WHERE id=? AND revision=?',
            )
            .run(...values, initialized, now, id, input.expectedRevision);
        } else {
          this.db
            .prepare(
              'INSERT INTO products (sku,barcode,name,search_name,category,sale_unit,price_cents,active,track_stock,min_stock_base,id,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)',
            )
            .run(...values, id, now, now);
        }
        return this.get(id);
      })
      .immediate();
  }
  setActive(raw: SetActiveInput): Product {
    const input = SetActiveSchema.parse(raw);
    const product = this.get(input.productId);
    const { id, sku, barcode, name, category, saleUnit, priceCents, trackStock, minStockBase } =
      product;
    return this.save({
      id,
      sku,
      barcode,
      name,
      category,
      saleUnit,
      priceCents,
      trackStock,
      minStockBase,
      active: input.active,
      expectedRevision: input.expectedRevision,
    });
  }
  search(raw: ProductSearchInput): ProductPage {
    const input = ProductSearchSchema.parse(raw);
    const query = normalizeSearch(input.query);
    const status = input.activeOnly ? 'ACTIVE' : input.status;
    const pattern = `%${query.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
    const where = `(search_name LIKE ? ESCAPE '\\' OR bocha_search(sku) LIKE ? ESCAPE '\\' OR bocha_search(barcode) LIKE ? ESCAPE '\\')${status === 'ALL' ? '' : ' AND active=?'}`;
    const parameters: (string | number)[] = [pattern, pattern, pattern];
    if (status !== 'ALL') parameters.push(status === 'ACTIVE' ? 1 : 0);
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM products WHERE ${where}`)
        .get(...parameters) as { count: number }
    ).count;
    let after = '';
    const pageParameters = [...parameters];
    if (input.cursor) {
      let cursor: z.infer<typeof CursorSchema>;
      try {
        cursor = CursorSchema.parse(
          JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')),
        );
      } catch {
        throw new DomainError('VALIDATION', 'La página solicitada no es válida.');
      }
      if (cursor.query !== query || cursor.status !== status)
        throw new DomainError('VALIDATION', 'La búsqueda cambió; volvé a la primera página.');
      after = ' AND (search_name>? OR (search_name=? AND id>?))';
      pageParameters.push(cursor.name, cursor.name, cursor.id);
    }
    const rows = this.db
      .prepare(`SELECT * FROM products WHERE ${where}${after} ORDER BY search_name,id LIMIT ?`)
      .all(...pageParameters, input.limit + 1) as Row[];
    const items = rows.slice(0, input.limit);
    const last = items.at(-1);
    return {
      items: items.map(map),
      total,
      nextCursor:
        rows.length > input.limit && last
          ? Buffer.from(
              JSON.stringify({ name: last.search_name, id: last.id, query, status }),
            ).toString('base64url')
          : null,
    };
  }
}
