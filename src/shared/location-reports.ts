import { z } from "zod";
import { MonthSchema } from "./reports";

export const LocationSummaryRequestSchema = z.strictObject({
  month: MonthSchema,
});
export type LocationSummaryRequest = z.infer<
  typeof LocationSummaryRequestSchema
>;
export interface LocationSummaryItem {
  id: string;
  name: string;
  active: boolean;
  hasTerminal: boolean;
  netCents: number;
  saleCount: number;
  averageCents: number;
  quantityUnits: number;
  quantityGrams: number;
  lowStockCount: number;
  outgoingTransfers: number;
  incomingTransfers: number;
}
export interface LocationSummary {
  month: string;
  total: {
    netCents: number;
    saleCount: number;
    averageCents: number;
    lowStockCount: number;
    inTransitCount: number;
  };
  locations: LocationSummaryItem[];
}
