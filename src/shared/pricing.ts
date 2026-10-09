import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_MONEY } from '../domain/values';

export const PriceChangeSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('PERCENT'), basisPoints: z.number().int().min(-9900).max(100000) }),
  z.strictObject({ type: z.literal('FIXED'), priceCents: z.number().int().min(1).max(MAX_MONEY) }),
]);
export const PricePreviewSchema = z.strictObject({
  productIds: z.array(IdSchema).min(1).max(1000).refine((ids) => new Set(ids).size === ids.length, 'No repitas productos.'),
  change: PriceChangeSchema,
});
export const PriceConfirmSchema = z.strictObject({ previewToken: IdSchema, operationKey: IdSchema });
export type PricePreviewInput = z.infer<typeof PricePreviewSchema>;
export type PriceConfirmInput = z.infer<typeof PriceConfirmSchema>;
export interface PricePreview {
  previewToken: string;
  expiresAt: string;
  change: z.infer<typeof PriceChangeSchema>;
  items: { productId: string; name: string; beforeCents: number; afterCents: number; expectedRevision: number }[];
}
export interface PriceChangeBatch {
  id: string;
  operationKey: string;
  itemCount: number;
  createdAt: string;
  items: PricePreview['items'];
}
