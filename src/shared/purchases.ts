import { z } from 'zod';
import { MAX_MONEY, MAX_QUANTITY } from '../domain/values';
import { IdSchema } from './catalog';

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable().optional();

export const SupplierSaveSchema = z
  .strictObject({
    id: IdSchema.optional(),
    expectedRevision: z.number().int().positive().optional(),
    name: z.string().trim().min(2).max(140),
    phone: optionalText(40),
    contactName: optionalText(120),
    address: optionalText(240),
    notes: optionalText(1000),
  })
  .refine((value) => Boolean(value.id) === Boolean(value.expectedRevision), {
    message: 'Para editar un proveedor se requiere su revisión actual.',
  });

export const SupplierSetActiveSchema = z.strictObject({
  supplierId: IdSchema,
  active: z.boolean(),
  expectedRevision: z.number().int().positive(),
});

export const SupplierSearchSchema = z.strictObject({
  query: z.string().trim().max(120).default(''),
  status: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
  limit: z.number().int().min(1).max(100),
  cursor: z.string().max(1200).optional(),
});

export const PurchaseDraftLineSchema = z.strictObject({
  lineId: IdSchema,
  productId: IdSchema,
  quantityBase: z.number().int().min(1).max(MAX_QUANTITY),
  unitCostCents: z.number().int().min(0).max(MAX_MONEY),
  expectedProductRevision: z.number().int().positive(),
  lotCode: z.string().trim().min(1).max(80).optional(),
  expiresOn: z.iso.date().nullable().optional(),
});

export const PurchaseDraftBodySchema = z
  .strictObject({
    receiptKey: IdSchema,
    supplierId: IdSchema.nullable(),
    businessDate: z.iso.date(),
    lines: z.array(PurchaseDraftLineSchema).max(200),
  })
  .superRefine((value, context) => {
    const products = new Set<string>();
    const lineIds = new Set<string>();
    value.lines.forEach((line, index) => {
      if (products.has(line.productId))
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'productId'],
          message: 'Cada producto puede aparecer una sola vez en la compra.',
        });
      if (lineIds.has(line.lineId))
        context.addIssue({
          code: 'custom',
          path: ['lines', index, 'lineId'],
          message: 'Cada renglón necesita un identificador único.',
        });
      products.add(line.productId);
      lineIds.add(line.lineId);
    });
  });

export const PurchaseDraftSaveSchema = z.strictObject({
  body: PurchaseDraftBodySchema,
  expectedRevision: z.number().int().min(0),
});

export const PurchaseReceiveSchema = PurchaseDraftBodySchema.extend({
  expectedDraftRevision: z.number().int().positive().optional(),
}).superRefine((value, context) => {
  if (value.supplierId === null || value.lines.length === 0)
    context.addIssue({
      code: 'custom',
      message: 'Elegí un proveedor y agregá al menos un producto.',
    });
  value.lines.forEach((line, index) => {
    if (line.unitCostCents <= 0)
      context.addIssue({
        code: 'custom',
        path: ['lines', index, 'unitCostCents'],
        message: 'Ingresá el costo del producto.',
      });
  });
});

export const PurchaseSearchSchema = z
  .strictObject({
    fromDate: z.iso.date().optional(),
    toDate: z.iso.date().optional(),
    supplierId: IdSchema.optional(),
    status: z.enum(['ALL', 'RECEIVED', 'VOIDED']).default('ALL'),
    limit: z.number().int().min(1).max(100),
    cursor: z.string().max(1200).optional(),
  })
  .refine((value) => !value.fromDate || !value.toDate || value.fromDate <= value.toDate, {
    message: 'El rango de fechas no es válido.',
  });

export const PurchaseVoidSchema = z.strictObject({
  purchaseId: IdSchema,
  operationKey: IdSchema,
  reason: z.string().trim().min(3).max(240),
});

export type SupplierSaveInput = z.infer<typeof SupplierSaveSchema>;
export type SupplierSetActiveInput = z.infer<typeof SupplierSetActiveSchema>;
export type SupplierSearchInput = z.input<typeof SupplierSearchSchema>;
export type PurchaseDraftBody = z.infer<typeof PurchaseDraftBodySchema>;
export type PurchaseDraftSaveInput = z.infer<typeof PurchaseDraftSaveSchema>;
export type PurchaseReceiveInput = z.infer<typeof PurchaseReceiveSchema>;
export type PurchaseSearchInput = z.input<typeof PurchaseSearchSchema>;
export type PurchaseVoidInput = z.infer<typeof PurchaseVoidSchema>;

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  contactName: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  revision: number;
  lastPurchaseAt: string | null;
  createdAt: string;
  updatedAt: string;
  balanceCents: number;
  creditCents: number;
}

export interface SupplierPage {
  items: Supplier[];
  total: number;
  nextCursor: string | null;
}

export interface PurchaseDraftRecord {
  body: PurchaseDraftBody;
  revision: number;
  updatedAt: string;
}

export interface PurchaseItem {
  id: string;
  lineId: string;
  productId: string;
  sku: string;
  barcode: string | null;
  name: string;
  unit: 'UNIT' | 'KG';
  quantityBase: number;
  unitCostCents: number;
  subtotalCents: number;
  productRevision: number;
}

export interface PurchaseEvent {
  id: string;
  kind: 'RECEIVED' | 'VOIDED';
  reason: string;
  actorUserId: string;
  actorName: string;
  createdAt: string;
}

export interface PurchaseDetail {
  id: string;
  number: number;
  receiptKey: string;
  supplierId: string;
  supplierName: string;
  supplierPhone: string | null;
  status: 'RECEIVED' | 'VOIDED';
  receivedAt: string;
  businessDate: string;
  totalCents: number;
  stockApplied: boolean;
  actorUserId: string;
  actorName: string;
  items: PurchaseItem[];
  events: PurchaseEvent[];
}

export type PurchaseSummary = Omit<PurchaseDetail, 'items' | 'events'>;

export interface PurchasePage {
  items: PurchaseSummary[];
  total: number;
  nextCursor: string | null;
}

export interface PurchaseVoidPreview {
  reversible: boolean;
  conflicts: { productId: string; name: string; reason: string }[];
}
