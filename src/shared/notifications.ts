import { z } from 'zod';

export const NotificationDestinationSchema = z.enum(['STOCK', 'LOTS', 'SHIFTS', 'DASHBOARD']);
export const NotificationMarkReadSchema = z.strictObject({
  key: z.string().min(1).max(180),
  signature: z.string().min(1).max(180),
});
export type NotificationMarkRead = z.infer<typeof NotificationMarkReadSchema>;
export interface BusinessNotification {
  key: string;
  signature: string;
  kind: 'LOW_STOCK' | 'EXPIRING_LOTS' | 'CASH_DIFFERENCE' | 'SALES_DROP';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  detail: string;
  occurredAt: string;
  destination: z.infer<typeof NotificationDestinationSchema>;
  read: boolean;
}
export interface NotificationInbox {
  unreadCount: number;
  items: BusinessNotification[];
  generatedAt: string;
}

