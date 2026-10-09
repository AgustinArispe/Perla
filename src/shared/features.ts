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
});

export type FeatureFlags = z.infer<typeof FeatureFlagsSchema>;

export const FeatureStatusSchema = z.object({
  revision: z.number().int().positive(),
  enabled: FeatureFlagsSchema,
  features: z.array(FeatureStateSchema),
});

export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const FeatureSelectionSchema = FeatureFlagsSchema.partial();

export type FeatureSelection = z.infer<typeof FeatureSelectionSchema>;

export const FeatureChangeInputSchema = z.object({
  expectedRevision: z.number().int().min(0),
  enabled: FeatureSelectionSchema,
});

export type FeatureChangeInput = z.infer<typeof FeatureChangeInputSchema>;
