import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeading } from '../../components/PageHeader';
import { activityLabel, activityOperations as operations } from './operation-labels';
import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { AuditEvent, OperationPage } from '../../../shared/frontend-operations';
import { webValue } from '../../web-client';
import { errorMessage } from '../../api';
import { operationDate } from '../register/ShiftHistory';

export function AuditPage() {
  const [from, setFrom] = useRememberedState('audit', 'fromDate', '');
  const [to, setTo] = useRememberedState('audit', 'toDate', '');
  const [operation, setOperation] = useRememberedState('audit', 'operation', '');
  const [pages, setPages] = useRememberedState<(string | undefined)[]>('audit', 'pages', [
    undefined,
  ]);
  const cursor = pages.at(-1);
  const invalid = !!from && !!to && from > to;
  const events = useQuery({
    queryKey: ['audit', from, to, operation, cursor],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '25' });
      if (from) params.set('fromDate', from);
      if (to) params.set('toDate', to);
      if (operation) params.set('operation', operation);
      if (cursor) params.set('cursor', cursor);
      return webValue<OperationPage<AuditEvent>>(`/audit?${params}`);
    },
    retry: false,
    placeholderData: keepPreviousData,
    enabled: !invalid,
  });
  function change(set: (value: string) => void, value: string) {
    set(value);
    setPages([undefined]);
  }
  return (
    <div className="admin-workspace audit-workspace">
      <PageHeading className="page-heading">
        <h1>Actividad</h1>
        <div className="heading-actions">
          <SavedViews
            module="audit"
            filters={{
              ...(from ? { fromDate: from } : {}),
              ...(to ? { toDate: to } : {}),
              ...(operation ? { operation } : {}),
            }}
            onApply={(filters) => {
              const value = scalarViewFilters(filters);
              setFrom(value.fromDate ?? '');
              setTo(value.toDate ?? '');
              setOperation(value.operation ?? '');
              setPages([undefined]);
            }}
          />
          <ExportButton
            dataset="audit"
            filters={{
              ...(from ? { fromDate: from } : {}),
              ...(to ? { toDate: to } : {}),
              ...(operation ? { operation } : {}),
            }}
          />
        </div>
      </PageHeading>
      <section className="panel">
        <div className="movement-filters admin-toolbar">
          <label className="field">
            Desde
            <input
              type="date"
              value={from}
              aria-invalid={invalid}
              aria-describedby={invalid ? 'audit-date-error' : undefined}
              onChange={(e) => change(setFrom, e.target.value)}
            />
          </label>
          <label className="field">
            Hasta
            <input
              type="date"
              value={to}
              aria-invalid={invalid}
              aria-describedby={invalid ? 'audit-date-error' : undefined}
              onChange={(e) => change(setTo, e.target.value)}
            />
          </label>
          <label className="field">
            Operación
            <select value={operation} onChange={(e) => change(setOperation, e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(operations).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button secondary"
            disabled={events.isFetching || invalid}
            onClick={() => void events.refetch()}
          >
            Actualizar
          </button>
        </div>
        {invalid && (
          <div id="audit-date-error" className="alert error" role="alert">
            La fecha inicial debe ser anterior o igual a la final.
          </div>
        )}
        {events.isError && (
          <div className="alert error" role="alert">
            {errorMessage(events.error)}{' '}
            <button className="button secondary" onClick={() => void events.refetch()}>
              Reintentar
            </button>
          </div>
        )}
        <div className="preview-table" aria-busy={events.isFetching}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Operación</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {!invalid &&
                events.data?.items.map((e) => (
                  <tr key={e.id}>
                    <td>{operationDate(e.createdAt)}</td>
                    <td>{e.actorName ?? 'Sistema'}</td>
                    <td>{activityLabel(e.operation)}</td>
                    <td>
                      <details className="commerce-activity-details">
                        <summary>Ver registro</summary>
                        <dl>
                          <dt>Operación</dt>
                          <dd>{e.operation}</dd>
                          <dt>Identificador</dt>
                          <dd>{e.entityId ?? 'Sin entidad asociada'}</dd>
                        </dl>
                      </details>
                    </td>
                  </tr>
                ))}
              {(!events.data?.items.length || invalid) && !events.isError && (
                <tr>
                  <td className="empty-table" colSpan={4}>
                    {invalid
                      ? 'Corregí las fechas para consultar la actividad.'
                      : events.isPending
                        ? (<PerlaLoading size="compact" label="Cargando auditoría…" />)
                        : 'Sin operaciones con estos filtros. Probá ampliar el período o elegir todas las operaciones.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="dialog-footer admin-pagination" aria-label="Paginación de actividad">
          <button
            className="button secondary"
            disabled={pages.length === 1 || events.isFetching || invalid}
            onClick={() => setPages((p) => p.slice(0, -1))}
          >
            Anterior
          </button>
          <span>Página {pages.length}</span>
          <button
            className="button secondary"
            disabled={
              !events.data?.nextCursor || events.isFetching || events.isPlaceholderData || invalid
            }
            onClick={() => setPages((p) => [...p, events.data!.nextCursor!])}
          >
            Siguiente
          </button>
        </div>
      </section>
    </div>
  );
}
