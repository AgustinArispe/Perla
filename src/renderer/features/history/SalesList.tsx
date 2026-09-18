import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SalesSearchInput } from '../../../shared/sales';
import { formatMoney } from '../../../domain/values';
import { api, unwrap, errorMessage } from '../../api';
import { SaleDetailView } from './SaleDetail';
export function SalesList({ userId }: { userId: string }) {
  const [from, setFrom] = useState(''),
    [to, setTo] = useState(''),
    [status, setStatus] = useState<'ALL' | 'COMPLETED' | 'VOIDED'>('ALL'),
    [cursors, setCursors] = useState<(string | undefined)[]>([undefined]),
    [selected, setSelected] = useState<string | null>(null);
  const cursor = cursors.at(-1);
  const input: SalesSearchInput = {
    limit: 20,
    status,
    ...(from ? { fromDate: from } : {}),
    ...(to ? { toDate: to } : {}),
    ...(cursor ? { cursor } : {}),
  };
  const sales = useQuery({
    queryKey: ['sales-history', input],
    queryFn: async () => unwrap(await api().sales.list(input)),
    retry: false,
  });
  function reset() {
    setCursors([undefined]);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">VENTAS DEL NEGOCIO</span>
          <h1>Histórico</h1>
          <p>Ventas guardadas y anulaciones</p>
        </div>
      </div>
      <div className="history-filters">
        <label className="field">
          Desde
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              reset();
            }}
          />
        </label>
        <label className="field">
          Hasta
          <input
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              reset();
            }}
          />
        </label>
        <label className="field">
          Estado
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as typeof status);
              reset();
            }}
          >
            <option value="ALL">Todas</option>
            <option value="COMPLETED">Completadas</option>
            <option value="VOIDED">Anuladas</option>
          </select>
        </label>
      </div>
      {sales.isError && (
        <div className="alert error" role="alert">
          {errorMessage(sales.error)}
        </div>
      )}
      <div className="catalog-card">
        <table>
          <thead>
            <tr>
              <th>Venta</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sales.data?.items.map((sale) => (
              <tr key={sale.id}>
                <td>
                  <strong>N.º {sale.number}</strong>
                </td>
                <td>{sale.businessDate.split('-').reverse().join('/')}</td>
                <td>{sale.status === 'COMPLETED' ? 'Completada' : 'Anulada'}</td>
                <td>
                  <strong>{formatMoney(sale.totalCents)}</strong>
                </td>
                <td>
                  <button
                    className="button secondary small"
                    aria-label={`Ver venta ${sale.number}`}
                    onClick={() => setSelected(sale.id)}
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sales.isPending && !sales.data?.items.length && (
          <p className="empty-table">No hay ventas en este período.</p>
        )}
        <div className="catalog-bottom">
          <span>
            {sales.data?.total ?? 0} ventas · Página {cursors.length}
          </span>
          <div className="pagination">
            <button
              className="button secondary small"
              disabled={cursors.length === 1 || sales.isFetching}
              onClick={() => setCursors((current) => current.slice(0, -1))}
            >
              Anterior
            </button>
            <button
              className="button secondary small"
              disabled={!sales.data?.nextCursor || sales.isFetching}
              onClick={() => setCursors((current) => [...current, sales.data!.nextCursor!])}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
      {selected && (
        <SaleDetailView saleId={selected} userId={userId} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
