import { z } from 'zod';

export const DeliveryNoteKindSchema = z.enum(['SALE', 'PURCHASE', 'TRANSFER']);
export type DeliveryNoteKind = z.infer<typeof DeliveryNoteKindSchema>;
export const deliveryNoteFeatures = {
  SALE: 'DELIVERY_NOTES_SALES',
  PURCHASE: 'DELIVERY_NOTES_PURCHASES',
  TRANSFER: 'DELIVERY_NOTES_INTERNAL',
} as const;
export const deliveryNoteLabels: Record<DeliveryNoteKind, string> = {
  SALE: 'Salida a cliente',
  PURCHASE: 'Entrada de proveedor',
  TRANSFER: 'Traslado interno',
};
export const DeliveryNoteCreateSchema = z.strictObject({
  kind: DeliveryNoteKindSchema,
  sourceId: z.uuid(),
  operationKey: z.uuid(),
  recipient: z.string().trim().min(2).max(160),
  address: z.string().trim().max(300).default(''),
  reference: z.string().trim().max(80).default(''),
  note: z.string().trim().max(1000).default(''),
});
export const DeliveryNoteListSchema = z.strictObject({
  kind: DeliveryNoteKindSchema.optional(),
  status: z.enum(['ISSUED', 'DELIVERED', 'CANCELLED']).optional(),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).max(1000000).default(0),
});
export const DeliveryNoteSourcesSchema = z.strictObject({
  kind: DeliveryNoteKindSchema,
  number: z.number().int().positive().optional(),
});
export const DeliveryNoteIdSchema = z.strictObject({ noteId: z.uuid() });
export const DeliveryNoteActionSchema = DeliveryNoteIdSchema.extend({
  expectedRevision: z.number().int().positive(),
  operationKey: z.uuid(),
  reason: z.string().trim().min(3).max(240),
});
export type DeliveryNoteCreate = z.infer<typeof DeliveryNoteCreateSchema>;
export type DeliveryNoteAction = z.infer<typeof DeliveryNoteActionSchema>;
export interface DeliveryNoteSource {
  id: string;
  number: number;
  date: string;
  recipient: string;
  status: string;
}
export interface DeliveryNoteSnapshot {
  businessName: string;
  sourceNumber: number;
  sourceDate: string;
  sourceStatus: string;
  origin: string;
  destination: string;
  recipient: string;
  address: string;
  reference: string;
  note: string;
  items: {
    sourceItemId: string;
    productId: string;
    sku: string;
    name: string;
    unit: 'UNIT' | 'KG';
    quantityBase: number;
  }[];
}
export interface DeliveryNote {
  id: string;
  number: number;
  kind: DeliveryNoteKind;
  sourceId: string;
  supersedesNumber: number | null;
  status: 'ISSUED' | 'DELIVERED' | 'CANCELLED';
  sourceStatus: string;
  revision: number;
  createdAt: string;
  actorName: string;
  deliveredAt: string | null;
  deliveredBy: string | null;
  deliveryReason: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancelReason: string | null;
  snapshot: DeliveryNoteSnapshot;
}
export interface DeliveryNotePage {
  items: DeliveryNote[];
  total: number;
}
