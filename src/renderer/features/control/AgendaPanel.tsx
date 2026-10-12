import { PageHeading } from '../../components/PageHeader';
import { useRememberedState } from '../../components/useRememberedState';
import { useState } from 'react';
import { SavedViews } from '../../components/SavedViews';
import { useQuery } from '@tanstack/react-query';
import type { AgendaRow, ControlPage } from '../../../shared/operational-control';
import { formatMoney } from '../../../domain/values';
import { webValue } from '../../web-client';
import { Dialog } from '../../components/Dialog';
import { CustomerAccountDialog } from '../customers/CustomerPage';
import { SupplierAccountDialog } from '../purchases/SupplierAccountDialog';
import { downloadControlExcel } from './client';

const request = <T,>(action: string, input: unknown = {}) =>
  webValue<T>('/control', 'POST', { area: 'operations', action, input });
export function AgendaPanel({
  onBack,
  initialKind = 'ALL',
}: {
  onBack?: () => void;
  initialKind?: 'ALL' | 'CUSTOMER' | 'SUPPLIER';
}) {
  const [kind, setKind] = useRememberedState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>(
      'agenda',
      `kind:${initialKind}`,
      initialKind,
    ),
    [bucket, setBucket] = useRememberedState('agenda', 'bucket', 'ALL'),
    [page, setPage] = useRememberedState('agenda', 'page', 1),
    [editing, setEditing] = useState<AgendaRow | null>(null),
    [payment, setPayment] = useState<AgendaRow | null>(null),
    [dueOn, setDueOn] = useState(''),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const filters = { kind, bucket };
  const agenda = useQuery({
    queryKey: ['control', 'agenda', filters, page],
    queryFn: () =>
      request<
        ControlPage<AgendaRow> & { summary: { receivableCents: number; payableCents: number } }
      >('agenda', { ...filters, page }),
  });
  const history = useQuery({
    queryKey: ['control', 'agendaHistory', editing?.kind, editing?.obligationId],
    queryFn: () =>
      request<
        {
          dueOn: string | null;
          previousDueOn: string | null;
          reason: string;
          actorName: string;
          createdAt: string;
        }[]
      >('agendaHistory', { kind: editing!.kind, obligationId: editing!.obligationId }),
    enabled: !!editing,
  });
  async function save() {
    if (!editing) return;
    setBusy(true);
    setError('');
    try {
      await request('agendaDate', {
        kind: editing.kind,
        obligationId: editing.obligationId,
        expectedRevision: editing.dueRevision,
        expectedBalanceCents: editing.balanceCents,
        dueOn: dueOn || null,
        reason,
      });
      setEditing(null);
      await agenda.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="control-page commerce-agenda-page">
      <PageHeading className="page-heading">
        <div>
          <h1>Cobros y pagos</h1>
          <p>Fechas acordadas e importes pendientes de cada obligación.</p>
        </div>
        {onBack && (
          <button className="button secondary" onClick={onBack}>
            Volver
          </button>
        )}
      </PageHeading>
      <section className="surface commerce-agenda">
        <div className="commerce-tabs" role="group" aria-label="Tipo de compromiso">
          {(['ALL', 'CUSTOMER', 'SUPPLIER'] as const).map((value) => (
            <button
              key={value}
              className="button secondary"
              aria-pressed={kind === value}
              onClick={() => {
                setKind(value);
                setPage(1);
              }}
            >
              {value === 'ALL' ? 'Todos' : value === 'CUSTOMER' ? 'Cobrar' : 'Pagar'}
            </button>
          ))}
        </div>
        <SavedViews
          module="agenda"
          filters={filters}
          onApply={(next) => {
            setKind(next.kind);
            setBucket(next.bucket);
            setPage(1);
          }}
        />
        <div className="filters commerce-agenda-filters">
          <label className="field">
            Fecha
            <select
              value={bucket}
              onChange={(e) => {
                setBucket(e.target.value);
                setPage(1);
              }}
            >
              <option value="ALL">Todos los pendientes</option>
              <option value="OVERDUE">Vencidos</option>
              <option value="WEEK">Esta semana</option>
              <option value="NEXT">Próximos</option>
              <option value="NO_DATE">Sin fecha</option>
            </select>
          </label>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void downloadControlExcel('operations', { dataset: 'agenda', filters })
                .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo exportar.'))
                .finally(() => setBusy(false));
            }}
          >
            Exportar Excel
          </button>
        </div>
        {agenda.data && (
          <div className="agenda-totals" aria-label="Totales de todos los compromisos del filtro">
            <div>
              <small>Por cobrar · total del filtro</small>
              <strong style={{ display: 'block' }}>
                {formatMoney(agenda.data.summary.receivableCents)}
              </strong>
            </div>
            <div>
              <small>Por pagar · total del filtro</small>
              <strong style={{ display: 'block' }}>
                {formatMoney(agenda.data.summary.payableCents)}
              </strong>
            </div>
          </div>
        )}
        {(error || agenda.isError) && (
          <p className="alert error" role="alert">
            {error || agenda.error?.message}
            {agenda.isError && (
              <button className="button secondary" onClick={() => void agenda.refetch()}>
                Reintentar
              </button>
            )}
          </p>
        )}
        {agenda.isPending && <p>Cargando compromisos…</p>}
        {agenda.data?.items.map((row) => (
          <article key={`${row.kind}:${row.obligationId}`} className="commerce-agenda-row">
            <div>
              <strong>{row.name}</strong>
              <p>
                {row.kind === 'CUSTOMER' ? 'Por cobrar' : 'Por pagar'} ·{' '}
                {row.dueOn ? `Fecha acordada ${row.dueOn}` : 'Sin fecha acordada'}
              </p>
              <strong>{formatMoney(row.balanceCents)}</strong>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button
                className="button secondary"
                onClick={() => {
                  setEditing(row);
                  setDueOn(row.dueOn ?? '');
                  setReason('');
                  setError('');
                }}
              >
                Acordar fecha
              </button>
              <button className="button secondary" onClick={() => setPayment(row)}>
                {row.kind === 'CUSTOMER' ? 'Registrar cobro' : 'Registrar pago'}
              </button>
            </div>
          </article>
        ))}
        {agenda.data?.total === 0 && <p>No hay compromisos en este filtro.</p>}
        {(agenda.data?.total ?? 0) > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              className="button secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} · {agenda.data?.total ?? 0} compromisos
            </span>
            <button
              className="button secondary"
              disabled={page * 25 >= (agenda.data?.total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
      {editing && (
        <Dialog
          title={`Fecha acordada · ${editing.name}`}
          onClose={() => setEditing(null)}
          busy={busy}
        >
          <div className="dialog-body">
            <p>
              {editing.kind === 'CUSTOMER' ? 'Por cobrar' : 'Por pagar'}{' '}
              {formatMoney(editing.balanceCents)}
            </p>
            <label className="field">
              Fecha · opcional
              <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} />
            </label>
            <label className="field">
              Motivo del acuerdo
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Acuerdo con el cliente o proveedor"
              />
            </label>
            {error && <p className="alert error">{error}</p>}
            <details>
              <summary>Historial de fechas</summary>
              {history.data?.map((h, i) => (
                <p key={i}>
                  {h.previousDueOn ?? 'Sin fecha'} → {h.dueOn ?? 'Sin fecha'} · {h.reason} ·{' '}
                  {h.actorName} · {new Date(h.createdAt).toLocaleString('es-AR')}
                </p>
              ))}
              {history.data?.length === 0 && <p>Sin acuerdos anteriores.</p>}
              {history.isError && <p className="alert error">{history.error.message}</p>}
            </details>
          </div>
          <div className="dialog-footer">
            <button
              className="button primary"
              disabled={busy || reason.trim().length < 3}
              onClick={() => void save()}
            >
              Guardar fecha
            </button>
          </div>
        </Dialog>
      )}
      {payment?.kind === 'CUSTOMER' && (
        <CustomerAccountDialog
          customerId={payment.partyId}
          initialObligationId={payment.obligationId}
          initialAmountCents={payment.balanceCents}
          onClose={() => {
            setPayment(null);
            void agenda.refetch();
          }}
        />
      )}
      {payment?.kind === 'SUPPLIER' && (
        <SupplierAccountDialog
          supplierId={payment.partyId}
          initialObligationId={payment.obligationId}
          initialAmountCents={payment.balanceCents}
          onClose={() => {
            setPayment(null);
            void agenda.refetch();
          }}
        />
      )}
    </div>
  );
}
