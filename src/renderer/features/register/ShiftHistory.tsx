import { PageHeading } from '../../components/PageHeader';
import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type {
  OperationPage,
  RegisterShift,
  ShiftDetail,
  Terminal,
} from '../../../shared/frontend-operations';
import { formatMoney } from '../../../domain/values';
import { errorMessage } from '../../api';
import { webValue } from '../../web-client';
import { Dialog } from '../../components/Dialog';

export const operationDate = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
export function ShiftHistory() {
  const [from, setFrom] = useRememberedState('shifts', 'fromDate', '');
  const [to, setTo] = useRememberedState('shifts', 'toDate', '');
  const [status, setStatus] = useRememberedState('shifts', 'status', 'ALL');
  const [terminal, setTerminal] = useRememberedState('shifts', 'terminalId', '');
  const [pages, setPages] = useRememberedState<(string | undefined)[]>('shifts', 'pages', [
    undefined,
  ]);
  const [selected, setSelected] = useState<string | null>(null);
  const terminals = useQuery({
    queryKey: ['terminals', 'active'],
    queryFn: () => webValue<Terminal[]>('/terminals/active'),
    retry: false,
  });
  const cursor = pages.at(-1);
  const shifts = useQuery({
    queryKey: ['cash', 'shifts', from, to, status, terminal, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '20', status });
      if (from) params.set('fromDate', from);
      if (to) params.set('toDate', to);
      if (terminal) params.set('terminalId', terminal);
      if (cursor) params.set('cursor', cursor);
      return webValue<OperationPage<RegisterShift>>(`/cash/shifts?${params}`);
    },
    retry: false,
    placeholderData: keepPreviousData,
    enabled: !(from && to && from > to),
  });
  function change(set: (value: string) => void, value: string) {
    set(value);
    setPages([undefined]);
  }
  const invalid = !!from && !!to && from > to;
  const terminalName = (id: string) => terminals.data?.find((t) => t.id === id)?.name ?? id;
  return (
    <div className="commerce-shifts">
      <PageHeading className="page-heading">
        <h1>Turnos</h1>
      </PageHeading>
      <section className="panel">
        <div className="movement-filters">
          <label className="field">
            Desde
            <input type="date" value={from} onChange={(e) => change(setFrom, e.target.value)} />
          </label>
          <label className="field">
            Hasta
            <input type="date" value={to} onChange={(e) => change(setTo, e.target.value)} />
          </label>
          <label className="field">
            Estado
            <select value={status} onChange={(e) => change(setStatus, e.target.value)}>
              <option value="ALL">Todas</option>
              <option value="OPEN">Abiertas</option>
              <option value="CLOSED">Cerradas</option>
            </select>
          </label>
          <label className="field">
            Terminal
            <select value={terminal} onChange={(e) => change(setTerminal, e.target.value)}>
              <option value="">Todas</option>
              {terminals.data?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <SavedViews
            module="shifts"
            filters={{
              status,
              ...(from ? { fromDate: from } : {}),
              ...(to ? { toDate: to } : {}),
              ...(terminal ? { terminalId: terminal } : {}),
            }}
            onApply={(filters) => {
              const value = scalarViewFilters(filters);
              setFrom(value.fromDate ?? '');
              setTo(value.toDate ?? '');
              setStatus(value.status ?? 'ALL');
              setTerminal(value.terminalId ?? '');
              setPages([undefined]);
            }}
          />
          <ExportButton
            dataset="shifts"
            filters={{
              status,
              ...(from ? { fromDate: from } : {}),
              ...(to ? { toDate: to } : {}),
              ...(terminal ? { terminalId: terminal } : {}),
            }}
          />
        </div>
        {invalid && (
          <div className="alert error" role="alert">
            La fecha inicial debe ser anterior a la final.
          </div>
        )}
        {shifts.isError && (
          <div className="alert error" role="alert">
            {errorMessage(shifts.error)}{' '}
            <button className="button secondary" onClick={() => void shifts.refetch()}>
              Reintentar
            </button>
          </div>
        )}
        <div className="preview-table" aria-busy={shifts.isFetching}>
          <table>
            <thead>
              <tr>
                <th>Apertura</th>
                <th>Terminal</th>
                <th>Estado</th>
                <th className="numeric">Diferencia</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {!invalid &&
                shifts.data?.items.map((s) => (
                  <tr key={s.id}>
                    <td>{operationDate(s.openedAt)}</td>
                    <td>{terminalName(s.terminalId)}</td>
                    <td>
                      <span
                        className={`status-pill ${s.status === 'OPEN' ? 'warning' : 'success'}`}
                      >
                        {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
                      </span>
                    </td>
                    <td
                      className={`numeric shift-difference ${s.differenceCents ? 'shift-discrepancy' : ''} ${s.differenceCents && s.differenceCents < 0 ? 'negative-value' : ''}`}
                    >
                      {s.differenceCents == null
                        ? 'Pendiente de cierre'
                        : s.differenceCents === 0
                          ? 'Sin diferencia'
                          : `${s.differenceCents < 0 ? 'Falta' : 'Sobra'} ${formatMoney(Math.abs(s.differenceCents))}`}
                    </td>
                    <td>
                      <button
                        className="button secondary"
                        onClick={() => setSelected(s.id)}
                        aria-label={`Ver caja de ${terminalName(s.terminalId)} del ${operationDate(s.openedAt)}`}
                      >
                        Ver caja
                      </button>
                    </td>
                  </tr>
                ))}
              {(!shifts.data?.items.length || invalid) && !shifts.isError && (
                <tr>
                  <td className="empty-table" colSpan={5}>
                    {shifts.isPending ? 'Cargando cajas…' : 'Sin cajas en este período.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="dialog-footer">
          <button
            className="button secondary"
            disabled={pages.length === 1 || shifts.isFetching || invalid}
            onClick={() => setPages((p) => p.slice(0, -1))}
          >
            Anterior
          </button>
          <span>Página {pages.length}</span>
          <button
            className="button secondary"
            disabled={
              !shifts.data?.nextCursor || shifts.isFetching || shifts.isPlaceholderData || invalid
            }
            onClick={() => setPages((p) => [...p, shifts.data!.nextCursor!])}
          >
            Siguiente
          </button>
        </div>
        {selected && (
          <ShiftDetailDialog
            shiftId={selected}
            terminalName={terminalName}
            onClose={() => setSelected(null)}
          />
        )}
      </section>
    </div>
  );
}
function ShiftDetailDialog({
  shiftId,
  terminalName,
  onClose,
}: {
  shiftId: string;
  terminalName: (id: string) => string;
  onClose: () => void;
}) {
  const detail = useQuery({
    queryKey: ['cash', 'detail', shiftId],
    queryFn: () => webValue<ShiftDetail>(`/cash/detail?shiftId=${shiftId}`),
    retry: false,
  });
  const s = detail.data;
  return (
    <Dialog title="Detalle de caja" onClose={onClose} wide>
      <div className="dialog-body">
        {detail.isPending && <p aria-busy="true">Cargando caja…</p>}
        {detail.isError && (
          <div className="alert error" role="alert">
            {errorMessage(detail.error)}{' '}
            <button className="button secondary" onClick={() => void detail.refetch()}>
              Reintentar
            </button>
          </div>
        )}
        {s && (
          <>
            <h3>
              {terminalName(s.terminalId)} · {s.status === 'OPEN' ? 'Abierta' : 'Cerrada'}
            </h3>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '16px',
              }}
            >
              {[
                ['Apertura', operationDate(s.openedAt)],
                ['Cierre', s.closedAt ? operationDate(s.closedAt) : '—'],
                ['Efectivo inicial', formatMoney(s.openingCashCents)],
                [
                  'Efectivo esperado',
                  s.expectedCashCents == null ? '—' : formatMoney(s.expectedCashCents),
                ],
                [
                  'Efectivo contado',
                  s.countedCashCents == null ? '—' : formatMoney(s.countedCashCents),
                ],
                ['Diferencia', s.differenceCents == null ? '—' : formatMoney(s.differenceCents)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd
                    style={{ margin: '4px 0', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <h3>Movimientos de efectivo</h3>
            <div className="preview-table">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Movimiento</th>
                    <th>Motivo</th>
                    <th className="numeric">Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {s.movements.map((m) => (
                    <tr key={m.id}>
                      <td>{operationDate(m.createdAt)}</td>
                      <td>
                        {m.kind === 'IN' ? 'Ingreso' : m.kind === 'OUT' ? 'Retiro' : 'Reintegro'}
                      </td>
                      <td>{m.reason}</td>
                      <td className={`numeric ${m.kind !== 'IN' ? 'negative-value' : ''}`}>
                        {m.kind === 'IN' ? '+' : '−'}
                        {formatMoney(m.amountCents)}
                      </td>
                    </tr>
                  ))}
                  {!s.movements.length && (
                    <tr>
                      <td colSpan={4} className="empty-table">
                        Sin movimientos de efectivo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div className="dialog-footer">
        <button className="button primary" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
    </Dialog>
  );
}
