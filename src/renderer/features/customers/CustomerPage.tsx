import { ExportButton } from '../../components/ExportButton';
import { useRememberedState } from '../../components/useRememberedState';
import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, unwrap } from '../../api';
import type { Customer, CustomerAccount } from '../../../shared/customers';
import { formatMoney, moneyInput, parseArs } from '../../../domain/values';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import type { WebSession } from '../../../shared/web';
import type { RegisterShift } from '../../../shared/frontend-operations';
import { webValue } from '../../web-client';
import { SavedViews } from '../../components/SavedViews';

export function CustomerPage({ canManageCredit }: { canManageCredit: boolean }) {
  const client = useQueryClient(),
    [query, setQuery] = useRememberedState('customers', 'query', ''),
    [editing, setEditing] = useState<Customer | null | undefined>(undefined),
    [accountId, setAccountId] = useState<string | null>(null);
  const customers = useQuery({
    queryKey: ['customers', query],
    queryFn: async () =>
      unwrap(await api().customers.search({ query, activeOnly: false, limit: 100 })),
    retry: false,
  });
  return (
    <div className="customer-page">
      <div className="page-heading">
        <div>
          <h1>Clientes</h1>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          <Icon name="plus" size={18} />
          Nuevo cliente
        </button>
      </div>
      <section className="surface customer-surface">
        <div className="customer-toolbar">
          <label className="search-field">
            <Icon name="search" size={18} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar clientes"
              placeholder="Buscar por nombre, teléfono o email"
            />
          </label>
          <span className="result-count">
            {customers.isPending
              ? 'Consultando…'
              : customers.isError
                ? 'No disponible'
                : `${customers.data?.total ?? 0} clientes`}
          </span>
          <ExportButton dataset="customers" filters={{ query, activeOnly: false }} />
          <SavedViews
            module="customers"
            filters={{ query, activeOnly: false }}
            onApply={(filters) => {
              setQuery(filters.query ?? '');
              setAccountId(null);
              setEditing(undefined);
            }}
          />
        </div>
        {customers.isError && (
          <div className="alert error" role="alert">
            {errorMessage(customers.error)}{' '}
            <button
              className="button secondary small"
              disabled={customers.isFetching}
              onClick={() => void customers.refetch()}
            >
              Reintentar
            </button>
          </div>
        )}
        {!customers.isPending && !customers.isError && !customers.data?.items.length && (
          <p className="empty-table">
            {query
              ? 'No hay clientes con esta búsqueda.'
              : 'Todavía no hay clientes. Creá el primero para comenzar.'}
          </p>
        )}
        <div className="customer-list">
          {customers.data?.items.map((item) => (
            <article key={item.id} className={!item.active ? 'muted' : ''}>
              <span className="customer-avatar">{item.name.charAt(0).toUpperCase()}</span>
              <div>
                <strong>{item.name}</strong>
                <small>
                  {[item.phone, item.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </small>
              </div>
              {item.creditEnabled ? (
                <span className="customer-balance">
                  <small>Saldo</small>
                  <strong>{formatMoney(item.balanceCents)}</strong>
                </span>
              ) : (
                <span className="status-pill">Sin cuenta</span>
              )}
              <div className="row-actions">
                <button className="button secondary small" onClick={() => setAccountId(item.id)}>
                  Ver cuenta
                </button>
                <button className="button quiet small" onClick={() => setEditing(item)}>
                  Editar
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {editing !== undefined && (
        <CustomerForm
          customer={editing}
          canManageCredit={canManageCredit}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await client.invalidateQueries({ queryKey: ['customers'] });
          }}
        />
      )}
      {accountId && (
        <CustomerAccountDialog customerId={accountId} onClose={() => setAccountId(null)} />
      )}
    </div>
  );
}

export function CustomerForm({
  customer,
  canManageCredit,
  onClose,
  onSaved,
}: {
  customer: Customer | null;
  canManageCredit: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => Promise<void> | void;
}) {
  const savedCustomer = useRef(customer);
  const [name, setName] = useState(customer?.name ?? ''),
    [phone, setPhone] = useState(customer?.phone ?? ''),
    [email, setEmail] = useState(customer?.email ?? ''),
    [notes, setNotes] = useState(customer?.notes ?? ''),
    [credit, setCredit] = useState(customer?.creditEnabled ?? false),
    [limit, setLimit] = useState(moneyInput(customer?.creditLimitCents ?? 0)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const creditLimit = canManageCredit && credit ? parseArs(limit) : 0;
      let saved = unwrap(
        await api().customers.save({
          ...(savedCustomer.current
            ? { id: savedCustomer.current.id, expectedRevision: savedCustomer.current.revision }
            : {}),
          name,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
        }),
      );
      savedCustomer.current = saved;
      if (
        canManageCredit &&
        (credit !== saved.creditEnabled || creditLimit !== saved.creditLimitCents)
      )
        saved = unwrap(
          await api().customers.setCredit({
            customerId: saved.id,
            expectedRevision: saved.revision,
            creditEnabled: credit,
            creditLimitCents: creditLimit,
          }),
        );
      savedCustomer.current = saved;
      await onSaved(saved);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={customer ? 'Editar cliente' : 'Nuevo cliente'} onClose={onClose} busy={busy}>
      <div className="dialog-body customer-form">
        <label className="field">
          <span>Nombre</span>
          <input value={name} onChange={(e) => setName(e.target.value)} data-dialog-focus />
        </label>
        <div className="customer-form-grid">
          <label className="field">
            <span>Teléfono · opcional</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="field">
            <span>Email · opcional</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <details className="commerce-form-details" open={Boolean(customer?.notes)}>
          <summary>Notas</summary>
          <label className="field">
            <span>Nota · opcional</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </details>
        {canManageCredit && (
          <section className="credit-setting">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={credit}
                onChange={(e) => setCredit(e.target.checked)}
              />
              Habilitar cuenta corriente
            </label>
            {credit && (
              <label className="field">
                <span>Límite</span>
                <input
                  inputMode="decimal"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
              </label>
            )}
          </section>
        )}
        {error && <div className="alert error">{error}</div>}
        <div className="dialog-actions">
          <button className="button secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            className="button primary"
            disabled={busy || name.trim().length < 2}
            onClick={() => void save()}
          >
            {busy ? 'Guardando…' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

export function CustomerAccountDialog({
  customerId,
  onClose,
  initialObligationId,
  initialAmountCents,
}: {
  customerId: string;
  onClose: () => void;
  initialObligationId?: string;
  initialAmountCents?: number;
}) {
  const client = useQueryClient(),
    account = useQuery<CustomerAccount>({
      queryKey: ['customer-account', customerId],
      queryFn: async () => unwrap(await api().customerAccounts.detail(customerId)),
    });
  const collectionKey = useRef(crypto.randomUUID());
  const [amount, setAmount] = useState(
      initialAmountCents === undefined ? '' : moneyInput(initialAmountCents),
    ),
    [method, setMethod] = useState<'CASH' | 'TRANSFER' | 'DEBIT' | 'CREDIT' | 'OTHER'>('TRANSFER'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
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
  const value = useMemo(() => {
    try {
      return parseArs(amount);
    } catch {
      return 0;
    }
  }, [amount]);
  async function collect() {
    setBusy(true);
    setError('');
    try {
      if (method === 'CASH' && !shift.data)
        throw new Error('Abrí una caja antes de registrar el cobro en efectivo.');
      unwrap(
        await api().customerAccounts.collect({
          operationKey: collectionKey.current,
          customerId,
          amountCents: value,
          businessDate: new Intl.DateTimeFormat('sv-SE', {
            timeZone: 'America/Argentina/Buenos_Aires',
          }).format(new Date()),
          method,
          ...(method === 'CASH' ? { shiftId: shift.data!.id } : {}),
          ...(initialObligationId
            ? {
                allocations: [
                  {
                    saleId: initialObligationId,
                    amountCents: value,
                    expectedBalanceCents: account.data?.receivables.find(
                      (r) => r.saleId === initialObligationId,
                    )?.balanceCents,
                  },
                ],
              }
            : {}),
        }),
      );
      setAmount('');
      collectionKey.current = crypto.randomUUID();
      await Promise.all([
        client.invalidateQueries({ queryKey: ['customer-account', customerId] }),
        client.invalidateQueries({ queryKey: ['customers'] }),
        client.invalidateQueries({ queryKey: ['cash'] }),
        client.invalidateQueries({ queryKey: ['control'] }),
      ]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const data = account.data;
  return (
    <Dialog title={data?.customer.name ?? 'Cuenta del cliente'} onClose={onClose} wide busy={busy}>
      <div className="dialog-body customer-account-dialog">
        {account.isPending && <p>Cargando cuenta…</p>}
        {account.isError && (
          <div className="alert error" role="alert">
            {errorMessage(account.error)}{' '}
            <button className="button secondary" onClick={() => void account.refetch()}>
              Reintentar
            </button>
          </div>
        )}
        <ExportButton dataset="customerAccount" filters={{ customerId }} />
        {data && (
          <>
            <div className="customer-account-hero">
              <div>
                <small>Saldo pendiente</small>
                <strong>{formatMoney(data.balanceCents)}</strong>
              </div>
              <div>
                <small>Disponible</small>
                <strong>{formatMoney(data.availableCents)}</strong>
              </div>
              {data.creditCents > 0 && (
                <div>
                  <small>Crédito a favor</small>
                  <strong>{formatMoney(data.creditCents)}</strong>
                </div>
              )}
            </div>
            {data.balanceCents > 0 && (
              <section className="customer-collection">
                <h3>Registrar cobro</h3>
                {initialObligationId && (
                  <p>
                    Venta N.º{' '}
                    {data.receivables.find((r) => r.saleId === initialObligationId)?.saleNumber} ·
                    Pendiente{' '}
                    {formatMoney(
                      data.receivables.find((r) => r.saleId === initialObligationId)
                        ?.balanceCents ?? 0,
                    )}
                  </p>
                )}
                <div className="customer-form-grid">
                  <label className="field">
                    <span>Importe</span>
                    <input
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>Medio</span>
                    <select
                      value={method}
                      onChange={(e) => setMethod(e.target.value as typeof method)}
                    >
                      <option value="CASH">Efectivo</option>
                      <option value="TRANSFER">Transferencia</option>
                      <option value="DEBIT">Débito</option>
                      <option value="CREDIT">Crédito</option>
                      <option value="OTHER">Otro</option>
                    </select>
                  </label>
                </div>
                {error && <div className="alert error">{error}</div>}
                <button
                  className="button primary"
                  disabled={
                    busy ||
                    value <= 0 ||
                    value >
                      (initialObligationId
                        ? (data.receivables.find((r) => r.saleId === initialObligationId)
                            ?.balanceCents ?? 0)
                        : data.balanceCents)
                  }
                  onClick={() => void collect()}
                >
                  Confirmar cobro
                </button>
              </section>
            )}
            <section>
              <h3>Ventas a cuenta</h3>
              <div className="supplier-account-list">
                {data.receivables.map((r) => (
                  <article key={r.saleId}>
                    <span>
                      <strong>Venta N.º {r.saleNumber}</strong>
                      <small>
                        {new Date(r.businessDate + 'T12:00:00').toLocaleDateString('es-AR')}
                      </small>
                    </span>
                    <span className={`status-pill ${r.status === 'PAID' ? 'success' : ''}`}>
                      {r.status === 'OPEN'
                        ? 'Pendiente'
                        : r.status === 'PAID'
                          ? 'Saldada'
                          : 'Anulada'}
                    </span>
                    <strong>{formatMoney(r.balanceCents)}</strong>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Dialog>
  );
}
