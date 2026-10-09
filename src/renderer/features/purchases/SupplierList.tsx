import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Supplier } from '../../../shared/purchases';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import { SupplierForm } from './SupplierForm';
import { SupplierAccountDialog } from './SupplierAccountDialog';
import { formatMoney } from '../../../domain/values';

export function SupplierList({
  compact = false,
  accountsEnabled = false,
}: {
  compact?: boolean;
  accountsEnabled?: boolean;
}) {
  const client = useQueryClient();
  const [query, setQuery] = useRememberedState('suppliers', 'query', '');
  const [pages, setPages] = useRememberedState<(string | undefined)[]>('suppliers', 'pages', [
    undefined,
  ]);
  const cursor = pages.at(-1);
  const [editor, setEditor] = useState<Supplier | null | undefined>();
  const [accountSupplier, setAccountSupplier] = useState<string | null>(null);
  const suppliers = useQuery({
    queryKey: ['suppliers', query, cursor],
    queryFn: async () =>
      unwrap(
        await api().suppliers.search({
          query,
          status: 'ALL',
          limit: 30,
          ...(cursor ? { cursor } : {}),
        }),
      ),
    retry: false,
  });
  return (
    <section className={compact ? 'purchase-suppliers compact' : 'purchase-suppliers'}>
      <div className="purchase-toolbar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPages([undefined]);
            }}
            aria-label="Buscar proveedor"
            placeholder="Buscar proveedor"
          />
        </label>
        <button className="button primary" onClick={() => setEditor(null)}>
          <Icon name="plus" size={18} /> Nuevo proveedor
        </button>
        <SavedViews
          module="suppliers"
          filters={{ query, status: 'ALL' }}
          onApply={(filters) => {
            const value = scalarViewFilters(filters);
            setQuery(value.query ?? '');
            setPages([undefined]);
          }}
        />
        <ExportButton dataset="suppliers" filters={{ query, status: 'ALL' }} />
      </div>
      {suppliers.isError && <div className="alert error">{errorMessage(suppliers.error)}</div>}
      {suppliers.isFetching && <p role="status">Buscando proveedores…</p>}
      <div className="supplier-cards">
        {suppliers.data?.items.map((supplier) => (
          <article className="supplier-card" key={supplier.id}>
            <div>
              <strong>{supplier.name}</strong>
              {supplier.phone && <small>{supplier.phone}</small>}
            </div>
            <span className={`status-pill ${supplier.active ? 'success' : ''}`}>
              {supplier.active ? 'Activo' : 'Inactivo'}
            </span>
            {accountsEnabled && (
              <button
                className="supplier-balance"
                aria-label={`Cuenta de ${supplier.name}. Saldo ${formatMoney(supplier.balanceCents)}`}
                onClick={() => setAccountSupplier(supplier.id)}
              >
                <small>Saldo</small>
                <strong>{formatMoney(supplier.balanceCents)}</strong>
              </button>
            )}
            <button className="button secondary small" onClick={() => setEditor(supplier)}>
              Editar
            </button>
          </article>
        ))}
        {suppliers.data?.total === 0 && (
          <div className="empty-state">No hay proveedores para esta búsqueda.</div>
        )}
      </div>
      <div className="table-pagination">
        <span>
          {suppliers.data?.total ?? '—'} proveedores · Página {pages.length}
        </span>
        <div className="row-actions">
          <button
            className="button secondary small"
            disabled={pages.length === 1 || suppliers.isFetching}
            onClick={() => setPages((current) => current.slice(0, -1))}
          >
            Anterior
          </button>
          <button
            className="button secondary small"
            disabled={!suppliers.data?.nextCursor || suppliers.isFetching}
            onClick={() => setPages((current) => [...current, suppliers.data!.nextCursor!])}
          >
            Siguiente
          </button>
        </div>
      </div>
      {editor !== undefined && (
        <SupplierForm
          supplier={editor ?? undefined}
          onClose={() => setEditor(undefined)}
          onSaved={(saved) => {
            setEditor(undefined);
            void client.invalidateQueries({ queryKey: ['suppliers'] });
            void client.setQueryData(['supplier-last-created'], saved);
          }}
        />
      )}
      {accountSupplier && (
        <SupplierAccountDialog
          supplierId={accountSupplier}
          onClose={() => setAccountSupplier(null)}
        />
      )}
    </section>
  );
}
