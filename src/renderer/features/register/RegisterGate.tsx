import { useRef, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { WebSession } from '../../../shared/web';
import type { RegisterShift, ShiftDetail, Terminal } from '../../../shared/frontend-operations';
import { formatMoney, parseArs } from '../../../domain/values';
import { errorMessage } from '../../api';
import { webRequest, webValue } from '../../web-client';
import { Dialog } from '../../components/Dialog';

type Pending = { path: string; body: Record<string, unknown> };
export function RegisterGate({
  children,
  beforeClose,
}: {
  children: ReactNode;
  beforeClose?: () => Promise<void>;
}) {
  const client = useQueryClient();
  const session = useQuery({
    queryKey: ['web-session'],
    queryFn: () => webValue<WebSession>('/auth/session'),
    retry: false,
  });
  const terminals = useQuery({
    queryKey: ['terminals', 'active'],
    queryFn: () => webValue<Terminal[]>('/terminals/active'),
    retry: false,
  });
  const terminalId = session.data?.terminalId;
  const current = useQuery({
    queryKey: ['cash', 'current', terminalId],
    queryFn: () => webValue<RegisterShift | null>(`/cash/current?terminalId=${terminalId}`),
    enabled: !!terminalId,
    retry: false,
  });
  const [chosen, setChosen] = useState('');
  const [mode, setMode] = useState<'close' | 'movement' | null>(null);
  const [amount, setAmount] = useState('');
  const [kind, setKind] = useState<'IN' | 'OUT'>('OUT');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<RegisterShift | null>(null);
  const [pendingByUser, setPendingByUser] = useState<Record<string, Pending>>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('register-pending-by-user') ?? '{}') as Record<
        string,
        Pending
      >;
    } catch {
      return {};
    }
  });
  const actorId = session.data?.user?.id;
  const pending = actorId ? (pendingByUser[actorId] ?? null) : null;
  const detail = useQuery({
    queryKey: ['cash', 'detail', current.data?.id],
    queryFn: () => webValue<ShiftDetail>(`/cash/detail?shiftId=${current.data!.id}`),
    enabled: !!current.data?.id && !!mode,
    retry: false,
  });
  let closeDifference: number | null = null;
  if (
    mode === 'close' &&
    amount.trim() &&
    detail.data &&
    detail.data.expectedCashCents !== null &&
    !detail.isFetching &&
    !detail.isError
  ) {
    try {
      closeDifference = parseArs(amount) - detail.data.expectedCashCents;
    } catch {
      /* The form reports invalid amounts on submission. */
    }
  }
  function remember(value: Pending | null) {
    if (!actorId) throw new Error('Volvé a iniciar sesión antes de operar la caja.');
    const next = { ...pendingByUser };
    if (value) next[actorId] = value;
    else delete next[actorId];
    sessionStorage.setItem('register-pending-by-user', JSON.stringify(next));
    setPendingByUser(next);
  }
  async function execute(path: string, body: Record<string, unknown>) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    const operation = pending ?? { path, body: { ...body, operationKey: crypto.randomUUID() } };
    try {
      remember(operation);
      const result = await webRequest<RegisterShift>(operation.path, 'POST', operation.body);
      if (!result.ok) {
        if (!['INTERNAL', 'DB_BUSY', 'DISK_FULL'].includes(result.error.code)) remember(null);
        throw new Error(result.error.message);
      }
      remember(null);
      if (operation.path === '/cash/close') setReceipt(result.value);
      setMode(null);
      setAmount('');
      setReason('');
      await client.invalidateQueries({ queryKey: ['cash'] });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  async function select() {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await webValue('/auth/terminal', 'POST', { terminalId: chosen });
      await client.invalidateQueries({ queryKey: ['web-session'] });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  function confirm() {
    try {
      if (pending) {
        void execute(pending.path, pending.body);
        return;
      }
      const cents = parseArs(amount);
      if (!current.data) void execute('/cash/open', { terminalId, openingCashCents: cents });
      else if (mode === 'close')
        void execute('/cash/close', { shiftId: current.data.id, countedCashCents: cents });
      else {
        if (cents <= 0) throw new Error('Ingresá un importe mayor a cero.');
        if (reason.trim().length < 3)
          throw new Error('Ingresá un motivo de al menos 3 caracteres.');
        void execute('/cash/movement', {
          shiftId: current.data.id,
          kind,
          amountCents: cents,
          reason: reason.trim(),
        });
      }
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  const failure =
    error ||
    (session.error
      ? errorMessage(session.error)
      : terminals.error
        ? errorMessage(terminals.error)
        : current.error
          ? errorMessage(current.error)
          : '');
  const feedback = failure && (
    <div className="alert error" role="alert">
      {failure}
      {((session.isError && session.data) ||
        (terminals.isError && terminals.data) ||
        (current.isError && current.data)) && (
        <button
          className="button secondary small"
          onClick={() => {
            void session.refetch();
            void terminals.refetch();
            if (terminalId) void current.refetch();
          }}
        >
          Reintentar conexión
        </button>
      )}
    </div>
  );
  const retryPending = pending && (
    <div className="alert" role="status">
      Operación pendiente de confirmar.{' '}
      <button
        className="button primary"
        disabled={busy}
        onClick={() => void execute(pending.path, pending.body)}
      >
        Confirmar operación
      </button>
    </div>
  );
  if (session.isPending || terminals.isPending || (!!terminalId && current.isPending))
    return (
      <section className="panel" aria-busy="true">
        <h2>Caja</h2>
        <p>Cargando caja…</p>
      </section>
    );
  if ((session.isError && !session.data) || (terminals.isError && !terminals.data))
    return (
      <section className="panel">
        <h2>Caja</h2>
        {feedback}
        <button
          className="button secondary"
          onClick={() => {
            void session.refetch();
            void terminals.refetch();
          }}
        >
          Reintentar conexión
        </button>
      </section>
    );
  if (!terminalId)
    return (
      <section className="panel register-setup">
        <h2>Elegir terminal</h2>
        {feedback}
        {retryPending}
        <label className="field">
          Terminal
          <select
            value={chosen}
            disabled={busy || !!pending}
            onChange={(e) => setChosen(e.target.value)}
          >
            <option value="">Seleccionar</option>
            {terminals.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        {!terminals.data?.length && (
          <p>No hay terminales activas. Pedí al administrador que cree una.</p>
        )}
        <button
          className="button primary"
          disabled={!chosen || busy || !!pending}
          onClick={() => void select()}
        >
          {busy ? 'Guardando…' : 'Usar terminal'}
        </button>
      </section>
    );
  if (current.isError && !current.data)
    return (
      <section className="panel">
        <h2>Caja</h2>
        {feedback}
        {retryPending}
        <button className="button secondary" onClick={() => void current.refetch()}>
          Volver a consultar
        </button>
      </section>
    );
  if (!current.data)
    return (
      <section className="panel register-setup">
        <h2>Abrir caja · {terminals.data?.find((t) => t.id === terminalId)?.name}</h2>
        {feedback}
        {retryPending}
        {receipt && (
          <p className="status-message" role="status">
            Caja cerrada · Diferencia {formatMoney(receipt.differenceCents ?? 0)}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
        >
          <label className="field">
            Efectivo inicial
            <input
              autoFocus
              inputMode="decimal"
              value={amount}
              disabled={busy || !!pending}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums' }}
            />
          </label>
          <button className="button primary" disabled={busy || !!pending}>
            {busy ? 'Abriendo…' : 'Abrir caja'}
          </button>
        </form>
      </section>
    );
  return (
    <>
      <div
        className="panel register-toolbar"
        style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}
      >
        <strong>Caja abierta · {terminals.data?.find((t) => t.id === terminalId)?.name}</strong>
        <button
          className="button secondary"
          disabled={busy || !!pending}
          onClick={() => {
            setMode('movement');
            setAmount('');
            setError('');
          }}
        >
          Ingreso / retiro
        </button>
        <button
          className="button secondary"
          disabled={busy || !!pending}
          onClick={() => {
            void (async () => {
              try {
                await beforeClose?.();
                setMode('close');
                setAmount('');
                setError('');
              } catch (failure) {
                setError(errorMessage(failure));
              }
            })();
          }}
        >
          Cerrar caja
        </button>
        {feedback}
        {retryPending}
      </div>
      {children}
      {mode && (
        <Dialog
          title={mode === 'close' ? 'Cerrar caja' : 'Movimiento de efectivo'}
          busy={busy || !!pending}
          onClose={() => setMode(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <div className="dialog-body">
              {feedback}
              {retryPending}
              {mode === 'close' && (
                <p>
                  Efectivo esperado{' '}
                  <strong>
                    {detail.data?.expectedCashCents == null
                      ? '…'
                      : formatMoney(detail.data.expectedCashCents)}
                  </strong>
                </p>
              )}
              {detail.isError && (
                <div className="alert error" role="alert">
                  {errorMessage(detail.error)}
                </div>
              )}
              {mode === 'movement' && (
                <label className="field">
                  Movimiento
                  <select
                    value={kind}
                    disabled={busy || !!pending}
                    onChange={(e) => setKind(e.target.value as 'IN' | 'OUT')}
                  >
                    <option value="OUT">Retiro</option>
                    <option value="IN">Ingreso</option>
                  </select>
                </label>
              )}
              <label className="field">
                {mode === 'close' ? 'Efectivo contado' : 'Importe'}
                <input
                  autoFocus
                  inputMode="decimal"
                  value={amount}
                  disabled={busy || !!pending}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  style={{ fontSize: '2rem', fontVariantNumeric: 'tabular-nums' }}
                />
              </label>
              {mode === 'close' && closeDifference !== null && (
                <div
                  className="register-close-balance"
                  data-state={
                    closeDifference < 0 ? 'shortage' : closeDifference > 0 ? 'surplus' : 'balanced'
                  }
                  role="status"
                >
                  <span>Diferencia</span>
                  <strong>
                    {closeDifference === 0
                      ? 'Sin diferencia'
                      : `${closeDifference < 0 ? 'Faltan' : 'Sobran'} ${formatMoney(Math.abs(closeDifference))}`}
                  </strong>
                </div>
              )}
              {mode === 'movement' && (
                <label className="field">
                  Motivo
                  <input
                    value={reason}
                    maxLength={240}
                    disabled={busy || !!pending}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}
            </div>
            <div className="dialog-footer">
              <button
                type="button"
                className="button secondary"
                disabled={busy || !!pending}
                onClick={() => setMode(null)}
              >
                Cancelar
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !!pending ||
                  (mode === 'close' &&
                    (detail.data?.expectedCashCents == null || detail.isFetching || detail.isError))
                }
              >
                {busy ? 'Guardando…' : mode === 'close' ? 'Cerrar caja' : 'Registrar movimiento'}
              </button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
