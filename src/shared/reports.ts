import { z } from 'zod';
import type { PaymentInput } from './sales';
export const MonthSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);
export const MonthlyRequestSchema = z.strictObject({ month: MonthSchema });
export const ComparisonRequestSchema = z
  .strictObject({
    preset: z.enum(['TODAY', 'WEEK', 'MONTH', 'CUSTOM']),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .superRefine((value, context) => {
    if (value.preset === 'CUSTOM' && (!value.from || !value.to))
      context.addIssue({ code: 'custom', message: 'Elegí las fechas del rango.' });
    if (value.preset !== 'CUSTOM' && (value.from || value.to))
      context.addIssue({ code: 'custom', message: 'Las fechas sólo corresponden al rango.' });
  });
export type ComparisonRequest = z.infer<typeof ComparisonRequestSchema>;
export interface ReportTotals {
  grossCents: number;
  discountCents: number;
  netCents: number;
  saleCount: number;
  averageCents: number;
  voidedCount: number;
  voidedCents: number;
}
export interface RankedProduct {
  productId: string;
  name: string;
  unit: 'UNIT' | 'KG';
  quantityBase: number;
  netCents: number;
}
export interface ProfitabilityBreakdown {
  id: string;
  name: string;
  netCents: number;
  coveredNetCents: number;
  knownCostCents: number;
  grossMarginCents: number;
  coverageBasisPoints: number;
}
export interface MonthlyReport {
  month: string;
  /** 2: sales and returns by movement date; absent on legacy saved reports. */
  definitionVersion?: 2;
  generatedAt: string;
  lastChangedAt: string | null;
  period: { from: string; to: string; previousFrom: string; previousTo: string; open: boolean };
  totals: ReportTotals;
  comparison: { previous: ReportTotals; changeBasisPoints: number | null };
  payments: {
    method: PaymentInput['method'];
    amountCents: number;
    saleCount: number;
    /** Refund operations in the period; distinct from completed sale count. */
    refundCount?: number;
    shareBasisPoints: number;
    saleShareBasisPoints: number;
  }[];
  cardCents: number;
  daily: { date: string; netCents: number; saleCount: number }[];
  /** Actual previous-month dates, bounded by period.previousFrom/previousTo. */
  previousDaily?: { date: string; netCents: number; saleCount: number }[];
  rankings: { revenue: RankedProduct[]; units: RankedProduct[]; kilos: RankedProduct[] };
  profitability: {
    knownCostCents: number;
    coveredNetCents: number;
    grossMarginCents: number;
    coverageBasisPoints: number;
    /** Coverage of absolute movement revenue, including returns, with recorded costs. */
    coverageBasis?: 'ABSOLUTE_MOVEMENT_NET';
    missingLineCount: number;
    products: ProfitabilityBreakdown[];
    categories: ProfitabilityBreakdown[];
  };
  lowStock: {
    productId: string;
    name: string;
    unit: 'UNIT' | 'KG';
    quantityBase: number;
    minStockBase: number;
    soldBase: number;
    revenueRank: number | null;
    state: 'LOW' | 'EMPTY' | 'NEGATIVE';
  }[];
}
export interface PeriodComparison {
  preset: ComparisonRequest['preset'];
  period: { from: string; to: string; previousFrom: string; previousTo: string };
  current: ReportTotals;
  previous: ReportTotals;
  changeBasisPoints: number | null;
}
