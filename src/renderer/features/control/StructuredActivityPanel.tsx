import { PageHeading } from '../../components/PageHeader';
import { activityLabel } from '../audit/operation-labels';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { controlValue, downloadControlExcel } from './client';
import { errorMessage } from '../../api';
import { formatMoney } from '../../../domain/values';
interface ActivityItem {
  id: string;
  entityId: string;
  operation: string;
  entityType: string;
  beforeJson: string | null;
  afterJson: string | null;
  reason: string;
  actorName: string;
  createdAt: string;
}
const entities: Record<string, string> = {
  product: 'Producto',
  price: 'Precio',
  stock: 'Stock',
  sale: 'Venta',
  shift: 'Turno',
  settings: 'Configuración',
};
const fields: Record<string, string> = {
  name: 'Nombre',
  sku: 'SKU',
  priceCents: 'Precio',
  active: 'Activo',
  quantityBase: 'Existencia base',
  status: 'Estado',
  totalCents: 'Total',
  number: 'Número',
  countedCents: 'Efectivo contado',
  expectedCents: 'Efectivo esperado',
  marginBasisPoints: 'Margen mínimo',
  staleDays: 'Días para revisión',
  revision: 'Revisión',
  costRevision: 'Revisión de costo',
};
function changes(item: ActivityItem) {
  if (!item.beforeJson || !item.afterJson) return <span>Registro anterior sin desglose</span>;
  let before: Record<string, unknown> = {},
    after: Record<string, unknown> = {};
  try {
    before = JSON.parse(item.beforeJson) as Record<string, unknown>;
    after = JSON.parse(item.afterJson) as Record<string, unknown>;
  } catch {
    return <span>Detalle no disponible</span>;
  }
  const show = (key: string, value: unknown) =>
    value === null || value === undefined
      ? 'Sin dato'
      : key.endsWith('Cents') && typeof value === 'number'
        ? formatMoney(value)
        : typeof value === 'boolean'
          ? value
            ? 'Sí'
            : 'No'
          : String(value);
  return (
    <dl>
      {Object.keys({ ...before, ...after })
        .filter((key) => key in fields && before[key] !== after[key])
        .map((key) => (
          <div key={key}>
            <dt>{fields[key]}</dt>
            <dd>
              {show(key, before[key])} → {show(key, after[key])}
            </dd>
          </div>
        ))}
    </dl>
  );
}
export function StructuredActivityPanel({
  entityType,
  entityId,
  onBack,
}: {
  entityType?: string;
  entityId?: string;
  onBack?: () => void;
}) {
  const [type, setType] = useState(entityType ?? '');
  const [entityQuery, setEntityQuery] = useState('');
  const [actorId, setActorId] = useState('');
  const [operation, setOperation] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const filters = {
    ...(type ? { entityType: type } : {}),
    ...(entityId ? { entityId } : {}),
    ...(entityQuery ? { entityQuery } : {}),
    ...(actorId ? { actorId } : {}),
    ...(operation ? { operation } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    page,
    limit: 25,
  };
  const invalid = !!from && !!to && from > to;
  const data = useQuery({
    queryKey: ['structured-activity', filters],
    queryFn: () =>
      controlValue<{ items: ActivityItem[]; total: number }>('commercial', 'activity', filters),
    retry: false,
    enabled: !invalid,
  });
  const options = useQuery({
    queryKey: ['activity-options'],
    queryFn: () =>
      controlValue<{ actors: { id: string; name: string }[]; operations: { operation: string }[] }>(
        'commercial',
        'options',
      ),
    retry: false,
  });
  const excel = useMutation({
    mutationFn: () => downloadControlExcel('commercial', filters, 'exportActivity'),
    onError: (e) => setError(errorMessage(e)),
  });
  function change(set: (s: string) => void, s: string) {
    set(s);
    setPage(1);
  }
  return (
    <>
      <PageHeading className="page-heading">
        <h1>Cambios del negocio</h1>
        {onBack && (
          <button className="button secondary" onClick={onBack}>
            Volver
          </button>
        )}
        <button
          className="button secondary"
          disabled={invalid || excel.isPending}
          onClick={() => excel.mutate()}
        >
          Descargar Excel
        </button>
      </PageHeading>
      <section className="panel">
        <div className="movement-filters">
          <label className="field">
            Entidad
            <select value={type} onChange={(e) => change(setType, e.target.value)}>
              <option value="">Todas</option>
              {Object.entries(entities).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!entityId && (
            <label className="field">
              Producto o número de venta
              <input
                type="search"
                value={entityQuery}
                onChange={(e) => change(setEntityQuery, e.target.value)}
              />
            </label>
          )}
          <label className="field">
            Persona
            <select value={actorId} onChange={(e) => change(setActorId, e.target.value)}>
              <option value="">Todas</option>
              {options.data?.actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Operación
            <select value={operation} onChange={(e) => change(setOperation, e.target.value)}>
              <option value="">Todas</option>
              {options.data?.operations.map((o) => (
                <option key={o.operation} value={o.operation}>
                  {activityLabel(o.operation)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Desde
            <input type="date" value={from} onChange={(e) => change(setFrom, e.target.value)} />
          </label>
          <label className="field">
            Hasta
            <input type="date" value={to} onChange={(e) => change(setTo, e.target.value)} />
          </label>
        </div>
        {(invalid || error || data.isError) && (
          <div className="alert error" role="alert">
            {invalid
              ? 'La fecha inicial debe ser anterior a la final.'
              : error || errorMessage(data.error)}
            {data.isError && (
              <button className="button secondary" onClick={() => void data.refetch()}>
                Reintentar
              </button>
            )}
          </div>
        )}
        <div className="preview-table" aria-busy={data.isFetching}>
          <table>
            <thead>
              <tr>
                <th>Fecha y persona</th>
                <th>Operación</th>
                <th>Cambios</th>
              </tr>
            </thead>
            <tbody>
              {!invalid &&
                data.data?.items.map((i) => (
                  <tr key={i.id}>
                    <td>
                      {new Date(i.createdAt).toLocaleString('es-AR')}
                      <small style={{ display: 'block' }}>{i.actorName}</small>
                    </td>
                    <td>
                      {activityLabel(i.operation)}
                      <small style={{ display: 'block' }}>
                        {entities[i.entityType] ?? 'Registro'} {i.reason}
                      </small>
                    </td>
                    <td>
                      {changes(i)}
                      <details className="commerce-activity-details">
                        <summary>Detalle del registro</summary>
                        <dl>
                          <dt>Operación</dt>
                          <dd>{i.operation}</dd>
                          <dt>Identificador</dt>
                          <dd>{i.entityId}</dd>
                        </dl>
                      </details>
                    </td>
                  </tr>
                ))}
              {(!data.data?.items.length || invalid) && (
                <tr>
                  <td className="empty-table" colSpan={3}>
                    {data.isPending ? 'Cargando actividad…' : 'Sin cambios con estos filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="dialog-footer">
          <button
            className="button secondary"
            disabled={page === 1 || data.isFetching}
            onClick={() => setPage((v) => v - 1)}
          >
            Anterior
          </button>
          <span>Página {page}</span>
          <button
            className="button secondary"
            disabled={!data.data || page * 25 >= data.data.total || data.isFetching}
            onClick={() => setPage((v) => v + 1)}
          >
            Siguiente
          </button>
        </div>
      </section>
    </>
  );
}
