import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_MONEY, MAX_QUANTITY } from '../domain/values';

const base = {
  id: IdSchema.optional(), expectedRevision: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(100), status: z.enum(['DRAFT','ACTIVE','PAUSED']),
  priority: z.number().int().min(0).max(100).default(10),
  startsAt: z.iso.datetime().nullable(), endsAt: z.iso.datetime().nullable(),
  productIds: z.array(IdSchema).max(1000).default([]), categoryIds: z.array(IdSchema).max(100).default([]), brandIds: z.array(IdSchema).max(100).default([]),
};
export const PromotionSaveSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...base, type: z.literal('PERCENT'), basisPoints: z.number().int().min(1).max(10000) }),
  z.strictObject({ ...base, type: z.literal('X_FOR_Y'), buyQuantity: z.number().int().min(2).max(100), payQuantity: z.number().int().min(1).max(99) }),
  z.strictObject({ ...base, type: z.literal('QUANTITY_PRICE'), thresholdBase: z.number().int().min(1).max(MAX_QUANTITY), specialPriceCents: z.number().int().min(1).max(MAX_MONEY) }),
  z.strictObject({ ...base, type: z.literal('COMBO_PRICE'), comboPriceCents: z.number().int().min(1).max(MAX_MONEY), components: z.array(z.strictObject({ productId: IdSchema, quantityBase: z.number().int().min(1).max(MAX_QUANTITY) })).min(2).max(20) }),
]).superRefine((value, context) => {
  if (Boolean(value.id) !== Boolean(value.expectedRevision)) context.addIssue({ code: 'custom', message: 'Para editar se requiere la revisión actual.' });
  if (value.startsAt && value.endsAt && value.endsAt <= value.startsAt) context.addIssue({ code: 'custom', path: ['endsAt'], message: 'La finalización debe ser posterior al inicio.' });
  if (value.type === 'X_FOR_Y' && value.payQuantity >= value.buyQuantity) context.addIssue({ code: 'custom', message: 'La cantidad a pagar debe ser menor que la cantidad ofrecida.' });
  if (value.type === 'COMBO_PRICE' && new Set(value.components.map((component) => component.productId)).size !== value.components.length)
    context.addIssue({ code: 'custom', path: ['components'], message: 'Cada producto puede aparecer una sola vez en el combo.' });
  if (value.type !== 'COMBO_PRICE' && !value.productIds.length && !value.categoryIds.length && !value.brandIds.length) context.addIssue({ code: 'custom', message: 'Elegí al menos un producto, categoría o marca.' });
});
export type PromotionSaveInput = z.infer<typeof PromotionSaveSchema>;
export interface Promotion { id: string; revision: number; createdAt: string; updatedAt: string; actorName: string; input: PromotionSaveInput }
