import { z } from 'zod';
import { IdSchema } from './catalog';
import { MAX_MONEY, MAX_QUANTITY } from '../domain/values';

const quantity = z.number().int().min(1).max(MAX_QUANTITY);
const revision = z.number().int().positive();
export const SuggestionQuerySchema = z.strictObject({
  locationId: IdSchema,
  productIds: z.array(IdSchema).max(200).default([]),
  onlyNeeded: z.boolean().default(false),
  asOf: z.iso.date().optional(),
  referenceDays: z.number().int().min(1).max(365).default(28),
  coverageDays: z.number().int().min(1).max(90).default(7),
  query: z.string().trim().max(120).default(''),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export const OrderCreateSchema = z
  .strictObject({
    operationKey: IdSchema,
    supplierId: IdSchema,
    locationId: IdSchema,
    expectedDate: z.iso.date().nullable().optional(),
    lines: z
      .array(
        z.strictObject({
          productId: IdSchema,
          quantityBase: quantity,
          estimatedCostCents: z.number().int().min(0).max(MAX_MONEY).nullable().optional(),
          expectedProductRevision: revision,
        }),
      )
      .min(1)
      .max(200),
  })
  .refine(
    (v) => new Set(v.lines.map((l) => l.productId)).size === v.lines.length,
    'No repitas productos.',
  );
export const OrderChangeSchema = z.strictObject({
  orderId: IdSchema,
  expectedRevision: revision,
  operationKey: IdSchema,
});
export const OrderConfirmSchema = OrderChangeSchema.extend({
  expectedDate: z.iso.date().nullable().optional(),
  acceptChangedStock: z.boolean().default(false),
});
export const OrderCancelSchema = OrderChangeSchema.extend({
  reason: z.string().trim().min(3).max(240),
});
export const OrderRescheduleSchema = OrderChangeSchema.extend({
  expectedDate: z.iso.date().nullable(),
});
export const OrderReceiveSchema = OrderChangeSchema.extend({
  businessDate: z.iso.date(),
  allowOverReceipt: z.boolean().default(false),
  lines: z
    .array(
      z.strictObject({
        lineId: IdSchema,
        quantityBase: quantity,
        unitCostCents: z.number().int().min(1).max(MAX_MONEY),
        expectedProductRevision: revision,
        lotCode: z.string().trim().min(1).max(80).optional(),
        expiresOn: z.iso.date().nullable().optional(),
      }),
    )
    .min(1)
    .max(200),
}).refine(
  (v) => new Set(v.lines.map((l) => l.lineId)).size === v.lines.length,
  'No repitas renglones.',
);
export const OrderListSchema = z.strictObject({
  locationId: IdSchema.optional(),
  supplierId: IdSchema.optional(),
  status: z.enum(['ALL', 'DRAFT', 'ORDERED', 'PARTIAL', 'RECEIVED', 'CANCELLED']).default('ALL'),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});
export const CalendarSchema = z
  .strictObject({
    locationId: IdSchema,
    expectedRevision: z.number().int().min(0),
    openWeekdays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
    closedDates: z.array(z.iso.date()).max(366).default([]),
  })
  .refine((v) => new Set(v.openWeekdays).size === v.openWeekdays.length, 'No repitas días.');
export const ProductRuleSchema = z.strictObject({
  productId: IdSchema,
  expectedRevision: z.number().int().min(0),
  purchaseMultipleBase: quantity,
});
export interface ReplenishmentLine {
  id: string;
  productId: string;
  name: string;
  unit: 'UNIT' | 'KG';
  orderedBase: number;
  receivedBase: number;
  cancelledBase: number;
  pendingBase: number;
  estimatedCostCents: number | null;
  productRevision: number;
  currentProductRevision: number;
}
export interface ReplenishmentOrder {
  id: string;
  number: number;
  supplierId: string;
  supplierName: string;
  locationId: string;
  locationName: string;
  status: 'DRAFT' | 'ORDERED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED';
  expectedDate: string | null;
  revision: number;
  createdAt: string;
  lines: ReplenishmentLine[];
}
export interface Suggestion {
  productId: string;
  name: string;
  unit: 'UNIT' | 'KG';
  productRevision: number;
  stockRevision: number;
  availableBase: number | null;
  targetBase: number;
  incomingBase: number;
  undatedBase: number;
  overdueBase: number;
  transitBase: number;
  otherLocationBase: number;
  suggestedBase: number | null;
  purchaseMultipleBase: number;
  purchaseRuleRevision: number;
  dailyDemand: number | null;
  observedOpenDays: number;
  reason: string;
  supplierId: string | null;
  estimatedCostCents: number | null;
}
export interface SuggestionPage {
  items: Suggestion[];
  total: number;
  locationId: string;
  asOf: string;
  horizon: string;
  calendarConfigured: boolean;
}
export interface ReplenishmentCalendar {
  locationId: string;
  revision: number;
  openWeekdays: number[];
  closedDates: string[];
}
