import { SavedViews } from '../../components/SavedViews';
import { PerlaLoading } from '../../components/PerlaLoading';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatMoney } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { PurchaseDetail } from './PurchaseDetail';

export function PurchaseHistory({ accountsEnabled = false }: { accountsEnabled?: boolean }) {
  const [fromDate, setFromDate] = useRememberedState('purchases', 'fromDate', '');
  const [toDate, setToDate] = useRememberedState('purchases', 'toDate', '');
  const [status, setStatus] = useRememberedState<'ALL' | 'RECEIVED' | 'VOIDED'>(
    'purchases',
    'status',
    'ALL',
  );
  const [selected, setSelected] = useState<string | null>(null);
  const purchases = useQuery({
    queryKey: ['purchases', fromDate, toDate, status],
    queryFn: async () =>
      unwrap(
        await api().purchases.list({
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
          status,
          limit: 50,
        }),
      ),
    retry: false,
  });
  return (
    <section className="purchase-history">
      <div className="purchase-filters">
        <label className="field">
          <span>Desde</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Hasta</span>
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <label className="field">
          <span>Estado</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="ALL">Todas</option>
            <option value="RECEIVED">Recibidas</option>
            <option value="VOIDED">Anuladas</option>
          </select>
        </label>
        <SavedViews
          module="purchases"
          filters={{ status, ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) }}
          onApply={(filters) => {
            const value = scalarViewFilters(filters);
            setFromDate(value.fromDate ?? '');
            setToDate(value.toDate ?? '');
            setStatus((value.status ?? 'ALL') as typeof status);
            setSelected(null);
          }}
        />
        <ExportButton
          dataset="purchases"
          filters={{ status, ...(fromDate ? { fromDate } : {}), ...(toDate ? { toDate } : {}) }}
        />
      </div>
      {purchases.isError && <div className="alert error">{errorMessage(purchases.error)}</div>}
      <div className="purchase-history-list">
        {purchases.isPending && <PerlaLoading label="Cargando compras…" />}
        {purchases.data?.items.map((purchase) => (
          <button
            key={purchase.id}
            className="purchase-history-row"
            onClick={() => setSelected(purchase.id)}
          >
            <span className="purchase-number">N.º {purchase.number}</span>
            <span>
              <strong>{purchase.supplierName}</strong>
              <small>
                {new Date(`${purchase.businessDate}T12:00:00`).toLocaleDateString('es-AR')}
              </small>
            </span>
            <span className={`status-pill ${purchase.status === 'RECEIVED' ? 'success' : ''}`}>
              {purchase.status === 'RECEIVED' ? 'Recibida' : 'Anulada'}
            </span>
            <strong>{formatMoney(purchase.totalCents)}</strong>
          </button>
        ))}
        {purchases.data?.total === 0 && (
          <div className="empty-state">Todavía no hay compras para estos filtros.</div>
        )}
      </div>
      {selected && (
        <PurchaseDetail
          purchaseId={selected}
          accountsEnabled={accountsEnabled}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
