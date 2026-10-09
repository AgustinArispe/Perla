import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CustomerForm } from '../customers/CustomerPage';
import { EntityPicker } from '../../components/EntityPicker';
import type { PaymentInput } from '../../../shared/sales';
import type { Role } from '../../../shared/auth';
import { validatePayments } from '../../../domain/payment';
import { formatMoney, moneyInput, parseArs } from '../../../domain/values';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { api, errorMessage, unwrap } from '../../api';
import type { Customer } from '../../../shared/customers';
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
  initialCustomer = null,
  onCustomerChange,
  customersEnabled = false,
  customerCreditEnabled = false,
}: {
  totalCents: number;
  paymentMethods: PaymentInput['method'][];
  role: Role;
  busy: boolean;
  backendError: string;
  onClose: () => void;
  initialCustomer?: Customer | null;
  onCustomerChange?: (customer: Customer | null) => void;
  customersEnabled?: boolean;
  customerCreditEnabled?: boolean;
  onConfirm: (
    payments: PaymentInput[],
    override?: { reason: string },
    customer?: { customerId: string; onAccountCents: number },
  ) => Promise<void>;
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
    [reason, setReason] = useState(''),
    [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer),
    [onAccount, setOnAccount] = useState(false);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(Boolean(initialCustomer));
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const client = useQueryClient();
  const customerId = selectedCustomer?.id ?? '';
  function payments(): PaymentInput[] {
    if (onAccount) return [];
    return rows.map((row) => ({
      method: row.method,
      amountCents: parseArs(row.amount),
      ...(row.method === 'CASH'
        ? {
            tenderedCents: row.received.trim() ? parseArs(row.received) : parseArs(row.amount),
          }
        : {}),
    }));
  }
  let applied = 0,
    change = 0,
    cashShortfall = 0;
  try {
    for (const p of payments()) {
      applied += p.amountCents;
      if (p.method === 'CASH') {
        const tendered = p.tenderedCents ?? p.amountCents;
        change += Math.max(0, tendered - p.amountCents);
        cashShortfall += Math.max(0, p.amountCents - tendered);
      }
    }
  } catch {
    /* Form validation reports malformed amounts on confirmation. */
  }
  function update(id: string, patch: Partial<(typeof rows)[number]>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }
  function removePayment(id: string) {
    setRows((current) => {
      const remaining = current.filter((row) => row.id !== id);
      if (remaining.length !== 1) return remaining;
      const only = remaining[0]!;
      return [
        {
          ...only,
          amount: moneyInput(totalCents),
          received: only.method === 'CASH' ? moneyInput(totalCents) : only.received,
        },
      ];
    });
  }
  function splitPayment() {
    try {
      let sourceIndex = -1;
      for (let index = rows.length - 1; index >= 0; index--) {
        if (parseArs(rows[index]!.amount) >= 2) {
          sourceIndex = index;
          break;
        }
      }
      if (sourceIndex < 0) throw new Error('Revisá los importes antes de dividir el pago.');
      const source = rows[sourceIndex]!;
      const sourceCents = parseArs(source.amount);
      const newCents = Math.floor(sourceCents / 2);
      const remainderCents = sourceCents - newCents;
      const nextMethod =
        paymentMethods.find((method) => !rows.some((row) => row.method === method)) ??
        source.method;
      const next = rows.map((row, index) =>
        index === sourceIndex
          ? {
              ...row,
              amount: moneyInput(remainderCents),
              received: row.method === 'CASH' ? moneyInput(remainderCents) : row.received,
            }
          : row,
      );
      next.push({
        id: crypto.randomUUID(),
        method: nextMethod,
        amount: moneyInput(newCents),
        received: nextMethod === 'CASH' ? moneyInput(newCents) : '',
      });
      setError('');
      setRows(next);
    } catch {
      setError('Revisá los importes antes de dividir el pago.');
    }
  }
  async function confirm() {
    if (busy) return;
    try {
      const parsed = payments();
      if (parsed.some((payment) => !paymentMethods.includes(payment.method)))
        throw new Error('Elegí un medio de pago habilitado.');
      validatePayments(parsed, onAccount ? 0 : totalCents);
      if (
        onAccount &&
        (!selectedCustomer ||
          !selectedCustomer.creditEnabled ||
          selectedCustomer.availableCents < totalCents)
      )
        throw new Error('Elegí un cliente con límite disponible.');
      if (negative && reason.trim().length < 3)
        throw new Error('Ingresá un motivo para autorizar stock negativo.');
      setError('');
      await onConfirm(
        parsed,
        negative ? { reason: reason.trim() } : undefined,
        customerId ? { customerId, onAccountCents: onAccount ? totalCents : 0 } : undefined,
      );
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <>
      <Dialog
        title="Cobrar venta"
        busy={busy}
        onClose={onClose}
        className="payment-dialog"
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
          {customersEnabled && (
            <section className="payment-customer">
              {customerSearchOpen && (
                <button
                  type="button"
                  className="button secondary payment-new-customer"
                  disabled={busy}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setCreateCustomerOpen(true)}
                >
                  <Icon name="plus" size={18} /> Nuevo cliente
                </button>
              )}
              {!customerSearchOpen && !selectedCustomer ? (
                <button
                  type="button"
                  className="button quiet"
                  disabled={busy}
                  onClick={() => setCustomerSearchOpen(true)}
                >
                  <Icon name="users" size={18} /> Agregar cliente
                </button>
              ) : (
                <EntityPicker
                  label="Cliente"
                  queryKey="customers"
                  value={selectedCustomer}
                  disabled={busy}
                  onChange={(item) => {
                    setSelectedCustomer(item);
                    onCustomerChange?.(item);
                    setOnAccount(false);
                    if (!item) setCustomerSearchOpen(false);
                  }}
                  load={async (query) =>
                    unwrap(
                      await api().customers.search({
                        query,
                        activeOnly: true,
                        limit: 30,
                      }),
                    ).items
                  }
                  detail={(item) =>
                    item.creditEnabled
                      ? `Disponible ${formatMoney(item.availableCents)}`
                      : (item.phone ?? 'Sin cuenta corriente')
                  }
                />
              )}
              {customerCreditEnabled && selectedCustomer?.creditEnabled && (
                <button
                  disabled={busy || selectedCustomer.availableCents < totalCents}
                  type="button"
                  className={`payment-account-toggle${onAccount ? ' selected' : ''}`}
                  onClick={() => setOnAccount((value) => !value)}
                >
                  <span>
                    <strong>Dejar a cuenta</strong>
                    <small>
                      {selectedCustomer.availableCents < totalCents
                        ? 'Límite insuficiente'
                        : `Disponible ${formatMoney(selectedCustomer.availableCents)}`}
                    </small>
                  </span>
                  <Icon name={onAccount ? 'check' : 'clock'} size={18} />
                </button>
              )}
            </section>
          )}

          <fieldset disabled={busy}>
            {!onAccount && (
              <>
                {rows.length > 0 && (
                  <div
                    className="payment-method-options"
                    style={{
                      gridTemplateColumns: `repeat(${paymentMethods.length}, minmax(0, 1fr))`,
                    }}
                    role="group"
                    aria-label="Medio de pago principal"
                  >
                    {paymentMethods.map((method) => {
                      return (
                        <button
                          key={method}
                          type="button"
                          className={`payment-method-option${rows[0]?.method === method ? ' selected' : ''}`}
                          aria-pressed={rows[0]?.method === method}
                          onClick={() => update(rows[0]!.id, { method })}
                        >
                          {paymentLabels[method]}
                          {rows[0]?.method === method && <Icon name="check" size={16} />}
                        </button>
                      );
                    })}
                  </div>
                )}
                {rows.map((row, index) => (
                  <div
                    className={`payment-row${index === 0 ? ' payment-row-main' : ''}${row.method === 'CASH' ? ' payment-row-cash' : ''}`}
                    key={row.id}
                  >
                    {index > 0 && (
                      <label className="field">
                        Medio de pago {index + 1}
                        <select
                          aria-label={`Medio de pago ${index + 1}`}
                          value={row.method}
                          onChange={(event) =>
                            update(row.id, {
                              method: event.target.value as PaymentInput['method'],
                            })
                          }
                        >
                          {paymentMethods.map((value) => (
                            <option key={value} value={value}>
                              {paymentLabels[value]}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {rows.length > 1 && (
                      <label className="field">
                        Importe {index + 1}
                        <input
                          aria-label={`Importe aplicado ${index + 1}`}
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(event) => update(row.id, { amount: event.target.value })}
                          data-dialog-focus={
                            index === 0 && row.method !== 'CASH' ? true : undefined
                          }
                        />
                      </label>
                    )}
                    {row.method === 'CASH' && (
                      <label className="field">
                        <span className="payment-field-label">
                          Efectivo recibido
                          {change > 0 && index === 0 && (
                            <span className="payment-change-inline">
                              Vuelto {formatMoney(change)}
                            </span>
                          )}
                        </span>
                        <input
                          aria-label={`Efectivo recibido ${index + 1}`}
                          inputMode="decimal"
                          value={row.received}
                          onChange={(event) => update(row.id, { received: event.target.value })}
                          data-dialog-focus={index === 0 ? true : undefined}
                        />
                      </label>
                    )}
                    {rows.length > 1 && (
                      <button
                        className="button quiet payment-remove"
                        type="button"
                        aria-label={`Quitar pago ${index + 1}`}
                        onClick={() => removePayment(row.id)}
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                ))}
                {(rows.length > 1 ||
                  applied !== totalCents ||
                  cashShortfall > 0 ||
                  (change > 0 && rows.length > 1)) && (
                  <div className="payment-balance">
                    {rows.length > 1 && (
                      <span>
                        Aplicado <strong>{formatMoney(applied)}</strong>
                      </span>
                    )}
                    {applied === totalCents && cashShortfall === 0 && rows.length > 1 ? (
                      <span className="payment-balance-complete">
                        <Icon name="check" size={17} /> Pago completo
                      </span>
                    ) : applied < totalCents ? (
                      <span className="payment-balance-pending">
                        Pendiente <strong>{formatMoney(totalCents - applied)}</strong>
                      </span>
                    ) : applied > totalCents ? (
                      <span className="payment-balance-pending">
                        Excede <strong>{formatMoney(applied - totalCents)}</strong>
                      </span>
                    ) : null}
                    {cashShortfall > 0 && (
                      <span className="payment-balance-pending">
                        Falta efectivo <strong>{formatMoney(cashShortfall)}</strong>
                      </span>
                    )}
                    {change > 0 && rows.length > 1 && (
                      <span className="payment-balance-change">
                        Vuelto <strong>{formatMoney(change)}</strong>
                      </span>
                    )}
                  </div>
                )}
                {totalCents > 0 && (
                  <button
                    className="button secondary small"
                    type="button"
                    disabled={rows.length >= 20 || totalCents < 2}
                    onClick={splitPayment}
                  >
                    Dividir pago
                  </button>
                )}
              </>
            )}
            {onAccount && (
              <div className="notice">
                <Icon name="check" size={18} /> La venta quedará pendiente en la cuenta del cliente.
              </div>
            )}
            {role !== 'SELLER' && (negative || /stock|existenc|disponib/i.test(backendError)) && (
              <div className="payment-override">
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
              </div>
            )}
          </fieldset>
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
      {createCustomerOpen && (
        <CustomerForm
          customer={null}
          canManageCredit={customerCreditEnabled && (role === 'OWNER' || role === 'ADMIN')}
          onClose={() => setCreateCustomerOpen(false)}
          onSaved={async (item) => {
            setSelectedCustomer(item);
            onCustomerChange?.(item);
            setOnAccount(false);
            setCreateCustomerOpen(false);
            await client.invalidateQueries({ queryKey: ['customers'] });
          }}
        />
      )}
    </>
  );
}
