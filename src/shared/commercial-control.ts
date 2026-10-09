import { z } from 'zod';
import type { ReportTotals } from './reports';
export const CommercialFilterSchema = z.strictObject({
  days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(60),
  productIds: z.array(z.uuid()).max(500).default([]),
  categoryIds: z.array(z.uuid()).max(100).default([]),
  brandIds: z.array(z.uuid()).max(100).default([]),
  locationId: z.uuid().optional(),
  includeEmpty: z.boolean().default(false),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
});
export type CommercialFilter = z.infer<typeof CommercialFilterSchema>;
export const PriceReviewSchema = z.strictObject({
  operationKey: z.uuid(),
  items: z
    .array(
      z.strictObject({
        productId: z.uuid(),
        priceCents: z.number().int().positive(),
        priceVersion: z.number().int().nonnegative().default(0),
        costRevision: z.number().int().positive().nullable(),
      }),
    )
    .min(1)
    .max(500),
});
export const CommercialSettingsSchema = z.strictObject({
  expectedRevision: z.number().int().positive(),
  marginBasisPoints: z.number().int().min(0).max(10000),
  staleDays: z.number().int().min(1).max(3650),
});
export const WeekRequestSchema = z.strictObject({
  weekStart: z.iso.date().optional(),
  version: z.number().int().positive().optional(),
  live: z.boolean().default(false),
});
export const WeekRecalculateSchema = z.strictObject({
  weekStart: z.iso.date(),
  operationKey: z.uuid(),
});
export interface CommercialItem {
  productId: string;
  name: string;
  unit: 'KG' | 'UNIT';
  priceCents: number;
  priceVersion: number;
  quantityBase: number;
  costCents: number | null;
  stockValueCents: number | null;
  costRevision: number | null;
  costOrigin: string | null;
  costEffectiveAt: string | null;
  marginBasisPoints: number | null;
  markupBasisPoints: number | null;
  lastSale: string | null;
  movementState: 'NEVER_SOLD' | 'NO_RECENT_SALES' | 'INSUFFICIENT_HISTORY';
  lastPriceChange: string | null;
  lastReview: string | null;
  reasons: string[];
}
export interface CommercialPage {
  items: CommercialItem[];
  total: number;
  page: number;
  limit: number;
  settings: { marginBasisPoints: number; staleDays: number; revision: number };
}
export interface WeeklySummary {
  id: string;
  version: number;
  weekStart: string;
  from: string;
  to: string;
  partial: boolean;
  source: 'LIVE' | 'SNAPSHOT';
  generatedAt: string;
  totals: ReportTotals;
  profitability: {
    knownCostCents: number;
    coveredNetCents: number;
    grossMarginCents: number;
    coverageBasisPoints: number;
    missingLineCount: number;
  };
  previous: ReportTotals;
  changeBasisPoints: number | null;
  pending: { productId: string; name: string; quantityBase: number; unit: 'KG' | 'UNIT' }[];
}
export interface ControlSheet {
  name: string;
  columns: string[];
  rows: (string | number | null)[][];
}
export interface ControlExport {
  filename: string;
  sheets: ControlSheet[];
}
