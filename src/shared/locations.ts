import { z } from "zod";
import { IdSchema } from "./catalog";
import { MAX_QUANTITY } from "../domain/values";

export const LocationSaveSchema = z.strictObject({
  id: IdSchema.optional(),
  expectedRevision: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(80),
  code: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .transform((value) => value.toUpperCase()),
  active: z.boolean().default(true),
});
export const LocationInventorySchema = z.strictObject({
  locationId: IdSchema,
  query: z.string().trim().max(120).default(""),
  limit: z.number().int().min(1).max(100).default(30),
  offset: z.number().int().min(0).default(0),
});
export interface LocationInventory {
  items: {
    productId: string;
    name: string;
    sku: string;
    barcode: string | null;
    unit: "UNIT" | "KG";
    quantityBase: number;
  }[];
  total: number;
}
export const TerminalLocationSchema = z.strictObject({
  terminalId: IdSchema,
  locationId: IdSchema,
});
const transferItem = z.strictObject({
  productId: IdSchema,
  quantityBase: z.number().int().min(1).max(MAX_QUANTITY),
});
export const TransferDispatchSchema = z
  .strictObject({
    operationKey: IdSchema,
    fromLocationId: IdSchema,
    toLocationId: IdSchema,
    note: z.string().trim().max(240).default(""),
    items: z.array(transferItem).min(1).max(200),
  })
  .superRefine((value, ctx) => {
    if (value.fromLocationId === value.toLocationId)
      ctx.addIssue({
        code: "custom",
        message: "Elegí dos ubicaciones diferentes.",
      });
    if (
      new Set(value.items.map((item) => item.productId)).size !==
      value.items.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Cada producto debe aparecer una sola vez.",
      });
  });
export const TransferReceiveSchema = z.strictObject({
  transferId: IdSchema,
  operationKey: IdSchema,
  items: z
    .array(
      z.strictObject({
        productId: IdSchema,
        receivedBase: z.number().int().min(0).max(MAX_QUANTITY),
      }),
    )
    .min(1)
    .max(200),
});
export const TransferCancelSchema = z.strictObject({
  transferId: IdSchema,
  operationKey: IdSchema,
  reason: z.string().trim().min(3).max(240),
});
export const TransferListSchema = z.strictObject({
  status: z.enum(["ALL", "IN_TRANSIT", "RECEIVED", "CANCELLED"]).default("ALL"),
  limit: z.number().int().min(1).max(100).default(30),
});

export type LocationSaveInput = z.infer<typeof LocationSaveSchema>;
export type TransferDispatchInput = z.infer<typeof TransferDispatchSchema>;
export type TransferReceiveInput = z.infer<typeof TransferReceiveSchema>;
export type TransferCancelInput = z.infer<typeof TransferCancelSchema>;
export interface Location {
  id: string;
  name: string;
  code: string;
  active: boolean;
  isDefault: boolean;
  revision: number;
}
export interface TransferItem {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: "UNIT" | "KG";
  dispatchedBase: number;
  receivedBase: number | null;
  differenceBase: number | null;
  costMethod: string | null;
  costRateMicrosPerBase: number | null;
}
export interface StockTransfer {
  id: string;
  number: number;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  status: "IN_TRANSIT" | "RECEIVED" | "CANCELLED";
  note: string;
  dispatchedByName: string;
  dispatchedAt: string;
  receivedByName: string | null;
  receivedAt: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  revision: number;
  items: TransferItem[];
}
