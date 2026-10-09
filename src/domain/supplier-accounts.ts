export interface OpenSupplierPayable {
  purchaseId: string;
  balanceCents: number;
}

export interface SupplierPaymentAllocation {
  purchaseId: string;
  amountCents: number;
}

export function allocateSupplierPayment(
  amountCents: number,
  payables: readonly OpenSupplierPayable[],
): SupplierPaymentAllocation[] {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0)
    throw new Error('El pago debe ser mayor a cero.');
  const available = payables.reduce((total, payable) => {
    if (!Number.isSafeInteger(payable.balanceCents) || payable.balanceCents < 0)
      throw new Error('El saldo del proveedor no es válido.');
    return total + payable.balanceCents;
  }, 0);
  if (!Number.isSafeInteger(available) || amountCents > available)
    throw new Error('El pago supera el saldo pendiente.');
  let remaining = amountCents;
  const allocations: SupplierPaymentAllocation[] = [];
  for (const payable of payables) {
    if (!remaining) break;
    const applied = Math.min(remaining, payable.balanceCents);
    if (applied > 0) allocations.push({ purchaseId: payable.purchaseId, amountCents: applied });
    remaining -= applied;
  }
  return allocations;
}

