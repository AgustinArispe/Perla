import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import { parseArs, parseQuantity, normalizeSearch } from '../../domain/values';
import { ProductInputSchema, ApplyImportSchema } from '../../shared/catalog';
import type {
  ImportPreview,
  ImportResult,
  ApplyImportInput,
  ProductSaveInput,
} from '../../shared/catalog';
import { DomainError, normalizeError } from '../../shared/errors';
import { CatalogRepository } from './repository';
import type { StockService } from '../stock/service';

type ImportEntry = ProductSaveInput & {
  openingBase?: number;
  stockRevision?: number;
  openingKey?: string;
};

const columns = [
  'sku',
  'barcode',
  'nombre',
  'precio_ars',
  'unidad',
  'activo',
  'categoria',
  'stock_inicial',
  'stock_minimo',
];
export const CSV_TEMPLATE = `${columns.join(';')}\nALM-001;0123456789012;Leche entera 1 L;1.500,00;UNIT;si;Lácteos;;5\nFIAM-001;;Jamón cocido;12.000,00;KG;si;Fiambres;;0,500\n`;
interface Pending {
  preview: ImportPreview;
  entries: ImportEntry[];
  expires: number;
}
interface Batch {
  id: string;
  source_hash: string;
  preview_token: string;
  operation_key: string;
  rows_applied: number;
}

export class CatalogImporter {
  private readonly pending = new Map<string, Pending>();
  constructor(
    private readonly db: Database.Database,
    private readonly catalog: CatalogRepository,
    private readonly stock?: StockService,
  ) {}
  preview(content: string, sourceName: string): ImportPreview {
    for (const [key, pending] of this.pending)
      if (pending.expires < Date.now()) this.pending.delete(key);
    if (Buffer.byteLength(content, 'utf8') > 10 * 1024 * 1024)
      throw new DomainError(
        'VALIDATION',
        'El archivo supera 10 MB. Dividí la carga en archivos más pequeños.',
      );
    if (this.pending.size >= 10) this.pending.delete(this.pending.keys().next().value!);
    const hash = createHash('sha256').update(content).digest('hex');
    const preview: ImportPreview = {
      previewToken: randomUUID(),
      sourceName: sourceName.slice(0, 180),
      sourceHash: hash,
      rowCount: 0,
      newCount: 0,
      updateCount: 0,
      priceChanges: 0,
      stockOpenings: 0,
      errors: [],
      rows: [],
      alreadyApplied: Boolean(
        this.db.prepare('SELECT id FROM import_batches WHERE source_hash=?').get(hash),
      ),
    };
    const entries: ImportEntry[] = [];
    const delimiter = content
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)[0]
      ?.includes(';')
      ? ';'
      : ',';
    let records: { record: string[]; info: { lines: number } }[];
    try {
      records = parse(content, {
        delimiter,
        bom: true,
        info: true,
        cast: false,
        trim: true,
        skip_empty_lines: true,
        relax_column_count: true,
        max_record_size: 10000,
      }) as unknown as typeof records;
    } catch (error) {
      preview.errors.push({
        row: (error as { lines?: number }).lines ?? 1,
        message: 'El CSV no se puede leer. Revisá las comillas y separadores de esta fila.',
      });
      records = [];
    }
    const header = records.shift()?.record;
    if (
      !header ||
      header.length !== columns.length ||
      header.some((value, index) => value !== columns[index])
    ) {
      if (!preview.errors.length)
        preview.errors.push({ row: 1, message: `Las columnas deben ser: ${columns.join(', ')}.` });
      records = [];
    }
    preview.rowCount = records.length;
    if (records.length > 10000) {
      preview.errors.push({ row: 1, message: 'Se admiten hasta 10.000 productos por archivo.' });
      records = [];
    }
    if (!records.length && !preview.errors.length)
      preview.errors.push({ row: 2, message: 'El archivo no tiene productos.' });
    const skus = new Set<string>();
    const barcodes = new Set<string>();
    for (const { record, info } of records) {
      const row = info.lines;
      try {
        if (record.length !== columns.length)
          throw new DomainError(
            'VALIDATION',
            'La cantidad de columnas no coincide con el encabezado.',
          );
        const [
          sku = '',
          barcode = '',
          name = '',
          price = '',
          unit = '',
          active = '',
          category = '',
          opening = '',
          minimum = '',
        ] = record;
        const saleUnit = unit.toUpperCase();
        if (saleUnit !== 'KG' && saleUnit !== 'UNIT')
          throw new DomainError('VALIDATION', 'La unidad debe ser UNIT o KG.');
        if (opening.trim() !== '' && !this.stock)
          throw new DomainError(
            'VALIDATION',
            'La carga de stock inicial estará disponible con el módulo de stock. Dejá stock_inicial vacío para cargar sólo el catálogo.',
          );
        const state = normalizeSearch(active);
        if (!['si', 'no', 'true', 'false', '1', '0'].includes(state))
          throw new DomainError('VALIDATION', 'Activo debe ser si o no.');
        const input = ProductInputSchema.parse({
          sku,
          barcode: barcode || null,
          name,
          priceCents: parseArs(price),
          category: category || null,
          saleUnit,
          active: ['si', 'true', '1'].includes(state),
          trackStock: true,
          minStockBase: minimum ? parseQuantity(minimum, saleUnit) : 0,
        });
        if (skus.has(input.sku))
          throw new DomainError('VALIDATION', `SKU repetido dentro del archivo: ${input.sku}.`);
        skus.add(input.sku);
        if (input.barcode && barcodes.has(input.barcode))
          throw new DomainError(
            'VALIDATION',
            `Código de barras repetido dentro del archivo: ${input.barcode}.`,
          );
        if (input.barcode) barcodes.add(input.barcode);
        const current = this.catalog.findBySku(input.sku);
        const openingBase = opening.trim() === '' ? undefined : parseQuantity(opening, saleUnit);
        if (
          openingBase !== undefined &&
          current &&
          (!current.trackStock || current.stockInitialized)
        )
          throw new DomainError(
            'VALIDATION',
            'El producto ya tiene conteo o no controla stock. Usá Stock para corregirlo.',
          );
        if (input.barcode) {
          const owner = this.db
            .prepare('SELECT id,sku FROM products WHERE barcode=?')
            .get(input.barcode) as { id: string; sku: string } | undefined;
          if (owner && owner.id !== current?.id)
            throw new DomainError('VALIDATION', `El código de barras ya pertenece a ${owner.sku}.`);
        }
        if (current && current.saleUnit !== input.saleUnit && this.catalog.hasUsage(current.id))
          throw new DomainError(
            'VALIDATION',
            'La unidad no puede cambiar: el producto tiene ventas o movimientos.',
          );
        entries.push({
          ...(current
            ? {
                ...input,
                trackStock: current.trackStock,
                id: current.id,
                expectedRevision: current.revision,
              }
            : input),
          ...(openingBase === undefined
            ? {}
            : {
                openingBase,
                stockRevision: current ? this.stock!.get(current.id).revision : 0,
                openingKey: randomUUID(),
              }),
        });
        if (openingBase !== undefined) preview.stockOpenings++;
        if (current) {
          preview.updateCount++;
          if (current.priceCents !== input.priceCents) preview.priceChanges++;
        } else preview.newCount++;
        preview.rows.push({
          row,
          sku: input.sku,
          name: input.name,
          barcode: input.barcode,
          priceCents: input.priceCents,
          previousPriceCents: current?.priceCents ?? null,
          countedBase: openingBase ?? null,
          unit: input.saleUnit,
          action: current ? 'UPDATE' : 'CREATE',
        });
      } catch (error) {
        preview.errors.push({
          row,
          message:
            error instanceof Error &&
            !(error instanceof DomainError) &&
            !Object.hasOwn(error, 'issues')
              ? error.message
              : normalizeError(error).message,
        });
      }
    }
    this.pending.set(preview.previewToken, {
      preview,
      entries,
      expires: Date.now() + 15 * 60 * 1000,
    });
    return preview;
  }
  apply(raw: ApplyImportInput): ImportResult {
    const input = ApplyImportSchema.parse(raw);
    const pending = this.pending.get(input.previewToken);
    const byKey = this.db
      .prepare('SELECT * FROM import_batches WHERE operation_key=?')
      .get(input.operationKey) as Batch | undefined;
    const byToken = this.db
      .prepare('SELECT * FROM import_batches WHERE preview_token=?')
      .get(input.previewToken) as Batch | undefined;
    if (byKey) {
      if (
        byKey.preview_token !== input.previewToken &&
        byKey.source_hash !== pending?.preview.sourceHash
      )
        throw new DomainError(
          'IDEMPOTENCY_CONFLICT',
          'Ese identificador corresponde a otra carga.',
        );
      return { batchId: byKey.id, rowsApplied: byKey.rows_applied, alreadyApplied: true };
    }
    if (byToken)
      return { batchId: byToken.id, rowsApplied: byToken.rows_applied, alreadyApplied: true };
    if (!pending || pending.expires < Date.now())
      throw new DomainError('VALIDATION', 'La revisión venció. Volvé a elegir el archivo.');
    const previous = this.db
      .prepare('SELECT * FROM import_batches WHERE source_hash=?')
      .get(pending.preview.sourceHash) as Batch | undefined;
    if (previous)
      return { batchId: previous.id, rowsApplied: previous.rows_applied, alreadyApplied: true };
    if (pending.preview.errors.length)
      throw new DomainError(
        'VALIDATION',
        'Corregí todos los errores del archivo antes de aplicar la carga.',
      );
    if (pending.preview.priceChanges > 0 && !input.confirmPriceChanges)
      throw new DomainError(
        'VALIDATION',
        'Confirmá los cambios de precio antes de aplicar la carga.',
      );
    if (pending.preview.stockOpenings > 0 && !input.confirmStockCounts)
      throw new DomainError(
        'VALIDATION',
        'Confirmá que las cantidades corresponden a un conteo físico real.',
      );
    return this.db
      .transaction(() => {
        for (const entry of pending.entries) {
          if (!entry.id && this.catalog.findBySku(entry.sku))
            throw new DomainError(
              'REVISION_CONFLICT',
              'El catálogo cambió. Revisá el archivo nuevamente.',
            );
          const { openingBase, stockRevision, openingKey, ...productInput } = entry;
          const product = this.catalog.save(productInput);
          if (openingBase !== undefined)
            this.stock!.opening({
              productId: product.id,
              countedBase: openingBase,
              reason: `Conteo inicial CSV: ${pending.preview.sourceName}`.slice(0, 240),
              operationKey: openingKey!,
              expectedRevision: stockRevision!,
              expectedProductRevision: product.revision,
            });
        }
        const id = randomUUID();
        this.db
          .prepare(
            "INSERT INTO import_batches (id,source_name,source_hash,preview_token,operation_key,status,rows_applied,created_at_utc) VALUES (?,?,?,?,?,'APPLIED',?,?)",
          )
          .run(
            id,
            pending.preview.sourceName,
            pending.preview.sourceHash,
            input.previewToken,
            input.operationKey,
            pending.entries.length,
            new Date().toISOString(),
          );
        return { batchId: id, rowsApplied: pending.entries.length, alreadyApplied: false };
      })
      .immediate();
  }
}
