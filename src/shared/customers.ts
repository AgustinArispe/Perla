import { z } from 'zod';
import { MAX_MONEY } from '../domain/values';
import { IdSchema } from './catalog';

export const CustomerSaveSchema = z
  .strictObject({
    id: IdSchema.optional(),
    expectedRevision: z.number().int().positive().optional(),
    name: z.string().trim().min(2).max(140),
    phone: z.string().trim().max(40).nullable().optional(),
    email: z.string().trim().email().max(180).nullable().optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .refine((v) => Boolean(v.id) === Boolean(v.expectedRevision), {
    message: 'Para editar se requiere la revisión actual.',
  });
export const CustomerSearchSchema = z.strictObject({
  query: z.string().trim().max(120).default(''),
  activeOnly: z.boolean().default(true),
  limit: z.number().int().min(1).max(100).default(30),
});
export const CustomerCreditSchema = z.strictObject({
  customerId: IdSchema,
  expectedRevision: z.number().int().positive(),
  creditEnabled: z.boolean(),
  creditLimitCents: z.number().int().min(0).max(MAX_MONEY),
});
export const CustomerSetActiveSchema = z.strictObject({
  customerId: IdSchema,
  expectedRevision: z.number().int().positive(),
  active: z.boolean(),
});
export const CustomerCollectionMethodSchema = z.enum([
  'CASH',
  'DEBIT',
  'CREDIT',
  'TRANSFER',
  'OTHER',
]);
export const CustomerCollectionInputSchema = z
  .strictObject({
    operationKey: IdSchema,
    customerId: IdSchema,
    amountCents: z.number().int().min(1).max(MAX_MONEY),
    businessDate: z.iso.date(),
    method: CustomerCollectionMethodSchema,
    shiftId: IdSchema.nullable().optional(),
    note: z.string().trim().min(1).max(240).nullable().optional(),
    allocations: z
      .array(
        z.strictObject({
          saleId: IdSchema,
          amountCents: z.number().int().min(1).max(MAX_MONEY),
          expectedBalanceCents: z.number().int().min(1).max(MAX_MONEY).optional(),
        }),
      )
      .min(1)
      .max(100)
      .optional(),
  })
  .superRefine((v, c) => {
    if (v.method === 'CASH' && !v.shiftId)
      c.addIssue({
        code: 'custom',
        path: ['shiftId'],
        message: 'Elegí una caja abierta para el cobro en efectivo.',
      });
    if (v.method !== 'CASH' && v.shiftId)
      c.addIssue({
        code: 'custom',
        path: ['shiftId'],
        message: 'La caja sólo corresponde a cobros en efectivo.',
      });
  });
export type CustomerSaveInput = z.infer<typeof CustomerSaveSchema>;
export type CustomerCollectionInput = z.infer<typeof CustomerCollectionInputSchema>;
export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  creditEnabled: boolean;
  creditLimitCents: number;
  balanceCents: number;
  availableCents: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
export interface CustomerPage {
  items: Customer[];
  total: number;
}
export interface CustomerCollection {
  id: string;
  customerId: string;
  businessDate: string;
  method: z.infer<typeof CustomerCollectionMethodSchema>;
  amountCents: number;
  note: string | null;
  actorName: string;
  shiftId: string | null;
  createdAt: string;
  allocations: { saleId: string; saleNumber: number; amountCents: number }[];
}
export interface CustomerAccount {
  customer: Customer;
  balanceCents: number;
  availableCents: number;
  creditCents: number;
  receivables: {
    saleId: string;
    saleNumber: number;
    businessDate: string;
    originalCents: number;
    balanceCents: number;
    status: 'OPEN' | 'PAID' | 'VOIDED';
  }[];
  collections: CustomerCollection[];
  credits: {
    id: string;
    saleId: string;
    saleNumber: number;
    amountCents: number;
    reason: string;
    createdAt: string;
  }[];
}
