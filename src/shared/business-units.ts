import { z } from 'zod';
export const PRIMARY_UNIT_ID = '00000000-0000-4000-8000-000000000001';
export const SECONDARY_UNIT_ID = '00000000-0000-4000-8000-000000000002';
export interface BusinessUnit {
  id: string;
  name: string;
  secondary: boolean;
  revision: number;
}
export interface BusinessUnitStatus {
  enabled: boolean;
  current: BusinessUnit;
  units: BusinessUnit[];
  hasSecondaryHistory: boolean;
}
export const BusinessUnitRenameSchema = z.strictObject({
  id: z.uuid(),
  expectedRevision: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
});
export type BusinessUnitRename = z.infer<typeof BusinessUnitRenameSchema>;
