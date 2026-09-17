import { z } from 'zod';
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
}
export const IPC = { systemHealth: 'bocha:system-health' } as const;
