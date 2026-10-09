import { z } from 'zod';
import { MAX_MONEY } from '../domain/values';
import { IdSchema } from './catalog';

export const SupplierPaymentMethodSchema = z.enum(['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER']);

export const SupplierPaymentInputSchema = z
  .strictObject({
    operationKey: IdSchema,
    supplierId: IdSchema,
    amountCents: z.number().int().min(1).max(MAX_MONEY),
    businessDate: z.iso.date(),
    method: SupplierPaymentMethodSchema,
    shiftId: IdSchema.nullable().optional(),
    note: z.string().trim().min(1).max(240).nullable().optional(),
    allocations: z
      .array(
        z.strictObject({
          purchaseId: IdSchema,
          amountCents: z.number().int().min(1).max(MAX_MONEY),
          expectedBalanceCents: z.number().int().min(1).max(MAX_MONEY).optional(),
        }),
      )
      .max(100)
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.method === 'CASH' && !value.shiftId)
      context.addIssue({
        code: 'custom',
        path: ['shiftId'],
        message: 'Elegí una caja abierta para el pago en efectivo.',
      });
    if (value.method !== 'CASH' && value.shiftId)
      context.addIssue({
        code: 'custom',
        path: ['shiftId'],
        message: 'La caja sólo corresponde a pagos en efectivo.',
      });
  });

export type SupplierPaymentMethod = z.infer<typeof SupplierPaymentMethodSchema>;
export type SupplierPaymentInput = z.infer<typeof SupplierPaymentInputSchema>;

export interface SupplierPayable {
  purchaseId: string;
  purchaseNumber: number;
  businessDate: string;
  originalCents: number;
  balanceCents: number;
  status: 'OPEN' | 'PAID' | 'VOIDED';
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  businessDate: string;
  method: SupplierPaymentMethod;
  amountCents: number;
  note: string | null;
  actorName: string;
  createdAt: string;
  shiftId: string | null;
  allocations: { purchaseId: string; purchaseNumber: number; amountCents: number }[];
}

export interface SupplierCredit {
  id: string;
  purchaseId: string;
  purchaseNumber: number;
  amountCents: number;
  reason: string;
  createdAt: string;
}

export interface SupplierAccount {
  supplierId: string;
  supplierName: string;
  balanceCents: number;
  creditCents: number;
  payables: SupplierPayable[];
  payments: SupplierPayment[];
  credits: SupplierCredit[];
}
