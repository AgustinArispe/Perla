import { z } from 'zod';
import { StockCountSchema, StockRecordSchema } from '../../../shared/stock';
const PendingSchema = z.union([
  z.strictObject({
    action: z.literal('record'),
    name: z.string().max(140),
    input: StockRecordSchema,
  }),
  z.strictObject({
    action: z.enum(['opening', 'count']),
    name: z.string().max(140),
    input: StockCountSchema,
  }),
]);
export type PendingStock = z.infer<typeof PendingSchema>;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export const PENDING_STOCK_KEY = 'bocha.stock.pending.v1';
export function loadPending(storage: StoragePort = localStorage): PendingStock | null {
  const value = storage.getItem(PENDING_STOCK_KEY);
  if (value === null) return null;
  try {
    return PendingSchema.parse(JSON.parse(value));
  } catch {
    throw new Error(
      'No se pudo leer el registro pendiente. Conservá los datos y contactá soporte antes de registrar otro movimiento.',
    );
  }
}
export function savePending(input: PendingStock, storage: StoragePort = localStorage): void {
  const parsed = PendingSchema.parse(input);
  const existing = loadPending(storage);
  const json = JSON.stringify(parsed);
  if (existing && JSON.stringify(existing) !== json)
    throw new Error(
      'Hay un registro pendiente de confirmar. Consultá su resultado desde Stock antes de modificarlo.',
    );
  storage.setItem(PENDING_STOCK_KEY, json);
  if (storage.getItem(PENDING_STOCK_KEY) !== json)
    throw new Error('No se pudo conservar el registro pendiente. No se enviaron cambios de stock.');
  windowEvent();
}
export function clearPending(key: string, storage: StoragePort = localStorage): void {
  if (loadPending(storage)?.input.operationKey === key) storage.removeItem(PENDING_STOCK_KEY);
  windowEvent();
}
function windowEvent() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('bocha-stock-pending'));
}
