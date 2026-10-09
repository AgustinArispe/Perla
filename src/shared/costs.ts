import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_MONEY } from '../domain/values';

export const CostReferenceSchema = z.strictObject({
  productId: IdSchema,
  unitCostCents: z.number().int().min(1).max(MAX_MONEY),
  expectedRevision: z.number().int().min(0),
});
export type CostReferenceInput = z.infer<typeof CostReferenceSchema>;
export interface ProductCost {
  productId: string;
  method: 'WEIGHTED_AVERAGE' | 'REFERENCE';
  rateMicrosPerBase: number;
  unitCostCents: number;
  coveredQuantityBase: number;
  revision: number;
  effectiveAt: string;
  actorUserId: string;
  actorName: string;
}
