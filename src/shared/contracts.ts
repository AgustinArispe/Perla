import { z } from 'zod';
import type {
  CheckoutInput,
  VoidInput,
  SalesSearchInput,
  SaleDetail,
  SalePage,
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
} from './catalog';

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
  sales: {
    complete(input: CheckoutInput): Promise<Result<SaleDetail>>;
    findByCheckoutKey(checkoutKey: string): Promise<Result<SaleDetail | null>>;
    detail(saleId: string): Promise<Result<SaleDetail>>;
    list(input: SalesSearchInput): Promise<Result<SalePage>>;
    previewVoid(saleId: string): Promise<Result<VoidPreview>>;
    void(input: VoidInput): Promise<Result<SaleDetail>>;
  };
  system: { health(): Promise<Result<SystemStatus>>; reconnect(): Promise<Result<SystemStatus>> };
  products: {
    search(input: ProductSearchInput): Promise<Result<ProductPage>>;
    save(input: ProductSaveInput): Promise<Result<Product>>;
    setActive(input: SetActiveInput): Promise<Result<Product>>;
    findByBarcode(barcode: string): Promise<Result<Product>>;
    previewImport(): Promise<Result<ImportPreview | null>>;
    applyImport(input: ApplyImportInput): Promise<Result<ImportResult>>;
  };
  checkout: {
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
}
export const IPC = { systemHealth: 'bocha:system-health' } as const;
