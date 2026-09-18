import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { AuditEvent, OperationPage } from '../../../shared/frontend-operations';
import { webValue } from '../../web-client';
import { errorMessage } from '../../api';
import { operationDate } from '../register/ShiftHistory';

const operations: Record<string, string> = {
  'cash.open': 'Apertura de caja',
  'cash.close': 'Cierre de caja',
  'cash.movement': 'Movimiento de efectivo',
  'cash.refund': 'Reintegro',
  'sales.complete': 'Venta',
  'sales.void': 'Anulación de venta',
  'products.save': 'Producto guardado',
  'products.setActive': 'Estado de producto',
  'stock.record': 'Movimiento de stock',
  'stock.count': 'Conteo de stock',
  'stock.opening': 'Stock inicial',
  'settings.save': 'Configuración',
  'terminals.save': 'Terminal guardada',
  'users.save': 'Usuario guardado',
  'auth.login': 'Inicio de sesión',
  'auth.logout': 'Cierre de sesión',
  'auth.changePassword': 'Cambio de contraseña',
  'backups.restore': 'Restauración de copia',
  'backups.create': 'Copia de seguridad',
};
export function AuditPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [operation, setOperation] = useState('');
  const [pages, setPages] = useState<(string | undefined)[]>([undefined]);
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
    <section className="panel">
      <div className="page-header">
        <h1>Auditoría</h1>
      </div>
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
        <div className="alert error" role="alert">
          La fecha inicial debe ser anterior a la final.
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
              <th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            {!invalid &&
              events.data?.items.map((e) => (
                <tr key={e.id}>
                  <td>{operationDate(e.createdAt)}</td>
                  <td>{e.actorName ?? 'Sistema'}</td>
                  <td>{operations[e.operation] ?? e.operation}</td>
                  <td style={{ overflowWrap: 'anywhere' }}>{e.entityId ?? '—'}</td>
                </tr>
              ))}
            {(!events.data?.items.length || invalid) && !events.isError && (
              <tr>
                <td className="empty-table" colSpan={4}>
                  {events.isPending ? 'Cargando auditoría…' : 'Sin operaciones en este período.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="dialog-footer">
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
  );
}
