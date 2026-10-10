import { CommercialFilterSchema } from './commercial-control';
import { z } from 'zod';
import {
  ExcelRequestSchema,
  ExcelSelectionSchema,
  ExcelPageSchema,
  type ExcelDataset,
  type ExcelFilters,
} from './excel';
export const ControlRequestSchema = z.strictObject({
  area: z.enum(['workspace', 'replenishment', 'commercial', 'operations']),
  action: z.string().min(1).max(50),
  input: z.unknown().default({}),
});
export type ControlRequest = z.infer<typeof ControlRequestSchema>;
export const ControlExportRequestSchema = ControlRequestSchema.extend({
  selection: ExcelSelectionSchema.optional(),
  page: ExcelPageSchema.optional(),
});
export type SavedViewModule = ExcelDataset | 'commercial' | 'agenda';
export const SavedViewSchema = z
  .strictObject({
    id: z.uuid().optional(),
    expectedRevision: z.number().int().positive().optional(),
    module: z.enum([
      'products',
      'stock',
      'purchases',
      'suppliers',
      'inventory',
      'transfers',
      'customers',
      'promotions',
      'sales',
      'shifts',
      'users',
      'audit',
      'commercial',
      'agenda',
    ]),
    name: z.string().trim().min(1).max(60),
    filters: z.record(z.string(), z.unknown()),
    dates: z.enum(['FIXED', 'WEEK', 'MONTH']).default('FIXED'),
  })
  .superRefine((v, c) => {
    const result =
      v.module === 'agenda'
        ? z
            .strictObject({
              kind: z.enum(['ALL', 'CUSTOMER', 'SUPPLIER']),
              bucket: z.enum(['ALL', 'OVERDUE', 'WEEK', 'NEXT', 'NO_DATE']),
            })
            .safeParse(v.filters)
        : v.module === 'commercial'
          ? CommercialFilterSchema.extend({ view: z.enum(['prices', 'rotation']) }).safeParse(
              v.filters,
            )
          : ExcelRequestSchema.safeParse({ dataset: v.module, filters: v.filters });
    if (!result.success) c.addIssue({ code: 'custom', message: 'Revisá los filtros de la vista.' });
    if (Boolean(v.id) !== Boolean(v.expectedRevision))
      c.addIssue({ code: 'custom', message: 'Revisá la versión de la vista.' });
  });
export interface SavedView<T = ExcelFilters> {
  id: string;
  module: SavedViewModule;
  name: string;
  filters: T;
  dates: 'FIXED' | 'WEEK' | 'MONTH';
  revision: number;
}
export interface ControlPending {
  key: string;
  title: string;
  total: number;
  area: string;
  action: string;
  sample: { id: string; name: string; detail: string; locationId?: string }[];
}
export interface ControlHome {
  groups: ControlPending[];
  generatedAt: string;
  overview: null | {
    businessDate: string;
    weekFrom: string;
    today: import('./reports').ReportTotals;
    week: import('./reports').ReportTotals;
    lastSaleDate: string | null;
  };
  registers: { id: string; name: string; operator: string | null; openedAt: string | null }[];
  accounts: null | {
    receivableCents: number;
    payableCents: number;
    overdueReceivableCents: number;
    overduePayableCents: number;
  };
}
