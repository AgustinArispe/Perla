import { z } from 'zod';
import type { ComparisonRequest, MonthlyReport, PeriodComparison } from './reports';
import type { NotificationInbox, NotificationMarkRead } from './notifications';
import type {
  User,
  AuthStatus,
  BootstrapInput,
  LoginInput,
  UserSaveInput,
  ChangePasswordInput,
  UnlockUserInput,
} from './auth';
import type {
  CheckoutInput,
  VoidInput,
  SalesSearchInput,
  SaleDetail,
  SalePage,
  SaleQuote,
  VoidPreview,
} from './sales';
import type {
  StockBalance,
  StockCountInput,
  StockRecordInput,
  StockSearchInput,
  StockPage,
  StockMovementsInput,
  MovementPage,
} from './stock';
import type {
  Product,
  ProductSaveInput,
  ProductSearchInput,
  ProductPage,
  SetActiveInput,
  ImportPreview,
  ImportResult,
  ApplyImportInput,
  SaveDraftInput,
  DraftRecord,
  ProductTaxonomy,
  TaxonomySaveInput,
  TaxonomyItem,
  ProductLabel,
  ProductLabelPage,
} from './catalog';
import type { ReceiptCreateInput, ReceiptPage, SaleReceipt } from './receipts';
import type {
  PurchaseDetail,
  PurchaseDraftRecord,
  PurchaseDraftSaveInput,
  PurchasePage,
  PurchaseReceiveInput,
  PurchaseSearchInput,
  PurchaseVoidInput,
  PurchaseVoidPreview,
  Supplier,
  SupplierPage,
  SupplierSaveInput,
  SupplierSearchInput,
  SupplierSetActiveInput,
} from './purchases';
import type { CostReferenceInput, ProductCost } from './costs';
import type { ReturnConfirmInput, ReturnPreview, SaleReturnDetail } from './returns';
import type { InventoryLot, LotProductStatus, LotReconcileInput, LotSetBlockedInput } from './lots';
import type {
  PriceChangeBatch,
  PriceConfirmInput,
  PricePreview,
  PricePreviewInput,
} from './pricing';
import type { Promotion, PromotionSaveInput } from './promotions';
import type { SupplierAccount, SupplierPayment, SupplierPaymentInput } from './supplier-accounts';
import type {
  Customer,
  CustomerAccount,
  CustomerCollection,
  CustomerCollectionInput,
  CustomerPage,
  CustomerSaveInput,
} from './customers';
import type {
  Location,
  LocationSaveInput,
  StockTransfer,
  TransferCancelInput,
  TransferDispatchInput,
  TransferReceiveInput,
} from './locations';
import type { LocationSummary } from './location-reports';

export const SystemStatusSchema = z.object({
  applicationVersion: z.string(),
  database: z.literal('ready'),
  schemaVersion: z.number().int().nonnegative(),
  sqliteVersion: z.string(),
  environment: z.enum(['development', 'production', 'test']),
});
export type SystemStatus = z.infer<typeof SystemStatusSchema>;
export const AppErrorSchema = z.object({
  code: z.enum([
    'VALIDATION',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'AUTH_THROTTLED',
    'NOT_FOUND',
    'INACTIVE',
    'REVISION_CONFLICT',
    'INSUFFICIENT_STOCK',
    'IDEMPOTENCY_CONFLICT',
    'DB_BUSY',
    'DISK_FULL',
    'BACKUP_INVALID',
    'SCHEMA_TOO_NEW',
    'INTERNAL',
  ]),
  message: z.string(),
  retryable: z.boolean(),
});
export type Result<T> =
  { ok: true; value: T } | { ok: false; error: z.infer<typeof AppErrorSchema> };
export const SystemHealthResultSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), value: SystemStatusSchema }),
  z.object({ ok: z.literal(false), error: AppErrorSchema }),
]);
export interface BochaApi {
  dashboard: {
    monthly(month: string): Promise<Result<MonthlyReport>>;
    compare(input: ComparisonRequest): Promise<Result<PeriodComparison>>;
  };
  notifications: {
    list(): Promise<Result<NotificationInbox>>;
    markRead(input: NotificationMarkRead): Promise<Result<NotificationInbox>>;
  };
  auth: {
    status(): Promise<Result<AuthStatus>>;
    bootstrap(input: BootstrapInput): Promise<Result<User>>;
    login(input: LoginInput): Promise<Result<User>>;
    logout(): Promise<Result<null>>;
    changePassword(input: ChangePasswordInput): Promise<Result<null>>;
    unlockUser(input: UnlockUserInput): Promise<Result<null>>;
  };
  users: {
    list(): Promise<Result<User[]>>;
    save(input: UserSaveInput): Promise<Result<User>>;
    unlockUser(input: UnlockUserInput): Promise<Result<null>>;
  };
  sales: {
    quote(input: DraftRecord['body']): Promise<Result<SaleQuote>>;
    complete(input: CheckoutInput): Promise<Result<SaleDetail>>;
    findByCheckoutKey(checkoutKey: string): Promise<Result<SaleDetail | null>>;
    detail(saleId: string): Promise<Result<SaleDetail>>;
    list(input: SalesSearchInput): Promise<Result<SalePage>>;
    previewVoid(saleId: string): Promise<Result<VoidPreview>>;
    void(input: VoidInput): Promise<Result<SaleDetail>>;
    previewReturn(saleId: string): Promise<Result<ReturnPreview>>;
    returnSale(input: ReturnConfirmInput): Promise<Result<SaleReturnDetail>>;
    returns(saleId: string): Promise<Result<SaleReturnDetail[]>>;
  };
  system: {
    health(): Promise<Result<SystemStatus>>;
    reconnect(): Promise<Result<SystemStatus>>;
  };
  products: {
    get(productId: string): Promise<Result<Product>>;
    search(input: ProductSearchInput): Promise<Result<ProductPage>>;
    save(input: ProductSaveInput): Promise<Result<Product>>;
    setActive(input: SetActiveInput): Promise<Result<Product>>;
    taxonomy(input: { includeInactive?: boolean }): Promise<Result<ProductTaxonomy>>;
    saveCategory(input: TaxonomySaveInput): Promise<Result<TaxonomyItem>>;
    saveBrand(input: TaxonomySaveInput): Promise<Result<TaxonomyItem>>;
    findByBarcode(barcode: string): Promise<Result<Product>>;
    proposeInternalBarcode(): Promise<Result<{ barcode: string }>>;
    labels(input: { status?: 'PENDING' | 'PRINTED' }): Promise<Result<ProductLabelPage>>;
    createLabel(input: { productId: string }): Promise<Result<ProductLabel>>;
    markLabelPrinted(input: { labelId: string }): Promise<Result<ProductLabel>>;
    previewImport(): Promise<Result<ImportPreview | null>>;
    applyImport(input: ApplyImportInput): Promise<Result<ImportResult>>;
  };
  pricing: {
    preview(input: PricePreviewInput): Promise<Result<PricePreview>>;
    confirm(input: PriceConfirmInput): Promise<Result<PriceChangeBatch>>;
  };
  promotions: {
    list(): Promise<Result<Promotion[]>>;
    get(promotionId: string): Promise<Result<Promotion>>;
    save(input: PromotionSaveInput): Promise<Result<Promotion>>;
  };
  checkout: {
    cancelDraft(expectedRevision: number): Promise<Result<null>>;
    getDraft(): Promise<Result<DraftRecord | null>>;
    saveDraft(input: SaveDraftInput): Promise<Result<DraftRecord>>;
  };
  stock: {
    operation(operationKey: string): Promise<Result<StockBalance | null>>;
    get(productId: string): Promise<Result<StockBalance>>;
    search(input: StockSearchInput): Promise<Result<StockPage>>;
    opening(input: StockCountInput): Promise<Result<StockBalance>>;
    count(input: StockCountInput): Promise<Result<StockBalance>>;
    record(input: StockRecordInput): Promise<Result<StockBalance>>;
    listLow(input: { limit: number; cursor?: string }): Promise<Result<StockPage>>;
    movements(input: StockMovementsInput): Promise<Result<MovementPage>>;
  };
  lots: {
    status(productId: string): Promise<Result<LotProductStatus>>;
    enable(productId: string): Promise<Result<LotProductStatus>>;
    reconcile(input: LotReconcileInput): Promise<Result<LotProductStatus>>;
    setBlocked(input: LotSetBlockedInput): Promise<Result<InventoryLot>>;
  };
  preparedOrders: {
    create(
      input: import('./prepared-orders').PreparedOrderCreate,
    ): Promise<Result<import('./prepared-orders').PreparedOrder>>;
    list(
      input: import('./prepared-orders').PreparedOrderList,
    ): Promise<Result<{ items: import('./prepared-orders').PreparedOrder[]; total: number }>>;
    byNumber(number: number): Promise<Result<import('./prepared-orders').PreparedOrder>>;
    cancel(
      input: import('./prepared-orders').PreparedOrderCancel,
    ): Promise<Result<import('./prepared-orders').PreparedOrder>>;
  };
  deliveryNotes: {
    list(input: {
      kind?: import('./delivery-notes').DeliveryNoteKind;
      status?: 'ISSUED' | 'DELIVERED' | 'CANCELLED';
      limit?: number;
      offset?: number;
    }): Promise<Result<import('./delivery-notes').DeliveryNotePage>>;
    sources(input: {
      kind: import('./delivery-notes').DeliveryNoteKind;
      number?: number;
    }): Promise<Result<import('./delivery-notes').DeliveryNoteSource[]>>;
    detail(noteId: string): Promise<Result<import('./delivery-notes').DeliveryNote>>;
    create(
      input: import('./delivery-notes').DeliveryNoteCreate,
    ): Promise<Result<import('./delivery-notes').DeliveryNote>>;
    deliver(
      input: import('./delivery-notes').DeliveryNoteAction,
    ): Promise<Result<import('./delivery-notes').DeliveryNote>>;
    cancel(
      input: import('./delivery-notes').DeliveryNoteAction,
    ): Promise<Result<import('./delivery-notes').DeliveryNote>>;
  };
  receipts: {
    create(input: ReceiptCreateInput): Promise<Result<SaleReceipt>>;
    list(input: { status?: 'PENDING' | 'PRINTED' }): Promise<Result<ReceiptPage>>;
    markPrinted(input: { receiptId: string }): Promise<Result<SaleReceipt>>;
  };
  suppliers: {
    get(supplierId: string): Promise<Result<Supplier>>;
    search(input: SupplierSearchInput): Promise<Result<SupplierPage>>;
    save(input: SupplierSaveInput): Promise<Result<Supplier>>;
    setActive(input: SupplierSetActiveInput): Promise<Result<Supplier>>;
  };
  supplierAccounts: {
    detail(supplierId: string): Promise<Result<SupplierAccount>>;
    pay(input: SupplierPaymentInput): Promise<Result<SupplierPayment>>;
  };
  customers: {
    get(customerId: string): Promise<Result<Customer>>;
    search(input: {
      query?: string;
      activeOnly?: boolean;
      limit?: number;
    }): Promise<Result<CustomerPage>>;
    save(input: CustomerSaveInput): Promise<Result<Customer>>;
    setActive(input: {
      customerId: string;
      expectedRevision: number;
      active: boolean;
    }): Promise<Result<Customer>>;
    setCredit(input: {
      customerId: string;
      expectedRevision: number;
      creditEnabled: boolean;
      creditLimitCents: number;
    }): Promise<Result<Customer>>;
  };
  customerAccounts: {
    detail(customerId: string): Promise<Result<CustomerAccount>>;
    collect(input: CustomerCollectionInput): Promise<Result<CustomerCollection>>;
  };
  locations: {
    inventory(input: {
      locationId: string;
      query?: string;
      limit?: number;
      offset?: number;
    }): Promise<Result<import('./locations').LocationInventory>>;
    list(): Promise<Result<Location[]>>;
    save(input: LocationSaveInput): Promise<Result<Location>>;
    assignTerminal(input: { terminalId: string; locationId: string }): Promise<Result<Location>>;
    summary(month: string): Promise<Result<LocationSummary>>;
  };
  transfers: {
    list(input: {
      status?: 'ALL' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
      limit?: number;
    }): Promise<Result<StockTransfer[]>>;
    detail(transferId: string): Promise<Result<StockTransfer>>;
    dispatch(input: TransferDispatchInput): Promise<Result<StockTransfer>>;
    receive(input: TransferReceiveInput): Promise<Result<StockTransfer>>;
    cancel(input: TransferCancelInput): Promise<Result<StockTransfer>>;
  };
  purchases: {
    getDraft(): Promise<Result<PurchaseDraftRecord | null>>;
    saveDraft(input: PurchaseDraftSaveInput): Promise<Result<PurchaseDraftRecord>>;
    cancelDraft(expectedRevision: number): Promise<Result<null>>;
    receive(input: PurchaseReceiveInput): Promise<Result<PurchaseDetail>>;
    findByReceiptKey(receiptKey: string): Promise<Result<PurchaseDetail | null>>;
    detail(purchaseId: string): Promise<Result<PurchaseDetail>>;
    list(input: PurchaseSearchInput): Promise<Result<PurchasePage>>;
    previewVoid(purchaseId: string): Promise<Result<PurchaseVoidPreview>>;
    void(input: PurchaseVoidInput): Promise<Result<PurchaseDetail>>;
    lastCost(productId: string): Promise<
      Result<{
        productId: string;
        unitCostCents: number;
        purchaseId: string;
        receivedAt: string;
      } | null>
    >;
  };
  costs: {
    get(productId: string): Promise<Result<ProductCost | null>>;
    setReference(input: CostReferenceInput): Promise<Result<ProductCost>>;
  };
}
export const IPC = { systemHealth: 'bocha:system-health' } as const;
