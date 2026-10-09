import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SalesSearchInput } from '../../../shared/sales';
import { formatMoney } from '../../../domain/values';
import { api, unwrap, errorMessage } from '../../api';
import { SaleDetailView } from './SaleDetail';
export function SalesList({
  userId,
  profitabilityEnabled = false,
  returnsEnabled = false,
}: {
  userId: string;
  profitabilityEnabled?: boolean;
  returnsEnabled?: boolean;
}) {
  const [from, setFrom] = useRememberedState('sales', 'fromDate', ''),
    [to, setTo] = useRememberedState('sales', 'toDate', ''),
    [status, setStatus] = useRememberedState<'ALL' | 'COMPLETED' | 'VOIDED'>(
      'sales',
      'status',
      'ALL',
    ),
    [cursors, setCursors] = useRememberedState<(string | undefined)[]>('sales', 'pages', [
      undefined,
    ]),
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
        <SavedViews
          module="sales"
          filters={{ status, ...(from ? { fromDate: from } : {}), ...(to ? { toDate: to } : {}) }}
          onApply={(filters) => {
            const value = scalarViewFilters(filters);
            setFrom(value.fromDate ?? '');
            setTo(value.toDate ?? '');
            setStatus((value.status ?? 'ALL') as typeof status);
            setCursors([undefined]);
          }}
        />
        <ExportButton
          dataset="sales"
          filters={{ status, ...(from ? { fromDate: from } : {}), ...(to ? { toDate: to } : {}) }}
        />
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
        <SaleDetailView
          saleId={selected}
          userId={userId}
          profitabilityEnabled={profitabilityEnabled}
          returnsEnabled={returnsEnabled}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
