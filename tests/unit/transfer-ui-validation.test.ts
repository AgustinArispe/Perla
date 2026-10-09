import { describe, expect, it } from 'vitest';
import { canTransferQuantity } from '../../src/renderer/features/locations/transfer-validation';
describe('availability before dispatching a transfer', () => {
  it('blocks a cached balance while changing or rechecking origin', () => {
    expect(canTransferQuantity(5, { data: 10, isFetching: true })).toBe(false);
    expect(canTransferQuantity(5, undefined)).toBe(false);
    expect(canTransferQuantity(5, { data: 10, isError: true })).toBe(false);
    expect(canTransferQuantity(5, { data: 2 })).toBe(false);
    expect(canTransferQuantity(5, { data: 10 })).toBe(true);
  });
  it('preserves kg base quantities and rejects invalid, missing and negative stock', () => {
    expect(canTransferQuantity(1250, { data: 1500 })).toBe(true);
    for (const quantity of [null, 0, -1, NaN, Infinity, 1.5]) expect(canTransferQuantity(quantity, { data: 10 })).toBe(false);
    expect(canTransferQuantity(1, { data: -3 })).toBe(false);
    expect(canTransferQuantity(1, {})).toBe(false);
  });
});
