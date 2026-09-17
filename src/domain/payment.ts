import { PaymentSchema, type PaymentInput } from '../shared/sales';
import { DomainError } from '../shared/errors';
import { MAX_MONEY } from './values';
export function validatePayments(raw: PaymentInput[], totalCents: number) {
  if (
    !Number.isSafeInteger(totalCents) ||
    totalCents < 0 ||
    totalCents > MAX_MONEY ||
    raw.length > 20
  )
    throw new DomainError('VALIDATION', 'Importe de pago inválido.');
  const payments = raw.map((value) => {
    const payment = PaymentSchema.parse(value);
    if (payment.method !== 'CASH' && payment.tenderedCents !== undefined)
      throw new DomainError('VALIDATION', 'Sólo efectivo admite importe recibido y vuelto.');
    const received = payment.tenderedCents ?? payment.amountCents;
    if (received < payment.amountCents)
      throw new DomainError('VALIDATION', 'El efectivo recibido es insuficiente.');
    return {
      ...payment,
      changeCents: payment.method === 'CASH' ? received - payment.amountCents : 0,
    };
  });
  if (payments.reduce((s, p) => s + BigInt(p.amountCents), 0n) !== BigInt(totalCents))
    throw new DomainError('VALIDATION', 'Los pagos deben cubrir exactamente el total de la venta.');
  return payments;
}
