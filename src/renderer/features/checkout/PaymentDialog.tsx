import { useState } from 'react';
import type { PaymentInput } from '../../../shared/sales';
import type { Role } from '../../../shared/auth';
import { validatePayments } from '../../../domain/payment';
import { formatMoney, moneyInput, parseArs } from '../../../domain/values';
import { Dialog } from '../../components/Dialog';
import { errorMessage } from '../../api';
export const paymentLabels: Record<PaymentInput['method'], string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};
export function PaymentDialog({
  totalCents,
  paymentMethods,
  role,
  busy,
  backendError,
  onClose,
  onConfirm,
}: {
  totalCents: number;
  paymentMethods: PaymentInput['method'][];
  role: Role;
  busy: boolean;
  backendError: string;
  onClose: () => void;
  onConfirm: (payments: PaymentInput[], override?: { reason: string }) => Promise<void>;
}) {
  const [rows, setRows] = useState(() =>
      totalCents
        ? [
            {
              id: crypto.randomUUID(),
              method: paymentMethods[0]!,
              amount: moneyInput(totalCents),
              received: moneyInput(totalCents),
            },
          ]
        : [],
    ),
    [error, setError] = useState(''),
    [negative, setNegative] = useState(false),
    [reason, setReason] = useState('');
  function payments(): PaymentInput[] {
    return rows.map((row) => ({
      method: row.method,
      amountCents: parseArs(row.amount),
      ...(row.method === 'CASH'
        ? { tenderedCents: row.received.trim() ? parseArs(row.received) : parseArs(row.amount) }
        : {}),
    }));
  }
  let applied = 0,
    change = 0;
  try {
    for (const p of payments()) {
      applied += p.amountCents;
      change +=
        p.method === 'CASH' ? Math.max(0, (p.tenderedCents ?? p.amountCents) - p.amountCents) : 0;
    }
  } catch {
    /* Form validation reports malformed amounts on confirmation. */
  }
  function update(id: string, patch: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  async function confirm() {
    if (busy) return;
    try {
      const parsed = payments();
      if (parsed.some((payment) => !paymentMethods.includes(payment.method)))
        throw new Error('Elegí un medio de pago habilitado.');
      validatePayments(parsed, totalCents);
      if (negative && reason.trim().length < 3)
        throw new Error('Ingresá un motivo para autorizar stock negativo.');
      setError('');
      await onConfirm(parsed, negative ? { reason: reason.trim() } : undefined);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <Dialog
      title="Cobrar venta"
      busy={busy}
      onClose={onClose}
      wide
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
        }
        if (event.key === 'F8') {
          event.preventDefault();
          event.stopPropagation();
          void confirm();
        }
      }}
    >
      <form
        className="checkout-modal"
        onSubmit={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            event.stopPropagation();
          }
          if (event.key === 'F8') {
            event.preventDefault();
            event.stopPropagation();
            void confirm();
          }
        }}
      >
        <div className="payment-total">
          <span>Total a cobrar</span>
          <strong>{formatMoney(totalCents)}</strong>
        </div>
        <fieldset disabled={busy}>
          {rows.map((row, index) => (
            <div className="payment-row" key={row.id}>
              <label className="field">
                Medio de pago {index + 1}
                <select
                  aria-label={`Medio de pago ${index + 1}`}
                  value={row.method}
                  onChange={(event) =>
                    update(row.id, { method: event.target.value as PaymentInput['method'] })
                  }
                >
                  {paymentMethods.map((value) => (
                    <option key={value} value={value}>
                      {paymentLabels[value]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Importe aplicado {index + 1}
                <input
                  aria-label={`Importe aplicado ${index + 1}`}
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(event) => update(row.id, { amount: event.target.value })}
                  autoFocus={index === 0}
                />
              </label>
              {row.method === 'CASH' && (
                <label className="field">
                  Efectivo recibido {index + 1}
                  <input
                    aria-label={`Efectivo recibido ${index + 1}`}
                    inputMode="decimal"
                    value={row.received}
                    onChange={(event) => update(row.id, { received: event.target.value })}
                  />
                </label>
              )}
              {rows.length > 1 && (
                <button
                  className="button secondary small"
                  type="button"
                  aria-label={`Quitar pago ${index + 1}`}
                  onClick={() => setRows((current) => current.filter((p) => p.id !== row.id))}
                >
                  Quitar
                </button>
              )}
            </div>
          ))}
          {totalCents > 0 && (
            <button
              className="button secondary small"
              type="button"
              disabled={rows.length >= 20}
              onClick={() =>
                setRows((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    method: paymentMethods[0]!,
                    amount: '0',
                    received: '',
                  },
                ])
              }
            >
              Agregar medio de pago
            </button>
          )}
          {role !== 'SELLER' && (
            <>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={negative}
                  onChange={(event) => setNegative(event.target.checked)}
                />
                Autorizar stock negativo
              </label>
              {negative && (
                <label className="field">
                  Motivo de autorización
                  <input
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={240}
                  />
                </label>
              )}
            </>
          )}
        </fieldset>
        <div className="payment-summary">
          <span>
            Aplicado <strong>{formatMoney(applied)}</strong>
          </span>
          <span>
            Pendiente <strong>{formatMoney(totalCents - applied)}</strong>
          </span>
          <span>
            Vuelto <strong>{formatMoney(change)}</strong>
          </span>
        </div>
        {!totalCents && <p>Venta bonificada: no se registra un pago.</p>}
        <p className="capture-paused">Escaneo suspendido. Confirmá con F8 o el botón.</p>
        {(error || backendError) && (
          <div className="alert error" role="alert">
            {error || backendError}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Volver · Esc
          </button>
          <button
            className="button primary"
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? 'Guardando venta…' : 'Confirmar venta · F8'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
