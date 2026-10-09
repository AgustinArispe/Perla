import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_QUANTITY } from '../domain/values';

export const StockFilterSchema = z.enum([
  'ALL',
  'UNKNOWN',
  'OUT',
  'LOW',
  'NEGATIVE',
  'OK',
  'DISABLED',
  'SHORTAGES',
]);
export type StockState = Exclude<z.infer<typeof StockFilterSchema>, 'ALL' | 'SHORTAGES'>;
const mutation = {
  productId: IdSchema,
  operationKey: IdSchema,
  expectedRevision: z.number().int().min(0),
  expectedProductRevision: z.number().int().min(1),
  reason: z.string().trim().min(3, 'Escribí un motivo de al menos 3 caracteres.').max(240),
};
export const StockCountSchema = z.strictObject({
  ...mutation,
  countedBase: z.number().int().min(0).max(MAX_QUANTITY),
});
export const StockRecordSchema = z
  .strictObject({
    ...mutation,
    kind: z.enum(['RECEIPT', 'WASTE']),
    deltaBase: z.number().int().min(-MAX_QUANTITY).max(MAX_QUANTITY),
    allowNegative: z.boolean().optional(),
  })
  .refine((v) => (v.kind === 'RECEIPT' ? v.deltaBase > 0 : v.deltaBase < 0), {
    message: 'El ingreso debe ser positivo y la merma negativa; no se admite cero.',
  });
export const StockSearchSchema = z.strictObject({
  query: z.string().trim().max(120).default(''),
  filter: StockFilterSchema.default('ALL'),
  includeInactive: z.boolean().default(false),
  categoryId: IdSchema.optional(),
  brandId: IdSchema.optional(),
  limit: z.number().int().min(1).max(100),
  cursor: z.string().max(1200).optional(),
});
export const StockMovementsSchema = z
  .strictObject({
    productId: IdSchema,
    limit: z.number().int().min(1).max(100),
    cursor: z.string().max(1200).optional(),
    fromDate: z.iso.date().optional(),
    toDate: z.iso.date().optional(),
  })
  .refine((v) => !v.fromDate || !v.toDate || v.fromDate <= v.toDate, {
    message: 'El rango de fechas no es válido.',
  });
export type StockCountInput = z.infer<typeof StockCountSchema>;
export type StockRecordInput = z.infer<typeof StockRecordSchema>;
export type StockSearchInput = z.input<typeof StockSearchSchema>;
export type StockMovementsInput = z.infer<typeof StockMovementsSchema>;
export interface StockBalance {
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: 'UNIT' | 'KG';
  quantityBase: number | null;
  minStockBase: number;
  initialized: boolean;
  trackStock: boolean;
  active: boolean;
  revision: number;
  productRevision: number;
  state: StockState;
}
export interface StockMovement {
  id: string;
  productId: string;
  deltaBase: number;
  balanceAfterBase: number;
  kind: 'OPENING' | 'RECEIPT' | 'WASTE' | 'ADJUSTMENT' | 'SALE' | 'VOID';
  reason: string;
  createdAt: string;
  businessDate: string;
}
export interface StockPage {
  items: StockBalance[];
  total: number;
  nextCursor: string | null;
}
export interface MovementPage {
  items: StockMovement[];
  total: number;
  nextCursor: string | null;
}
