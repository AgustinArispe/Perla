import { ExportButton } from '../../components/ExportButton';
import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { allocateSupplierPayment } from '../../../domain/supplier-accounts';
import { formatMoney, moneyInput, parseArs } from '../../../domain/values';
import type { RegisterShift } from '../../../shared/frontend-operations';
import type { SupplierAccount, SupplierPaymentMethod } from '../../../shared/supplier-accounts';
import type { WebSession } from '../../../shared/web';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { webValue } from '../../web-client';

const methodLabel: Record<SupplierPaymentMethod, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};

function today() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(),
  );
}

export function SupplierAccountDialog({
  supplierId,
  onClose,
  initialObligationId,
  initialAmountCents,
}: {
  supplierId: string;
  onClose: () => void;
  initialObligationId?: string;
  initialAmountCents?: number;
}) {
  const client = useQueryClient();
  const paymentKey = useRef(crypto.randomUUID());
  const [paying, setPaying] = useState(Boolean(initialObligationId));
  const [amount, setAmount] = useState(
    initialAmountCents === undefined ? '' : moneyInput(initialAmountCents),
  );
  const [businessDate, setBusinessDate] = useState(today);
  const [method, setMethod] = useState<SupplierPaymentMethod>('TRANSFER');
  const [note, setNote] = useState('');
  const [manual, setManual] = useState(false);
  const [allocationInputs, setAllocationInputs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const account = useQuery({
    queryKey: ['supplier-account', supplierId],
    queryFn: async () => unwrap(await api().supplierAccounts.detail(supplierId)),
    retry: false,
  });
  const session = useQuery({
    queryKey: ['web-session'],
    queryFn: () => webValue<WebSession>('/auth/session'),
    retry: false,
  });
  const terminalId = session.data?.terminalId;
  const shift = useQuery({
    queryKey: ['cash', 'current', terminalId],
    queryFn: () => webValue<RegisterShift | null>(`/cash/current?terminalId=${terminalId}`),
    enabled: method === 'CASH' && !!terminalId,
    retry: false,
  });
  const openPayables = useMemo(
    () => account.data?.payables.filter((payable) => payable.balanceCents > 0) ?? [],
    [account.data?.payables],
  );
  const amountCents = useMemo(() => {
    try {
      return parseArs(amount);
    } catch {
      return 0;
    }
  }, [amount]);
  const suggested = useMemo(() => {
    try {
      return allocateSupplierPayment(
        amountCents,
        openPayables.map((payable) => ({
          purchaseId: payable.purchaseId,
          balanceCents: payable.balanceCents,
        })),
      );
    } catch {
      return [];
    }
  }, [amountCents, openPayables]);
  const manualAllocations = openPayables
    .map((payable) => {
      try {
        return {
          purchaseId: payable.purchaseId,
          amountCents: parseArs(allocationInputs[payable.purchaseId] ?? '0'),
        };
      } catch {
        return { purchaseId: payable.purchaseId, amountCents: 0 };
      }
    })
    .filter((allocation) => allocation.amountCents > 0);
  const allocationTotal = manualAllocations.reduce(
    (sum, allocation) => sum + allocation.amountCents,
    0,
  );
  function openPayment() {
    const value = initialObligationId
      ? (account.data?.payables.find((p) => p.purchaseId === initialObligationId)?.balanceCents ??
        0)
      : (account.data?.balanceCents ?? 0);
    setAmount(moneyInput(value));
    setPaying(true);
    setManual(false);
    setAllocationInputs({});
    setError('');
  }
  function enableManual() {
    setAllocationInputs(
      Object.fromEntries(suggested.map((item) => [item.purchaseId, moneyInput(item.amountCents)])),
    );
    setManual(true);
  }
  async function submit() {
    if (!account.data || busy) return;
    if (method === 'CASH' && !shift.data) {
      setError('Abrí una caja antes de registrar un pago en efectivo.');
      return;
    }
    if (manual && allocationTotal !== amountCents) {
      setError('La distribución debe coincidir con el importe del pago.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const saved = unwrap(
        await api().supplierAccounts.pay({
          operationKey: paymentKey.current,
          supplierId,
          amountCents,
          businessDate,
          method,
          ...(method === 'CASH' ? { shiftId: shift.data!.id } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          ...(initialObligationId
            ? {
                allocations: [
                  {
                    purchaseId: initialObligationId,
                    amountCents,
                    expectedBalanceCents: account.data.payables.find(
                      (p) => p.purchaseId === initialObligationId,
                    )?.balanceCents,
                  },
                ],
              }
            : manual
              ? { allocations: manualAllocations }
              : {}),
        }),
      );
      setNotice(`Pago registrado por ${formatMoney(saved.amountCents)}.`);
      paymentKey.current = crypto.randomUUID();
      setPaying(false);
      setNote('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['supplier-account', supplierId] }),
        client.invalidateQueries({ queryKey: ['suppliers'] }),
        client.invalidateQueries({ queryKey: ['cash'] }),
        client.invalidateQueries({ queryKey: ['control'] }),
      ]);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  const data = account.data as SupplierAccount | undefined;
  return (
    <Dialog title={data?.supplierName ?? 'Cuenta del proveedor'} onClose={onClose} wide busy={busy}>
      <div className="dialog-body supplier-account-dialog">
        <ExportButton dataset="supplierAccount" filters={{ supplierId }} />
        {account.isPending && <p>Cargando cuenta…</p>}
        {account.isError && (
          <div className="alert error">
            {errorMessage(account.error)}{' '}
            <button className="button secondary" onClick={() => void account.refetch()}>
              Reintentar
            </button>
          </div>
        )}
        {notice && (
          <div className="notice">
            <Icon name="check" size={18} /> {notice}
          </div>
        )}
        {data && (
          <>
            <div className="supplier-account-hero">
              <div>
                <small>Saldo pendiente</small>
                <strong>{formatMoney(data.balanceCents)}</strong>
              </div>
              <div className={data.creditCents ? 'has-credit' : ''}>
                <small>Crédito a favor</small>
                <strong>{formatMoney(data.creditCents)}</strong>
              </div>
              {!paying && (
                <button
                  className="button primary"
                  disabled={!data.balanceCents}
                  onClick={openPayment}
                >
                  Registrar pago
                </button>
              )}
            </div>
            {paying && (
              <section className="supplier-payment-form">
                {initialObligationId && (
                  <p>
                    Compra N.º{' '}
                    {
                      data.payables.find((p) => p.purchaseId === initialObligationId)
                        ?.purchaseNumber
                    }{' '}
                    · Pendiente{' '}
                    {formatMoney(
                      data.payables.find((p) => p.purchaseId === initialObligationId)
                        ?.balanceCents ?? 0,
                    )}
                  </p>
                )}
                <div className="panel-heading">
                  <h3>Nuevo pago</h3>
                </div>
                <div className="supplier-payment-fields">
                  <label className="field">
                    <span>Importe</span>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setManual(false);
                      }}
                    />
                  </label>
                  <label className="field">
                    <span>Fecha</span>
                    <input
                      type="date"
                      value={businessDate}
                      onChange={(event) => setBusinessDate(event.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Medio</span>
                    <select
                      value={method}
                      onChange={(event) => setMethod(event.target.value as SupplierPaymentMethod)}
                    >
                      {Object.entries(methodLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Nota · opcional</span>
                    <input value={note} onChange={(event) => setNote(event.target.value)} />
                  </label>
                </div>
                {method === 'CASH' && !shift.isPending && !shift.data && (
                  <div className="alert info">Abrí una caja para pagar en efectivo.</div>
                )}
                {!initialObligationId && !manual && (
                  <p className="commerce-allocation-summary">
                    Distribución automática: {suggested.length}{' '}
                    {suggested.length === 1 ? 'compra' : 'compras'} ·{' '}
                    {formatMoney(suggested.reduce((sum, item) => sum + item.amountCents, 0))}. Podés
                    revisar los importes antes de confirmar.
                  </p>
                )}
                {!initialObligationId && (
                  <button
                    className="button quiet small"
                    type="button"
                    onClick={manual ? () => setManual(false) : enableManual}
                  >
                    {manual ? 'Usar distribución automática' : 'Editar distribución'}
                  </button>
                )}
                {manual && (
                  <div className="supplier-allocation-list">
                    {openPayables.map((payable) => (
                      <label key={payable.purchaseId}>
                        <span>
                          <strong>Compra N.º {payable.purchaseNumber}</strong>
                          <small>Pendiente {formatMoney(payable.balanceCents)}</small>
                        </span>
                        <input
                          inputMode="decimal"
                          value={allocationInputs[payable.purchaseId] ?? '0'}
                          onChange={(event) =>
                            setAllocationInputs((current) => ({
                              ...current,
                              [payable.purchaseId]: event.target.value,
                            }))
                          }
                        />
                      </label>
                    ))}
                    <div className="supplier-allocation-total">
                      <span>Distribuido</span>
                      <strong>{formatMoney(allocationTotal)}</strong>
                    </div>
                  </div>
                )}
                {error && <div className="alert error">{error}</div>}
                <div className="dialog-actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => setPaying(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || amountCents <= 0 || amountCents > data.balanceCents}
                    onClick={() => void submit()}
                  >
                    {busy ? 'Registrando…' : 'Confirmar pago'}
                  </button>
                </div>
              </section>
            )}
            <section className="supplier-account-section">
              <h3>Compras</h3>
              <div className="supplier-account-list">
                {data.payables.map((payable) => (
                  <article key={payable.purchaseId}>
                    <span>
                      <strong>Compra N.º {payable.purchaseNumber}</strong>
                      <small>
                        {new Date(`${payable.businessDate}T12:00:00`).toLocaleDateString('es-AR')}
                      </small>
                    </span>
                    <span className={`status-pill ${payable.status === 'PAID' ? 'success' : ''}`}>
                      {payable.status === 'OPEN'
                        ? 'Pendiente'
                        : payable.status === 'PAID'
                          ? 'Pagada'
                          : 'Anulada'}
                    </span>
                    <strong>{formatMoney(payable.balanceCents)}</strong>
                  </article>
                ))}
                {!data.payables.length && (
                  <div className="empty-state">Todavía no hay compras con cuenta.</div>
                )}
              </div>
            </section>
            <section className="supplier-account-section">
              <h3>Movimientos</h3>
              <div className="supplier-account-list movements">
                {data.payments.map((payment) => (
                  <article key={payment.id}>
                    <span>
                      <strong>Pago · {methodLabel[payment.method]}</strong>
                      <small>
                        {new Date(`${payment.businessDate}T12:00:00`).toLocaleDateString('es-AR')} ·{' '}
                        {payment.actorName}
                      </small>
                    </span>
                    <strong>{formatMoney(payment.amountCents)}</strong>
                  </article>
                ))}
                {data.credits.map((credit) => (
                  <article key={credit.id} className="credit">
                    <span>
                      <strong>Crédito · Compra N.º {credit.purchaseNumber}</strong>
                      <small>{credit.reason}</small>
                    </span>
                    <strong>{formatMoney(credit.amountCents)}</strong>
                  </article>
                ))}
                {!data.payments.length && !data.credits.length && (
                  <div className="empty-state">Todavía no hay movimientos.</div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </Dialog>
  );
}
