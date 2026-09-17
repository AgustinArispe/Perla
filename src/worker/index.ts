import { parentPort, workerData } from 'node:worker_threads';
import { z } from 'zod';
import { openDatabase } from './db/connection';
import { CatalogRepository } from './products/repository';
import { CatalogImporter } from './products/import';
import { DraftRepository } from './drafts';
import { StockService } from './stock/service';
import {
  StockCountSchema,
  StockRecordSchema,
  StockSearchSchema,
  StockMovementsSchema,
} from '../shared/stock';
import { validateRequest } from '../shared/requests';
import { failure, DomainError } from '../shared/errors';
import {
  ProductSaveSchema,
  ProductSearchSchema,
  SetActiveSchema,
  ApplyImportSchema,
  SaveDraftSchema,
} from '../shared/catalog';

const port = parentPort;
if (!port) throw new Error('El proceso SQL debe iniciarse como worker.');
const data = z.strictObject({ databasePath: z.string() }).parse(workerData);
try {
  const database = openDatabase(data.databasePath);
  const catalog = new CatalogRepository(database);
  const stock = new StockService(database, catalog);
  const importer = new CatalogImporter(database, catalog, stock);
  const drafts = new DraftRepository(database);
  const schema = database
    .prepare('SELECT MAX(version) AS version FROM schema_migrations')
    .get() as { version: number };
  const sqlite = database.prepare('SELECT sqlite_version() AS version').get() as {
    version: string;
  };
  port.postMessage({
    type: 'ready',
    result: {
      ok: true,
      value: { database: 'ready', schemaVersion: schema.version, sqliteVersion: sqlite.version },
    },
  });
  port.on('message', (message: unknown) => {
    if (message === 'close') {
      database.close();
      port.close();
      return;
    }
    let id: string | undefined;
    try {
      const envelope = z.strictObject({ id: z.uuid(), request: z.unknown() }).parse(message);
      id = envelope.id;
      const raw = z
        .strictObject({ operation: z.string(), payload: z.unknown() })
        .parse(envelope.request);
      let value: unknown;
      if (raw.operation === 'internal.importPreview') {
        const payload = z
          .strictObject({
            content: z.string().max(10 * 1024 * 1024),
            sourceName: z.string().max(180),
          })
          .parse(raw.payload);
        value = importer.preview(payload.content, payload.sourceName);
      } else {
        const request = validateRequest(raw);
        switch (request.operation) {
          case 'products.search':
            value = catalog.search(ProductSearchSchema.parse(request.payload));
            break;
          case 'products.save':
            value = catalog.save(ProductSaveSchema.parse(request.payload));
            break;
          case 'products.setActive':
            value = catalog.setActive(SetActiveSchema.parse(request.payload));
            break;
          case 'products.findByBarcode':
            value = catalog.findByBarcode(
              z.object({ barcode: z.string() }).parse(request.payload).barcode,
            );
            break;
          case 'products.applyImport':
            value = importer.apply(ApplyImportSchema.parse(request.payload));
            break;
          case 'checkout.getDraft':
            value = drafts.get();
            break;
          case 'checkout.saveDraft':
            value = drafts.save(SaveDraftSchema.parse(request.payload));
            break;
          case 'stock.get':
            value = stock.get(z.object({ productId: z.uuid() }).parse(request.payload).productId);
            break;
          case 'stock.operation':
            value = stock.operation(
              z.object({ operationKey: z.uuid() }).parse(request.payload).operationKey,
            );
            break;
          case 'stock.search':
            value = stock.search(StockSearchSchema.parse(request.payload));
            break;
          case 'stock.opening':
            value = stock.opening(StockCountSchema.parse(request.payload));
            break;
          case 'stock.count':
            value = stock.count(StockCountSchema.parse(request.payload));
            break;
          case 'stock.record':
            value = stock.record(StockRecordSchema.parse(request.payload));
            break;
          case 'stock.listLow': {
            const input = z
              .object({ limit: z.number(), cursor: z.string().optional() })
              .parse(request.payload);
            value = stock.listLow({
              limit: input.limit,
              ...(input.cursor ? { cursor: input.cursor } : {}),
            });
            break;
          }
          case 'stock.movements':
            value = stock.movements(StockMovementsSchema.parse(request.payload));
            break;
          default:
            throw new DomainError('VALIDATION', 'La operación SQL no está disponible.');
        }
      }
      port.postMessage({ type: 'response', id, result: { ok: true, value } });
    } catch (error) {
      console.error('Operación SQL fallida:', error);
      if (id) port.postMessage({ type: 'response', id, result: failure(error) });
    }
  });
} catch (error) {
  console.error('No se pudo iniciar SQLite:', error);
  port.postMessage({ type: 'ready', result: failure(error) });
  port.close();
}
