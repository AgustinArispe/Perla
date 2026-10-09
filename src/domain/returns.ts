export interface ProportionalIncrementInput {
  totalAmountCents: number;
  totalQuantityBase: number;
  previousQuantityBase: number;
  returnedQuantityBase: number;
}

function safeInteger(value: number, name: string, minimum: number) {
  if (!Number.isSafeInteger(value) || value < minimum)
    throw new RangeError(`${name} debe ser un entero seguro mayor o igual a ${minimum}.`);
}

/**
 * Allocates the amount from cumulative quantity. The final partial return receives
 * every remaining cent, so repeated returns always add back to the frozen line amount.
 */
export function proportionalIncrement(input: ProportionalIncrementInput): number {
  safeInteger(input.totalAmountCents, 'El importe', 0);
  safeInteger(input.totalQuantityBase, 'La cantidad original', 1);
  safeInteger(input.previousQuantityBase, 'La cantidad ya devuelta', 0);
  safeInteger(input.returnedQuantityBase, 'La cantidad a devolver', 1);
  const nextQuantity = input.previousQuantityBase + input.returnedQuantityBase;
  if (!Number.isSafeInteger(nextQuantity) || nextQuantity > input.totalQuantityBase)
    throw new RangeError('La devolución supera la cantidad original.');
  const total = BigInt(input.totalAmountCents);
  const quantity = BigInt(input.totalQuantityBase);
  const allocatedBefore = (total * BigInt(input.previousQuantityBase)) / quantity;
  const allocatedAfter = (total * BigInt(nextQuantity)) / quantity;
  const increment = allocatedAfter - allocatedBefore;
  const result = Number(increment);
  if (!Number.isSafeInteger(result)) throw new RangeError('El importe prorrateado es demasiado grande.');
  return result;
}
