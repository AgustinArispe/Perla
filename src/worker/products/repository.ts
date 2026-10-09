import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import { normalizeSearch } from '../../domain/values';
import { createInternalEan13 } from '../../domain/barcode';
import {
  ProductSaveSchema,
  ProductSearchSchema,
  SetActiveSchema,
  TaxonomySaveSchema,
} from '../../shared/catalog';
import type {
  Product,
  ProductSaveInput,
  ProductSearchInput,
  ProductPage,
  SetActiveInput,
  TaxonomyItem,
  TaxonomySaveInput,
} from '../../shared/catalog';
import { DomainError } from '../../shared/errors';

interface Row {
  id: string;
  sku: string;
  barcode: string | null;
  internal_barcode: string | null;
  name: string;
  search_name: string;
  category: string | null;
  category_id: string | null;
  brand_id: string | null;
  brand: string | null;
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
    internalBarcode: row.internal_barcode ?? null,
    name: row.name,
    category: row.category,
    categoryId: row.category_id,
    brand: row.brand,
    brandId: row.brand_id,
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
interface LabelRow {
  id: string;
  product_id: string;
  product_name: string;
  barcode: string;
  status: 'PENDING' | 'PRINTED';
  created_at_utc: string;
  printed_at_utc: string | null;
}
const CursorSchema = z.strictObject({
  saleUnit: z.enum(['UNIT', 'KG']).optional(),
  name: z.string().max(200),
  id: z.uuid(),
  query: z.string(),
  status: z.string(),
  categoryId: z.uuid().optional(),
  brandId: z.uuid().optional(),
});
interface TaxonomyRow {
  id: string;
  name: string;
  active: number;
  revision: number;
  created_at_utc: string;
  updated_at_utc: string;
}
const mapTaxonomy = (row: TaxonomyRow): TaxonomyItem => ({
  id: row.id,
  name: row.name,
  active: Boolean(row.active),
  revision: row.revision,
  createdAt: row.created_at_utc,
  updatedAt: row.updated_at_utc,
});
export class CatalogRepository {
  private taxonomyAvailable: boolean;
  private identificationAvailable: boolean;
  constructor(private readonly db: Database.Database) {
    db.function('bocha_search', { deterministic: true }, (value: unknown) =>
      normalizeSearch(String(value ?? '')),
    );
    this.taxonomyAvailable = Boolean(
      db
        .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='product_categories'")
        .get(),
    );
    this.identificationAvailable = (db.pragma('table_info(products)') as { name: string }[]).some(
      (column) => column.name === 'internal_barcode',
    );
  }
  private selectProducts(): string {
    return this.taxonomyAvailable
      ? 'SELECT p.*, b.name AS brand FROM products p LEFT JOIN product_brands b ON b.id=p.brand_id'
      : 'SELECT p.*, NULL AS category_id, NULL AS brand_id, NULL AS brand FROM products p';
  }
  get(id: string): Product {
    const row = this.db.prepare(`${this.selectProducts()} WHERE p.id=?`).get(id) as Row | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'No se encontró el producto.');
    return map(row);
  }
  findBySku(sku: string): Product | undefined {
    const row = this.db
      .prepare(`${this.selectProducts()} WHERE p.sku=?`)
      .get(sku.toUpperCase().trim()) as Row | undefined;
    return row ? map(row) : undefined;
  }
  findByBarcode(barcode: string): Product {
    const value = barcode.trim();
    const row = this.identificationAvailable
      ? (this.db
          .prepare(
            `${this.selectProducts()} WHERE p.barcode=? OR p.internal_barcode=? ORDER BY CASE WHEN p.barcode=? THEN 0 ELSE 1 END LIMIT 1`,
          )
          .get(value, value, value) as Row | undefined)
      : (this.db.prepare(`${this.selectProducts()} WHERE p.barcode=?`).get(value) as
          Row | undefined);
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
  private nextInternalBarcode(): string {
    const row = this.db
      .prepare("SELECT next_value FROM barcode_sequences WHERE namespace='internal_ean13'")
      .get() as { next_value: number } | undefined;
    if (!row) throw new DomainError('INTERNAL', 'No se pudo reservar un código interno.');
    this.db
      .prepare(
        "UPDATE barcode_sequences SET next_value=next_value+1 WHERE namespace='internal_ean13'",
      )
      .run();
    return createInternalEan13(row.next_value);
  }
  proposeInternalBarcode(): string {
    return this.db.transaction(() => this.nextInternalBarcode()).immediate();
  }
  labels(input: { status?: 'PENDING' | 'PRINTED' | undefined } = {}): {
    items: import('../../shared/catalog').ProductLabel[];
    total: number;
  } {
    const where = input.status ? ' WHERE l.status=?' : '';
    const rows = this.db
      .prepare(
        `SELECT l.id,l.product_id,p.name AS product_name,l.barcode,l.status,l.created_at_utc,l.printed_at_utc FROM product_labels l JOIN products p ON p.id=l.product_id${where} ORDER BY l.created_at_utc DESC,l.id DESC`,
      )
      .all(...(input.status ? [input.status] : [])) as LabelRow[];
    return {
      items: rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        barcode: row.barcode,
        status: row.status,
        createdAt: row.created_at_utc,
        printedAt: row.printed_at_utc,
      })),
      total: rows.length,
    };
  }
  createLabel(productId: string): import('../../shared/catalog').ProductLabel {
    return this.db
      .transaction(() => {
        const product = this.get(productId);
        if (!product.internalBarcode)
          throw new DomainError(
            'VALIDATION',
            'Este producto usa código de fábrica y no necesita una etiqueta interna.',
          );
        const now = new Date().toISOString();
        const id = randomUUID();
        this.db
          .prepare(
            "INSERT INTO product_labels (id,product_id,barcode,status,created_at_utc) VALUES (?,?,?,'PENDING',?)",
          )
          .run(id, product.id, product.internalBarcode, now);
        return this.labels().items.find((label) => label.id === id)!;
      })
      .immediate();
  }
  markLabelPrinted(id: string): import('../../shared/catalog').ProductLabel {
    return this.db
      .transaction(() => {
        const row = this.db.prepare('SELECT status FROM product_labels WHERE id=?').get(id) as
          { status: string } | undefined;
        if (!row) throw new DomainError('NOT_FOUND', 'No se encontró la etiqueta.');
        if (row.status !== 'PENDING')
          throw new DomainError('VALIDATION', 'La etiqueta ya está marcada como impresa.');
        this.db
          .prepare("UPDATE product_labels SET status='PRINTED',printed_at_utc=? WHERE id=?")
          .run(new Date().toISOString(), id);
        return this.labels().items.find((label) => label.id === id)!;
      })
      .immediate();
  }
  listTaxonomy(kind: 'categories' | 'brands', includeInactive = false): TaxonomyItem[] {
    if (!this.taxonomyAvailable) return [];
    const table = kind === 'categories' ? 'product_categories' : 'product_brands';
    const rows = this.db
      .prepare(
        `SELECT * FROM ${table}${includeInactive ? '' : ' WHERE active=1'} ORDER BY search_name,id`,
      )
      .all() as TaxonomyRow[];
    return rows.map(mapTaxonomy);
  }
  saveTaxonomy(kind: 'categories' | 'brands', raw: TaxonomySaveInput): TaxonomyItem {
    if (!this.taxonomyAvailable)
      throw new DomainError(
        'VALIDATION',
        'Actualizá la base antes de administrar categorías y marcas.',
      );
    const input = TaxonomySaveSchema.parse(raw);
    const table = kind === 'categories' ? 'product_categories' : 'product_brands';
    return this.db
      .transaction(() => {
        const now = new Date().toISOString();
        if (input.id) {
          const current = this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(input.id) as
            TaxonomyRow | undefined;
          if (!current) throw new DomainError('NOT_FOUND', 'No se encontró el registro.');
          if (current.revision !== input.expectedRevision)
            throw new DomainError(
              'REVISION_CONFLICT',
              'El registro cambió. Recargá antes de guardar.',
            );
          this.db
            .prepare(
              `UPDATE ${table} SET name=?,search_name=?,active=?,revision=revision+1,updated_at_utc=? WHERE id=? AND revision=?`,
            )
            .run(
              input.name,
              normalizeSearch(input.name),
              Number(input.active),
              now,
              input.id,
              input.expectedRevision,
            );
          return mapTaxonomy(
            this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(input.id) as TaxonomyRow,
          );
        }
        const id = randomUUID();
        this.db
          .prepare(
            `INSERT INTO ${table} (id,name,search_name,active,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,1,?,?)`,
          )
          .run(id, input.name, normalizeSearch(input.name), Number(input.active), now, now);
        return mapTaxonomy(
          this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as TaxonomyRow,
        );
      })
      .immediate();
  }
  private resolveTaxonomy(
    kind: 'categories' | 'brands',
    id: string | null | undefined,
    name: string | null | undefined,
  ): TaxonomyItem | null {
    if (!this.taxonomyAvailable) return null;
    const table = kind === 'categories' ? 'product_categories' : 'product_brands';
    if (id) {
      const row = this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as
        TaxonomyRow | undefined;
      if (!row)
        throw new DomainError('VALIDATION', 'La categoría o marca seleccionada ya no existe.');
      return mapTaxonomy(row);
    }
    if (!name?.trim()) return null;
    const searchName = normalizeSearch(name);
    const existing = this.db
      .prepare(`SELECT * FROM ${table} WHERE search_name=?`)
      .get(searchName) as TaxonomyRow | undefined;
    if (existing) return mapTaxonomy(existing);
    return this.saveTaxonomy(kind, { name, active: true });
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
        const category = this.resolveTaxonomy('categories', input.categoryId, input.category);
        const brand = this.resolveTaxonomy('brands', input.brandId, input.brand);
        const generatedInternal =
          this.identificationAvailable && !current && !input.barcode && !input.internalBarcode
            ? this.nextInternalBarcode()
            : null;
        const internalBarcode = input.barcode
          ? null
          : (input.internalBarcode ?? generatedInternal ?? current?.internalBarcode ?? null);
        const values = [
          input.sku,
          input.barcode,
          internalBarcode,
          input.name,
          normalizeSearch(input.name),
          category?.name ?? null,
          category?.id ?? null,
          brand?.id ?? null,
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
          const baseValues = this.taxonomyAvailable
            ? this.identificationAvailable
              ? values
              : [
                  input.sku,
                  input.barcode,
                  input.name,
                  normalizeSearch(input.name),
                  category?.name ?? null,
                  category?.id ?? null,
                  brand?.id ?? null,
                  input.saleUnit,
                  input.priceCents,
                  Number(input.active),
                  Number(input.trackStock),
                  input.minStockBase,
                ]
            : this.identificationAvailable
              ? [
                  input.sku,
                  input.barcode,
                  internalBarcode,
                  input.name,
                  normalizeSearch(input.name),
                  input.category,
                  input.saleUnit,
                  input.priceCents,
                  Number(input.active),
                  Number(input.trackStock),
                  input.minStockBase,
                ]
              : [
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
          this.db
            .prepare(
              this.taxonomyAvailable
                ? this.identificationAvailable
                  ? 'UPDATE products SET sku=?, barcode=?, internal_barcode=?, name=?, search_name=?, category=?, category_id=?, brand_id=?, sale_unit=?, price_cents=?, active=?, track_stock=?, min_stock_base=?, stock_initialized=?, revision=revision+1, updated_at_utc=? WHERE id=? AND revision=?'
                  : 'UPDATE products SET sku=?, barcode=?, name=?, search_name=?, category=?, category_id=?, brand_id=?, sale_unit=?, price_cents=?, active=?, track_stock=?, min_stock_base=?, stock_initialized=?, revision=revision+1, updated_at_utc=? WHERE id=? AND revision=?'
                : this.identificationAvailable
                  ? 'UPDATE products SET sku=?, barcode=?, internal_barcode=?, name=?, search_name=?, category=?, sale_unit=?, price_cents=?, active=?, track_stock=?, min_stock_base=?, stock_initialized=?, revision=revision+1, updated_at_utc=? WHERE id=? AND revision=?'
                  : 'UPDATE products SET sku=?, barcode=?, name=?, search_name=?, category=?, sale_unit=?, price_cents=?, active=?, track_stock=?, min_stock_base=?, stock_initialized=?, revision=revision+1, updated_at_utc=? WHERE id=? AND revision=?',
            )
            .run(...baseValues, initialized, now, id, input.expectedRevision);
        } else {
          const baseValues = this.taxonomyAvailable
            ? this.identificationAvailable
              ? values
              : [
                  input.sku,
                  input.barcode,
                  input.name,
                  normalizeSearch(input.name),
                  category?.name ?? null,
                  category?.id ?? null,
                  brand?.id ?? null,
                  input.saleUnit,
                  input.priceCents,
                  Number(input.active),
                  Number(input.trackStock),
                  input.minStockBase,
                ]
            : this.identificationAvailable
              ? [
                  input.sku,
                  input.barcode,
                  internalBarcode,
                  input.name,
                  normalizeSearch(input.name),
                  input.category,
                  input.saleUnit,
                  input.priceCents,
                  Number(input.active),
                  Number(input.trackStock),
                  input.minStockBase,
                ]
              : [
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
          this.db
            .prepare(
              this.taxonomyAvailable
                ? this.identificationAvailable
                  ? 'INSERT INTO products (sku,barcode,internal_barcode,name,search_name,category,category_id,brand_id,sale_unit,price_cents,active,track_stock,min_stock_base,id,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)'
                  : 'INSERT INTO products (sku,barcode,name,search_name,category,category_id,brand_id,sale_unit,price_cents,active,track_stock,min_stock_base,id,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)'
                : this.identificationAvailable
                  ? 'INSERT INTO products (sku,barcode,internal_barcode,name,search_name,category,sale_unit,price_cents,active,track_stock,min_stock_base,id,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)'
                  : 'INSERT INTO products (sku,barcode,name,search_name,category,sale_unit,price_cents,active,track_stock,min_stock_base,id,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?)',
            )
            .run(...baseValues, id, now, now);
        }
        if (!current && generatedInternal)
          this.db
            .prepare(
              "INSERT INTO product_labels (id,product_id,barcode,status,created_at_utc) VALUES (?,?,?,'PENDING',?)",
            )
            .run(randomUUID(), id, generatedInternal, now);
        return this.get(id);
      })
      .immediate();
  }
  setActive(raw: SetActiveInput): Product {
    const input = SetActiveSchema.parse(raw);
    const product = this.get(input.productId);
    const {
      id,
      sku,
      barcode,
      internalBarcode,
      name,
      category,
      categoryId,
      brand,
      brandId,
      saleUnit,
      priceCents,
      trackStock,
      minStockBase,
    } = product;
    return this.save({
      id,
      sku,
      barcode,
      internalBarcode,
      name,
      category,
      categoryId,
      brand,
      brandId,
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
    const where = `(p.search_name LIKE ? ESCAPE '\\' OR bocha_search(p.sku) LIKE ? ESCAPE '\\' OR bocha_search(p.barcode) LIKE ? ESCAPE '\\')${status === 'ALL' ? '' : ' AND p.active=?'}${input.saleUnit ? ' AND p.sale_unit=?' : ''}${input.categoryId ? ' AND p.category_id=?' : ''}${input.brandId ? ' AND p.brand_id=?' : ''}`;
    const parameters: (string | number)[] = [pattern, pattern, pattern];
    if (status !== 'ALL') parameters.push(status === 'ACTIVE' ? 1 : 0);
    if (input.saleUnit) parameters.push(input.saleUnit);
    if (input.categoryId) parameters.push(input.categoryId);
    if (input.brandId) parameters.push(input.brandId);
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS count FROM products p WHERE ${where}`)
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
      if (
        cursor.query !== query ||
        cursor.status !== status ||
        cursor.saleUnit !== input.saleUnit ||
        cursor.categoryId !== input.categoryId ||
        cursor.brandId !== input.brandId
      )
        throw new DomainError('VALIDATION', 'La búsqueda cambió; volvé a la primera página.');
      after = ' AND (p.search_name>? OR (p.search_name=? AND p.id>?))';
      pageParameters.push(cursor.name, cursor.name, cursor.id);
    }
    const rows = this.db
      .prepare(
        `${this.selectProducts()} WHERE ${where}${after} ORDER BY p.search_name,p.id LIMIT ?`,
      )
      .all(...pageParameters, input.limit + 1) as Row[];
    const items = rows.slice(0, input.limit);
    const last = items.at(-1);
    return {
      items: items.map(map),
      total,
      nextCursor:
        rows.length > input.limit && last
          ? Buffer.from(
              JSON.stringify({
                name: last.search_name,
                id: last.id,
                query,
                status,
                saleUnit: input.saleUnit,
                categoryId: input.categoryId,
                brandId: input.brandId,
              }),
            ).toString('base64url')
          : null,
    };
  }
}
