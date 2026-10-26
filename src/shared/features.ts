import { z } from 'zod';

export const FeatureKeySchema = z.enum([
  'REPLENISHMENT',
  'STOCK_CONTROL',
  'MONTHLY_DASHBOARD',
  'RECEIPTS',
  'PRODUCT_LABELS',
  'SUPPLIERS_PURCHASES',
  'COSTS_MARGIN',
  'RETURNS',
  'LOTS',
  'PROMOTIONS',
  'NOTIFICATIONS',
  'SUPPLIER_ACCOUNTS',
  'CUSTOMERS',
  'CUSTOMER_CREDIT',
  'LOCATIONS_TRANSFERS',
  'DELIVERY_NOTES_SALES',
  'DELIVERY_NOTES_PURCHASES',
  'DELIVERY_NOTES_INTERNAL',
  'PREPARED_ORDERS',
  'BUSINESS_UNITS',
]);

export type FeatureKey = z.infer<typeof FeatureKeySchema>;

export const FeatureStateSchema = z.object({
  key: FeatureKeySchema,
  name: z.string(),
  description: z.string(),
  enabled: z.boolean(),
});

export type FeatureState = z.infer<typeof FeatureStateSchema>;

export const FeatureFlagsSchema = z.object({
  REPLENISHMENT: z.boolean().default(false),
  STOCK_CONTROL: z.boolean(),
  MONTHLY_DASHBOARD: z.boolean(),
  RECEIPTS: z.boolean(),
  PRODUCT_LABELS: z.boolean(),
  SUPPLIERS_PURCHASES: z.boolean(),
  COSTS_MARGIN: z.boolean(),
  RETURNS: z.boolean(),
  LOTS: z.boolean(),
  PROMOTIONS: z.boolean(),
  NOTIFICATIONS: z.boolean(),
  SUPPLIER_ACCOUNTS: z.boolean(),
  CUSTOMERS: z.boolean(),
  CUSTOMER_CREDIT: z.boolean(),
  LOCATIONS_TRANSFERS: z.boolean(),
  DELIVERY_NOTES_SALES: z.boolean().default(false),
  DELIVERY_NOTES_PURCHASES: z.boolean().default(false),
  DELIVERY_NOTES_INTERNAL: z.boolean().default(false),
  PREPARED_ORDERS: z.boolean().default(false),
  BUSINESS_UNITS: z.boolean().default(false),
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const FeatureStatusSchema = z.object({
  revision: z.number().int().positive(),
  enabled: FeatureFlagsSchema,
  features: z.array(FeatureStateSchema),
});

export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const FeatureSelectionSchema = FeatureFlagsSchema.partial().extend({
  DELIVERY_NOTES_SALES: z.boolean().optional(),
  DELIVERY_NOTES_PURCHASES: z.boolean().optional(),
  DELIVERY_NOTES_INTERNAL: z.boolean().optional(),
  PREPARED_ORDERS: z.boolean().optional(),
  BUSINESS_UNITS: z.boolean().optional(),
});

export type FeatureSelection = z.infer<typeof FeatureSelectionSchema>;

export const FeatureChangeInputSchema = z.object({
  expectedRevision: z.number().int().min(0),
  enabled: FeatureSelectionSchema,
});

export type FeatureChangeInput = z.infer<typeof FeatureChangeInputSchema>;
