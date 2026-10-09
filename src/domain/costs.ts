import { DomainError } from '../shared/errors';

export const COST_SCALE = 1_000_000;

function safe(value: bigint, label: string): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0)
    throw new DomainError('VALIDATION', `${label} supera el rango permitido.`);
  return result;
}

function divideRounded(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new DomainError('VALIDATION', 'La cantidad debe ser positiva.');
  return (numerator + denominator / 2n) / denominator;
}

export function costRateFromUnitCost(unit: 'UNIT' | 'KG', unitCostCents: number): number {
  if (!Number.isSafeInteger(unitCostCents) || unitCostCents <= 0)
    throw new DomainError('VALIDATION', 'El costo debe ser mayor a cero.');
  return safe(
    BigInt(unitCostCents) * BigInt(unit === 'UNIT' ? COST_SCALE : COST_SCALE / 1000),
    'El costo',
  );
}

export function unitCostFromRate(unit: 'UNIT' | 'KG', rateMicrosPerBase: number): number {
  const multiplier = unit === 'UNIT' ? 1n : 1000n;
  return safe(
    divideRounded(BigInt(rateMicrosPerBase) * multiplier, BigInt(COST_SCALE)),
    'El costo unitario',
  );
}

export function costForQuantity(quantityBase: number, rateMicrosPerBase: number): number {
  if (!Number.isSafeInteger(quantityBase) || quantityBase <= 0)
    throw new DomainError('VALIDATION', 'La cantidad debe ser positiva.');
  if (!Number.isSafeInteger(rateMicrosPerBase) || rateMicrosPerBase <= 0)
    throw new DomainError('VALIDATION', 'El costo no es válido.');
  return safe(
    divideRounded(BigInt(quantityBase) * BigInt(rateMicrosPerBase), BigInt(COST_SCALE)),
    'El costo total',
  );
}

export function weightedAverageCost(input: {
  oldQuantityBase: number;
  oldRateMicros: number;
  receivedQuantityBase: number;
  receivedRateMicros: number;
}): number {
  if (!Number.isSafeInteger(input.receivedQuantityBase) || input.receivedQuantityBase <= 0)
    throw new DomainError('VALIDATION', 'La cantidad recibida debe ser positiva.');
  if (!Number.isSafeInteger(input.receivedRateMicros) || input.receivedRateMicros <= 0)
    throw new DomainError('VALIDATION', 'El costo recibido no es válido.');
  const oldQuantity = Math.max(0, input.oldQuantityBase);
  if (!oldQuantity || !input.oldRateMicros) return input.receivedRateMicros;
  return safe(
    divideRounded(
      BigInt(oldQuantity) * BigInt(input.oldRateMicros) +
        BigInt(input.receivedQuantityBase) * BigInt(input.receivedRateMicros),
      BigInt(oldQuantity + input.receivedQuantityBase),
    ),
    'El costo promedio',
  );
}

export function coverageBasisPoints(coveredNetCents: number, netCents: number): number {
  if (!netCents) return 0;
  return Math.min(
    10_000,
    safe((BigInt(coveredNetCents) * 10_000n) / BigInt(netCents), 'La cobertura'),
  );
}
