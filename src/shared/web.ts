import { z } from 'zod';
import type { AuthStatus, User } from './auth';
import type { SaleDetail } from './sales';
export const SelectTerminalSchema = z.strictObject({ terminalId: z.uuid() });
export const WeightCalculatorSchema = z.strictObject({
  productId: z.uuid(),
  weight: z.string().min(1).max(32),
  unit: z.enum(['GRAM', 'KG']),
});
export const BackupIdSchema = z.strictObject({ id: z.uuid() });
export const RestoreBackupSchema = z.strictObject({
  previewToken: z.string().max(200),
  currentPassword: z.string().min(1).max(128),
});
export interface WebSession extends AuthStatus {
  terminalId: string | null;
  csrfToken: string | null;
}
export interface WebLogin {
  user: User;
  csrfToken: string;
}
export interface WebSaleDetail extends SaleDetail {
  terminalId: string | null;
  registerShiftId: string | null;
}
