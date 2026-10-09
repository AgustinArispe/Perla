import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_QUANTITY } from '../domain/values';

export const LotReconcileSchema = z.strictObject({
  productId: IdSchema,
  operationKey: IdSchema,
  lots: z
    .array(
      z.strictObject({
        code: z.string().trim().min(1).max(80),
        expiresOn: z.iso.date().nullable(),
        quantityBase: z.number().int().min(1).max(MAX_QUANTITY),
      }),
    )
    .min(1)
    .max(100),
});

export const LotSetBlockedSchema = z.strictObject({
  lotId: IdSchema,
  blocked: z.boolean(),
});

export interface InventoryLot {
  id: string;
  productId: string;
  code: string;
  expiresOn: string | null;
  status: 'ACTIVE' | 'BLOCKED';
  quantityBase: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface LotProductStatus {
  productId: string;
  enabled: boolean;
  reconciled: boolean;
  stockQuantityBase: number | null;
  lots: InventoryLot[];
}

export type LotReconcileInput = z.infer<typeof LotReconcileSchema>;
export type LotSetBlockedInput = z.infer<typeof LotSetBlockedSchema>;
