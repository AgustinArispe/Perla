import type { StockState } from '../shared/stock';
import { MAX_QUANTITY } from './values';
import { DomainError } from '../shared/errors';

export function stockState(
  tracking: boolean,
  initialized: boolean,
  quantity: number,
  minimum: number,
): StockState {
  if (!tracking) return 'DISABLED';
  if (!initialized) return 'UNKNOWN';
  if (quantity < 0) return 'NEGATIVE';
  if (quantity === 0) return 'OUT';
  if (quantity <= minimum) return 'LOW';
  return 'OK';
}
export const stockLabels: Record<StockState, string> = {
  UNKNOWN: 'Sin conteo',
  OUT: 'Agotado',
  LOW: 'Bajo mínimo',
  NEGATIVE: 'Negativo',
  OK: 'Disponible',
  DISABLED: 'Sin control',
};
export function formatStock(base: number | null, unit: 'UNIT' | 'KG'): string {
  if (base === null) return '—';
  const abs = Math.abs(base);
  return unit === 'UNIT'
    ? `${base} u.`
    : `${base < 0 ? '-' : ''}${Math.floor(abs / 1000)},${String(abs % 1000).padStart(3, '0')} kg`;
}
export function nextBalance(current: number, delta: number, allowNegative: boolean): number {
  const next = current + delta;
  if (!Number.isSafeInteger(next) || Math.abs(next) > MAX_QUANTITY)
    throw new DomainError('VALIDATION', 'La existencia supera el máximo permitido.');
  if (next < 0 && !allowNegative)
    throw new DomainError(
      'INSUFFICIENT_STOCK',
      'Stock insuficiente. Revisá la cantidad o confirmá expresamente el saldo negativo con un motivo.',
    );
  return next;
}
