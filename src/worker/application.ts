import type Database from 'better-sqlite3';
import { z } from 'zod';
import { AuthService } from './auth/service';
import { recordAudit } from './auth/audit';
import { CatalogRepository } from './products/repository';
import { CatalogImporter } from './products/import';
import { StockService } from './stock/service';
import { DraftRepository } from './drafts';
import { SalesService } from './sales/service';
import { validateRequest, RequestSchemas } from '../shared/requests';
import { BootstrapSchema, LoginSchema, UserSaveSchema, ChangePasswordSchema } from '../shared/auth';
import {
  ProductSearchSchema,
  ProductSaveSchema,
  SetActiveSchema,
  ApplyImportSchema,
  SaveDraftSchema,
} from '../shared/catalog';
import { CheckoutSchema, VoidSchema, SalesSearchSchema } from '../shared/sales';
import type { SaleDetail } from '../shared/sales';
import {
  StockCountSchema,
  StockRecordSchema,
  StockSearchSchema,
  StockMovementsSchema,
} from '../shared/stock';
import { DomainError } from '../shared/errors';
const mutations = new Set([
  'products.save',
  'products.setActive',
  'products.applyImport',
  'stock.opening',
  'stock.count',
  'stock.record',
  'checkout.saveDraft',
  'checkout.cancelDraft',
  'sales.complete',
  'sales.void',
]);
const productIdSchema = z.strictObject({ productId: z.uuid() });
const saleIdSchema = z.strictObject({ saleId: z.uuid() });
export class Application {
  private readonly catalog: CatalogRepository;
  private readonly stock: StockService;
  private readonly importer: CatalogImporter;
  private readonly drafts: DraftRepository;
  private readonly sales: SalesService;
  constructor(
    private readonly db: Database.Database,
    private readonly auth: AuthService,
  ) {
    this.catalog = new CatalogRepository(db);
    this.stock = new StockService(db, this.catalog);
    this.importer = new CatalogImporter(db, this.catalog, this.stock);
    this.drafts = new DraftRepository(db);
    this.sales = new SalesService(db, this.catalog, this.stock, this.drafts);
  }
  dispatch(operation: string, payload: unknown, token: string | null): unknown {
    if (operation === 'internal.authorize') {
      const input = z.strictObject({ operation: z.string() }).parse(payload);
      if (!Object.hasOwn(RequestSchemas, input.operation))
        throw new DomainError('VALIDATION', 'Operación desconocida.');
      this.auth.authorize(token, input.operation);
      return null;
    }
    if (operation === 'internal.importPreview') {
      this.auth.authorize(token, 'products.previewImport');
      const input = z
        .strictObject({
          content: z.string().max(10 * 1024 * 1024),
          sourceName: z.string().max(180),
        })
        .parse(payload);
      return this.importer.preview(input.content, input.sourceName);
    }
    const request = validateRequest({ operation, payload });
    payload = request.payload;
    switch (operation) {
      case 'auth.status':
        return this.auth.status(token);
      case 'auth.bootstrap':
        return this.auth.bootstrap(BootstrapSchema.parse(payload));
      case 'auth.login':
        return this.auth.login(LoginSchema.parse(payload));
      case 'auth.logout':
        return this.auth.logout(token);
      case 'auth.changePassword':
        return this.auth.changePassword(token, ChangePasswordSchema.parse(payload));
      case 'users.list':
        return this.auth.listUsers(token);
      case 'users.save':
        return this.auth.saveUser(token, UserSaveSchema.parse(payload));
    }
    const actor = this.auth.authorize(token, operation);
    const ownSale = (sale: SaleDetail | null) => {
      if (sale && actor.role === 'SELLER' && sale.actorUserId !== actor.id)
        throw new DomainError('FORBIDDEN', 'Sólo podés recuperar tus propias ventas.');
      return sale;
    };
    const execute = (): unknown => {
      switch (operation) {
        case 'products.search': {
          const input = ProductSearchSchema.parse(payload);
          return this.catalog.search(
            actor.role === 'SELLER' ? { ...input, activeOnly: true, status: 'ACTIVE' } : input,
          );
        }
        case 'products.save':
          return this.catalog.save(ProductSaveSchema.parse(payload));
        case 'products.setActive':
          return this.catalog.setActive(SetActiveSchema.parse(payload));
        case 'products.findByBarcode':
          return this.catalog.findByBarcode(
            z.strictObject({ barcode: z.string() }).parse(payload).barcode,
          );
        case 'products.applyImport':
          return this.importer.apply(ApplyImportSchema.parse(payload));
        case 'checkout.getDraft':
          return this.drafts.get(actor.id);
        case 'checkout.saveDraft':
          return this.drafts.save(SaveDraftSchema.parse(payload), actor.id);
        case 'checkout.cancelDraft':
          return this.drafts.cancel(
            z.strictObject({ expectedRevision: z.number().int().min(0) }).parse(payload)
              .expectedRevision,
            actor.id,
          );
        case 'stock.get':
          return this.stock.get(productIdSchema.parse(payload).productId);
        case 'stock.operation':
          return this.stock.operation(
            z.strictObject({ operationKey: z.uuid() }).parse(payload).operationKey,
          );
        case 'stock.search':
          return this.stock.search(StockSearchSchema.parse(payload));
        case 'stock.opening':
          return this.stock.opening(StockCountSchema.parse(payload));
        case 'stock.count':
          return this.stock.count(StockCountSchema.parse(payload));
        case 'stock.record':
          return this.stock.record(StockRecordSchema.parse(payload));
        case 'stock.listLow': {
          const input = z
            .strictObject({ limit: z.number(), cursor: z.string().optional() })
            .parse(payload);
          return this.stock.listLow({
            limit: input.limit,
            ...(input.cursor ? { cursor: input.cursor } : {}),
          });
        }
        case 'stock.movements':
          return this.stock.movements(StockMovementsSchema.parse(payload));
        case 'sales.complete': {
          const input = CheckoutSchema.parse(payload);
          ownSale(this.sales.findByCheckoutKey(input.checkoutKey));
          if (actor.role === 'SELLER' && input.negativeStockOverride)
            throw new DomainError(
              'FORBIDDEN',
              'Un supervisor debe autorizar la venta con stock negativo.',
            );
          return this.sales.complete(input, actor.id);
        }
        case 'sales.findByCheckoutKey':
          return ownSale(
            this.sales.findByCheckoutKey(
              z.strictObject({ checkoutKey: z.uuid() }).parse(payload).checkoutKey,
            ),
          );
        case 'sales.detail':
          return ownSale(this.sales.detail(saleIdSchema.parse(payload).saleId));
        case 'sales.list':
          return this.sales.list(SalesSearchSchema.parse(payload));
        case 'sales.previewVoid':
          return this.sales.previewVoid(saleIdSchema.parse(payload).saleId);
        case 'sales.void':
          return this.sales.void(VoidSchema.parse(payload));
        default:
          throw new DomainError('VALIDATION', 'La operación no está implementada.');
      }
    };
    if (!mutations.has(operation)) return execute();
    return this.db
      .transaction(() => {
        const changes = () =>
          (this.db.prepare('SELECT total_changes() AS n').get() as { n: number }).n;
        const before = changes();
        const sequence = (
          this.db.prepare('SELECT COALESCE(MAX(sequence),0) AS n FROM stock_movements').get() as {
            n: number;
          }
        ).n;
        const event = (
          this.db.prepare('SELECT COALESCE(MAX(rowid),0) AS n FROM sale_events').get() as {
            n: number;
          }
        ).n;
        let result = execute();
        if (changes() > before) {
          const entity =
            result && typeof result === 'object'
              ? (result as { id?: string; productId?: string })
              : null;
          recordAudit(this.db, actor, operation, entity?.id ?? entity?.productId ?? actor.id);
          this.db
            .prepare('UPDATE stock_movements SET actor_user_id=?,actor_name=? WHERE sequence>?')
            .run(actor.id, actor.name, sequence);
          this.db
            .prepare('UPDATE sale_events SET actor_user_id=?,actor_name=? WHERE rowid>?')
            .run(actor.id, actor.name, event);
          if (operation === 'sales.complete') {
            const sale = result as SaleDetail;
            this.db
              .prepare('UPDATE sales SET actor_user_id=?,actor_name=? WHERE id=?')
              .run(actor.id, actor.name, sale.id);
            result = this.sales.detail(sale.id);
          } else if (operation === 'sales.void')
            result = this.sales.detail((result as SaleDetail).id);
        }
        return result;
      })
      .immediate();
  }
}
