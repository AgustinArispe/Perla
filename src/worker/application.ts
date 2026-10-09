import { captureAuditState, recordMutationAudit } from './control/commercial';
import { ControlService } from './control/service';
import { LocationInventorySchema } from '../shared/locations';
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
import {
  BootstrapSchema,
  LoginSchema,
  UserSaveSchema,
  ChangePasswordSchema,
  UnlockUserSchema,
} from '../shared/auth';
import {
  ProductSearchSchema,
  ProductSaveSchema,
  SetActiveSchema,
  ApplyImportSchema,
  SaveDraftSchema,
  TaxonomySaveSchema,
  ProductLabelListSchema,
  ProductLabelCreateSchema,
  ProductLabelPrintSchema,
  DraftBodySchema,
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
import { MonthlyReports } from './reports/queries';
import { ReceiptService } from './receipts/service';
import {
  ReceiptCreateSchema,
  ReceiptListSchema,
  ReceiptMarkPrintedSchema,
} from '../shared/receipts';
import { ComparisonRequestSchema, MonthlyRequestSchema } from '../shared/reports';
import { NotificationMarkReadSchema } from '../shared/notifications';
import { NotificationService } from './notifications/service';
import { FeatureService } from './features/service';
import { PurchaseService } from './purchases/service';
import {
  PurchaseDraftSaveSchema,
  PurchaseReceiveSchema,
  PurchaseSearchSchema,
  PurchaseVoidSchema,
  SupplierSaveSchema,
  SupplierSearchSchema,
  SupplierSetActiveSchema,
} from '../shared/purchases';
import { CostReferenceSchema } from '../shared/costs';
import { CostService } from './costs/service';
import { ReturnConfirmSchema } from '../shared/returns';
import { ReturnService } from './returns/service';
import { LotService } from './lots/service';
import { LotReconcileSchema, LotSetBlockedSchema } from '../shared/lots';
import { PriceChangeService } from './pricing/service';
import { PriceConfirmSchema, PricePreviewSchema } from '../shared/pricing';
import { PromotionService } from './promotions/service';
import { PromotionSaveSchema } from '../shared/promotions';
import { SupplierPaymentInputSchema } from '../shared/supplier-accounts';
import { SupplierAccountService } from './supplier-accounts/service';
import { CashService } from './operations/cash';
import {
  CustomerCollectionInputSchema,
  CustomerCreditSchema,
  CustomerSaveSchema,
  CustomerSearchSchema,
  CustomerSetActiveSchema,
} from '../shared/customers';
import { CustomerService } from './customers/service';
import { LocationTransferService } from './locations/service';
import {
  LocationSaveSchema,
  TerminalLocationSchema,
  TransferCancelSchema,
  TransferDispatchSchema,
  TransferListSchema,
  TransferReceiveSchema,
} from '../shared/locations';
import { LocationSummaryRequestSchema } from '../shared/location-reports';
const mutations = new Set([
  'products.save',
  'products.setActive',
  'products.saveCategory',
  'products.saveBrand',
  'products.applyImport',
  'products.createLabel',
  'products.markLabelPrinted',
  'stock.opening',
  'stock.count',
  'stock.record',
  'checkout.saveDraft',
  'checkout.cancelDraft',
  'sales.complete',
  'sales.void',
  'sales.return',
  'receipts.create',
  'receipts.markPrinted',
  'suppliers.save',
  'suppliers.setActive',
  'purchases.saveDraft',
  'purchases.cancelDraft',
  'purchases.receive',
  'purchases.void',
  'costs.setReference',
  'lots.enable',
  'lots.reconcile',
  'lots.setBlocked',
  'pricing.confirm',
  'promotions.save',
  'notifications.markRead',
  'supplierAccounts.pay',
  'customers.save',
  'customers.setCredit',
  'customers.setActive',
  'customerAccounts.collect',
  'locations.save',
  'locations.assignTerminal',
  'transfers.dispatch',
  'transfers.receive',
  'transfers.cancel',
]);
const productIdSchema = z.strictObject({ productId: z.uuid() });
const saleIdSchema = z.strictObject({ saleId: z.uuid() });
export class Application {
  private readonly catalog: CatalogRepository;
  private readonly stock: StockService;
  private readonly importer: CatalogImporter;
  private readonly drafts: DraftRepository;
  private readonly sales: SalesService;
  private readonly reports: MonthlyReports;
  private readonly receipts: ReceiptService;
  private readonly features: FeatureService;
  private readonly purchases: PurchaseService;
  private readonly costs: CostService;
  private readonly returns: ReturnService;
  private readonly lots: LotService;
  private readonly pricing: PriceChangeService;
  private readonly promotions: PromotionService;
  private readonly notifications: NotificationService;
  private readonly supplierAccounts: SupplierAccountService;
  private readonly customers: CustomerService;
  private readonly locations: LocationTransferService;
  constructor(
    private readonly db: Database.Database,
    private readonly auth: AuthService,
  ) {
    this.catalog = new CatalogRepository(db);
    this.stock = new StockService(db, this.catalog);
    this.importer = new CatalogImporter(db, this.catalog, this.stock);
    this.drafts = new DraftRepository(db);
    this.features = new FeatureService(db);
    this.lots = new LotService(db);
    this.pricing = new PriceChangeService(db, this.catalog);
    this.promotions = new PromotionService(db);
    this.notifications = new NotificationService(db);
    this.supplierAccounts = new SupplierAccountService(db, new CashService(db));
    this.customers = new CustomerService(db, new CashService(db));
    this.locations = new LocationTransferService(db, this.catalog);
    this.sales = new SalesService(
      db,
      this.catalog,
      this.stock,
      this.drafts,
      () => this.features.isEnabled('STOCK_CONTROL'),
      this.lots,
      () => this.features.isEnabled('LOTS'),
      this.promotions,
      () => this.features.isEnabled('PROMOTIONS'),
      this.customers,
      () => this.features.isEnabled('CUSTOMER_CREDIT'),
    );
    this.receipts = new ReceiptService(db, (saleId) => this.sales.detail(saleId));
    this.purchases = new PurchaseService(
      db,
      this.catalog,
      this.stock,
      () => this.features.isEnabled('STOCK_CONTROL'),
      this.lots,
      () => this.features.isEnabled('LOTS'),
      this.supplierAccounts,
      () => this.features.isEnabled('SUPPLIER_ACCOUNTS'),
    );
    this.costs = new CostService(db);
    this.returns = new ReturnService(
      db,
      this.stock,
      this.sales,
      this.lots,
      () => this.features.isEnabled('LOTS'),
      this.customers,
    );
    this.reports = new MonthlyReports(db);
  }
  dispatch(operation: string, payload: unknown, token: string | null): unknown {
    if (operation === 'internal.authorize') {
      const input = z.strictObject({ operation: z.string() }).parse(payload);
      if (!Object.hasOwn(RequestSchemas, input.operation))
        throw new DomainError('VALIDATION', 'OperaciÃ³n desconocida.');
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
      case 'auth.unlockUser':
        return this.auth.unlockUser(token, UnlockUserSchema.parse(payload));
      case 'users.list':
        return this.auth.listUsers(token);
      case 'users.save':
        return this.auth.saveUser(token, UserSaveSchema.parse(payload));
    }
    const actor = this.auth.authorize(token, operation);
    this.features.assertOperation(operation, actor.role);
    const redactSale = (sale: SaleDetail | null) => {
      if (!sale || actor.role !== 'SELLER') return sale;
      return {
        ...sale,
        items: sale.items.map((item) => ({
          ...item,
          costMethod: null,
          costRateMicrosPerBase: null,
          costCents: null,
          costEffectiveAt: null,
          categoryName: item.categoryName,
        })),
      };
    };
    const ownSale = (sale: SaleDetail | null) => {
      if (sale && actor.role === 'SELLER' && sale.actorUserId !== actor.id)
        throw new DomainError('FORBIDDEN', 'SÃ³lo podÃ©s recuperar tus propias ventas.');
      return redactSale(sale);
    };
    const execute = (): unknown => {
      switch (operation) {
        case 'control.execute':
          return new ControlService(this.db).execute(payload, actor);
        case 'products.get': {
          const product = this.catalog.get(productIdSchema.parse(payload).productId);
          if (actor.role === 'SELLER' && !product.active)
            throw new DomainError('INACTIVE', 'Este producto estÃ¡ inactivo.');
          return product;
        }
        case 'dashboard.monthly':
          return this.reports.month(MonthlyRequestSchema.parse(payload).month);
        case 'dashboard.compare':
          return this.reports.compare(ComparisonRequestSchema.parse(payload));
        case 'notifications.list':
          return this.notifications.list(actor);
        case 'notifications.markRead':
          return this.notifications.markRead(NotificationMarkReadSchema.parse(payload), actor);
        case 'products.search': {
          const input = ProductSearchSchema.parse(payload);
          return this.catalog.search(
            actor.role === 'SELLER' ? { ...input, activeOnly: true, status: 'ACTIVE' } : input,
          );
        }
        case 'products.save': {
          const input = ProductSaveSchema.parse(payload);
          const previous = input.id ? this.catalog.get(input.id) : null;
          if (previous)
            this.costs.invalidateForUnitChange(
              previous.id,
              previous.saleUnit,
              input.saleUnit,
              actor,
            );
          return this.catalog.save(input);
        }
        case 'products.setActive':
          return this.catalog.setActive(SetActiveSchema.parse(payload));
        case 'products.taxonomy': {
          const includeInactive = z
            .strictObject({ includeInactive: z.boolean().default(false) })
            .parse(payload).includeInactive;
          return {
            categories: this.catalog.listTaxonomy('categories', includeInactive),
            brands: this.catalog.listTaxonomy('brands', includeInactive),
          };
        }
        case 'products.saveCategory':
          return this.catalog.saveTaxonomy('categories', TaxonomySaveSchema.parse(payload));
        case 'products.saveBrand':
          return this.catalog.saveTaxonomy('brands', TaxonomySaveSchema.parse(payload));
        case 'products.findByBarcode':
          return this.catalog.findByBarcode(
            z.strictObject({ barcode: z.string() }).parse(payload).barcode,
          );
        case 'products.proposeInternalBarcode':
          return { barcode: this.catalog.proposeInternalBarcode() };
        case 'products.labels':
          return this.catalog.labels(ProductLabelListSchema.parse(payload));
        case 'products.createLabel':
          return this.catalog.createLabel(ProductLabelCreateSchema.parse(payload).productId);
        case 'products.markLabelPrinted':
          return this.catalog.markLabelPrinted(ProductLabelPrintSchema.parse(payload).labelId);
        case 'products.applyImport':
          return this.importer.apply(ApplyImportSchema.parse(payload));
        case 'pricing.preview':
          return this.pricing.preview(PricePreviewSchema.parse(payload));
        case 'pricing.confirm':
          return this.pricing.confirm(PriceConfirmSchema.parse(payload), actor);
        case 'promotions.list':
          return this.promotions.list();
        case 'promotions.get':
          return this.promotions.get(
            z.strictObject({ promotionId: z.uuid() }).parse(payload).promotionId,
          );
        case 'promotions.save':
          return this.promotions.save(PromotionSaveSchema.parse(payload), actor);
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
        case 'lots.status':
          return this.lots.status(productIdSchema.parse(payload).productId);
        case 'lots.enable': {
          const productId = productIdSchema.parse(payload).productId;
          this.lots.enable(productId, actor);
          return this.lots.status(productId);
        }
        case 'lots.reconcile': {
          const input = LotReconcileSchema.parse(payload);
          this.lots.reconcile({ ...input, actor });
          return this.lots.status(input.productId);
        }
        case 'lots.setBlocked': {
          const input = LotSetBlockedSchema.parse(payload);
          return this.lots.setBlocked(input.lotId, input.blocked, actor);
        }
        case 'sales.quote':
          return this.sales.quote(DraftBodySchema.parse(payload));
        case 'sales.complete': {
          const input = CheckoutSchema.parse(payload);
          ownSale(this.sales.findByCheckoutKey(input.checkoutKey));
          if (actor.role === 'SELLER' && input.negativeStockOverride)
            throw new DomainError(
              'FORBIDDEN',
              'Un supervisor debe autorizar la venta con stock negativo.',
            );
          return redactSale(this.sales.complete(input, actor));
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
          return this.sales.void(VoidSchema.parse(payload), actor);
        case 'sales.previewReturn':
          return this.returns.preview(saleIdSchema.parse(payload).saleId);
        case 'sales.return':
          return this.returns.confirm(ReturnConfirmSchema.parse(payload), actor);
        case 'sales.returns':
          return this.returns.listForSale(saleIdSchema.parse(payload).saleId);
        case 'receipts.create': {
          const input = ReceiptCreateSchema.parse(payload);
          ownSale(this.sales.detail(input.saleId));
          return this.receipts.create(input, actor);
        }
        case 'receipts.list':
          return this.receipts.list(ReceiptListSchema.parse(payload));
        case 'receipts.markPrinted': {
          const input = ReceiptMarkPrintedSchema.parse(payload);
          const receipt = this.receipts.get(input.receiptId);
          ownSale(this.sales.detail(receipt.saleId));
          return this.receipts.markPrinted(input.receiptId);
        }
        case 'suppliers.search':
          return this.purchases.searchSuppliers(SupplierSearchSchema.parse(payload));
        case 'suppliers.get':
          return this.purchases.supplier(
            z.strictObject({ supplierId: z.uuid() }).parse(payload).supplierId,
          );
        case 'suppliers.save':
          return this.purchases.saveSupplier(SupplierSaveSchema.parse(payload));
        case 'suppliers.setActive':
          return this.purchases.setSupplierActive(SupplierSetActiveSchema.parse(payload));
        case 'supplierAccounts.detail':
          return this.supplierAccounts.detail(
            z.strictObject({ supplierId: z.uuid() }).parse(payload).supplierId,
          );
        case 'supplierAccounts.pay':
          return this.supplierAccounts.pay(SupplierPaymentInputSchema.parse(payload), actor);
        case 'customers.search':
          return this.customers.search(CustomerSearchSchema.parse(payload));
        case 'customers.get':
          return this.customers.get(
            z.strictObject({ customerId: z.uuid() }).parse(payload).customerId,
          );
        case 'customers.save': {
          const input = CustomerSaveSchema.parse(payload);
          if (actor.role === 'SELLER' && input.id)
            throw new DomainError(
              'FORBIDDEN',
              'Tu perfil puede crear clientes desde caja, pero no editarlos.',
            );
          return this.customers.save(input);
        }
        case 'customers.setCredit':
          return this.customers.setCredit(CustomerCreditSchema.parse(payload));
        case 'customers.setActive':
          return this.customers.setActive(CustomerSetActiveSchema.parse(payload));
        case 'customerAccounts.detail':
          return this.customers.detail(
            z.strictObject({ customerId: z.uuid() }).parse(payload).customerId,
          );
        case 'customerAccounts.collect':
          return this.customers.collect(CustomerCollectionInputSchema.parse(payload), actor);
        case 'locations.inventory':
          return this.locations.inventory(LocationInventorySchema.parse(payload));
        case 'locations.list':
          return this.locations.listLocations();
        case 'locations.save':
          return this.locations.saveLocation(LocationSaveSchema.parse(payload));
        case 'locations.assignTerminal':
          return this.locations.assignTerminal(TerminalLocationSchema.parse(payload));
        case 'locations.summary':
          return this.locations.summary(LocationSummaryRequestSchema.parse(payload));
        case 'transfers.list':
          return this.locations.listTransfers(TransferListSchema.parse(payload));
        case 'transfers.detail':
          return this.locations.detail(
            z.strictObject({ transferId: z.uuid() }).parse(payload).transferId,
          );
        case 'transfers.dispatch':
          return this.locations.dispatch(TransferDispatchSchema.parse(payload), actor);
        case 'transfers.receive':
          return this.locations.receive(TransferReceiveSchema.parse(payload), actor);
        case 'transfers.cancel':
          return this.locations.cancel(TransferCancelSchema.parse(payload), actor);
        case 'purchases.getDraft':
          return this.purchases.getDraft(actor.id);
        case 'purchases.saveDraft':
          return this.purchases.saveDraft(PurchaseDraftSaveSchema.parse(payload), actor.id, null);
        case 'purchases.cancelDraft':
          return this.purchases.cancelDraft(
            z.strictObject({ expectedRevision: z.number().int().min(0) }).parse(payload)
              .expectedRevision,
            actor.id,
          );
        case 'purchases.receive':
          return this.purchases.receive(PurchaseReceiveSchema.parse(payload), actor);
        case 'purchases.findByReceiptKey':
          return this.purchases.findByReceiptKey(
            z.strictObject({ receiptKey: z.uuid() }).parse(payload).receiptKey,
          );
        case 'purchases.detail':
          return this.purchases.detail(
            z.strictObject({ purchaseId: z.uuid() }).parse(payload).purchaseId,
          );
        case 'purchases.list':
          return this.purchases.list(PurchaseSearchSchema.parse(payload));
        case 'purchases.previewVoid':
          return this.purchases.previewVoid(
            z.strictObject({ purchaseId: z.uuid() }).parse(payload).purchaseId,
          );
        case 'purchases.void':
          return this.purchases.void(PurchaseVoidSchema.parse(payload), actor);
        case 'purchases.lastCost':
          return this.purchases.lastCost(
            z.strictObject({ productId: z.uuid() }).parse(payload).productId,
          );
        case 'costs.get':
          return this.costs.get(productIdSchema.parse(payload).productId);
        case 'costs.setReference':
          return this.costs.setReference(CostReferenceSchema.parse(payload), actor);
        default:
          throw new DomainError('VALIDATION', 'La operaciÃ³n no estÃ¡ implementada.');
      }
    };
    if (!mutations.has(operation)) return execute();
    return this.db
      .transaction(() => {
        const changes = () =>
          (
            this.db.prepare('SELECT total_changes() AS n').get() as {
              n: number;
            }
          ).n;
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
        const auditState = captureAuditState(this.db, operation, payload);
        let result = execute();
        if (changes() > before) {
          recordMutationAudit(this.db, actor, operation, payload, result, auditState);
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
            result = redactSale(this.sales.detail(sale.id));
          } else if (operation === 'sales.void')
            result = redactSale(this.sales.detail((result as SaleDetail).id));
        }
        return result;
      })
      .immediate();
  }
}
