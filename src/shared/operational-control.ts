import { z } from 'zod';
export const ControlPageSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(25),
});
export interface CountLot {
  lotId: string;
  code?: string;
  countedBase: number;
  expectedRevision: number;
}
export interface CountLine {
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: 'UNIT' | 'KG';
  countedBase: number | null;
  observedBase: number | null;
  differenceBase: number | null;
  status: 'UNCOUNTED' | 'COUNTED' | 'REVIEW' | 'APPLIED';
  lots: {
    lotId: string;
    code: string;
    quantityBase: number;
    revision: number;
    countedBase?: number | null;
  }[];
}
export interface CountSession {
  id: string;
  locationId: string;
  locationName: string;
  categoryId: string | null;
  revision: number;
  status: 'DRAFT' | 'APPLIED';
  lines: CountLine[];
  updatedAt: string;
}
export interface ControlPage<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
export interface AgendaRow {
  kind: 'CUSTOMER' | 'SUPPLIER';
  obligationId: string;
  partyId: string;
  name: string;
  balanceCents: number;
  dueOn: string | null;
  dueRevision: number;
  createdAt: string;
}
export interface CashDifference {
  shiftId: string;
  terminalName: string;
  actorName: string;
  closedAt: string;
  expectedCents: number;
  countedCents: number;
  differenceCents: number;
  reviewRevision: number;
  reviewNote: string | null;
  reviewedAt: string | null;
}
export interface ExpiryRow {
  lotId: string;
  productId: string;
  productName: string;
  code: string;
  expiresOn: string;
  locationId: string;
  locationName: string;
  quantityBase: number;
  status: string;
  unit: 'UNIT' | 'KG';
}
export interface ControlMetadata {
  locations: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}
