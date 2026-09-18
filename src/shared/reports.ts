import { z } from 'zod';
import type { PaymentInput } from './sales';
export const MonthSchema = z.string().regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/);
export const MonthlyRequestSchema = z.strictObject({ month: MonthSchema });
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
export interface MonthlyReport {
  month: string;
  generatedAt: string;
  lastChangedAt: string | null;
  period: { from: string; to: string; previousFrom: string; previousTo: string; open: boolean };
  totals: ReportTotals;
  comparison: { previous: ReportTotals; changeBasisPoints: number | null };
  payments: {
    method: PaymentInput['method'];
    amountCents: number;
    saleCount: number;
    shareBasisPoints: number;
    saleShareBasisPoints: number;
  }[];
  cardCents: number;
  daily: { date: string; netCents: number; saleCount: number }[];
  rankings: { revenue: RankedProduct[]; units: RankedProduct[]; kilos: RankedProduct[] };
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
