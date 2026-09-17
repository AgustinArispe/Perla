import { z } from 'zod';
import { MAX_MONEY, MAX_QUANTITY } from '../domain/values';

export const IdSchema = z.uuid();
const code = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[\p{L}\p{N}._/-]+$/u, 'El código no puede contener espacios.');
export const ProductInputSchema = z.strictObject({
  sku: code.transform((value) => value.toUpperCase()),
  barcode: code.nullable(),
  name: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres.').max(140),
  category: z.string().trim().min(1).max(80).nullable(),
  saleUnit: z.enum(['UNIT', 'KG']),
  priceCents: z.number().int().min(1, 'El precio debe ser mayor a cero.').max(MAX_MONEY),
  active: z.boolean(),
  trackStock: z.boolean(),
  minStockBase: z.number().int().min(0).max(MAX_QUANTITY),
});
export const ProductSaveSchema = ProductInputSchema.extend({
  id: IdSchema.optional(),
  expectedRevision: z.number().int().min(1).optional(),
}).refine((value) => Boolean(value.id) === Boolean(value.expectedRevision), {
  message: 'Para editar un producto se requiere su revisión actual.',
});
export type ProductInput = z.infer<typeof ProductInputSchema>;
export type ProductSaveInput = z.infer<typeof ProductSaveSchema>;
export interface Product extends ProductInput {
  id: string;
  revision: number;
  stockInitialized: boolean;
  createdAt: string;
  updatedAt: string;
}
export const ProductSearchSchema = z.strictObject({
  query: z.string().trim().max(120),
  activeOnly: z.boolean(),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ALL'),
  limit: z.number().int().min(1).max(100),
  cursor: z.string().max(1000).optional(),
});
export type ProductSearchInput = z.input<typeof ProductSearchSchema>;
export const SetActiveSchema = z.strictObject({
  productId: IdSchema,
  active: z.boolean(),
  expectedRevision: z.number().int().min(1),
});
export type SetActiveInput = z.infer<typeof SetActiveSchema>;
export interface ProductPage {
  items: Product[];
  total: number;
  nextCursor: string | null;
}
export interface ImportPreview {
  previewToken: string;
  sourceName: string;
  sourceHash: string;
  rowCount: number;
  newCount: number;
  updateCount: number;
  priceChanges: number;
  stockOpenings: number;
  errors: { row: number; message: string }[];
  rows: {
    row: number;
    sku: string;
    name: string;
    barcode: string | null;
    priceCents: number;
    previousPriceCents: number | null;
    countedBase: number | null;
    unit: 'UNIT' | 'KG';
    action: 'CREATE' | 'UPDATE';
  }[];
  alreadyApplied: boolean;
}
export const ApplyImportSchema = z.strictObject({
  previewToken: IdSchema,
  operationKey: IdSchema,
  confirmPriceChanges: z.boolean(),
  confirmStockCounts: z.boolean().optional(),
});
export type ApplyImportInput = z.infer<typeof ApplyImportSchema>;
export interface ImportResult {
  batchId: string;
  rowsApplied: number;
  alreadyApplied: boolean;
}

export const DraftBodySchema = z.strictObject({
  checkoutKey: IdSchema,
  lines: z
    .array(
      z.strictObject({
        lineId: IdSchema,
        productId: IdSchema,
        quantityBase: z.number().int().min(1).max(MAX_QUANTITY),
        expectedProductRevision: z.number().int().min(1),
        expectedPriceCents: z.number().int().min(1).max(MAX_MONEY),
      }),
    )
    .max(200),
  discount: z.discriminatedUnion('type', [
    z.strictObject({ type: z.literal('NONE') }),
    z.strictObject({ type: z.literal('PERCENT'), basisPoints: z.number().int().min(0).max(10000) }),
    z.strictObject({
      type: z.literal('FIXED'),
      amountCents: z.number().int().min(0).max(MAX_MONEY),
    }),
  ]),
});
export const SaveDraftSchema = z.strictObject({
  body: DraftBodySchema,
  expectedRevision: z.number().int().min(0),
});
export type SaveDraftInput = z.infer<typeof SaveDraftSchema>;
export interface DraftRecord {
  body: z.infer<typeof DraftBodySchema>;
  revision: number;
  updatedAt: string;
}
