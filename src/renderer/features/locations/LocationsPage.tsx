import { PerlaLoading } from '../../components/PerlaLoading';
import { canTransferQuantity } from './transfer-validation';
import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import { Dialog } from '../../components/Dialog';
import { EntityPicker } from '../../components/EntityPicker';
import { formatStock } from '../../../domain/inventory';
import { parseQuantity, quantityInput } from '../../../domain/values';
import type { Location, StockTransfer } from '../../../shared/locations';
import type { Product } from '../../../shared/catalog';

const labels = {
  IN_TRANSIT: 'En tránsito',
  RECEIVED: 'Recibido',
  CANCELLED: 'Cancelado',
} as const;
function parse(value: string, unit: 'KG' | 'UNIT') {
  try {
    return parseQuantity(value, unit);
  } catch {
    return null;
  }
}

export function LocationsPage({ canConfigure }: { canConfigure: boolean }) {
  const client = useQueryClient();
  const [editor, setEditor] = useState<Location | null | undefined>();
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [action, setAction] = useState<{
    transfer: StockTransfer;
    mode: 'receive' | 'cancel';
  }>();
  const [selected, setSelected] = useRememberedState('locations', 'selected', '');
  const [view, setView] = useRememberedState<'inventory' | 'transfers'>(
    'locations',
    'view',
    'inventory',
  );
  const [transferStatus, setTransferStatus] = useRememberedState<
    'ALL' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED'
  >('transfers', 'status', 'ALL');
  const locations = useQuery({
    queryKey: ['locations'],
    queryFn: async () => unwrap(await api().locations.list()),
  });
  const transfers = useQuery({
    queryKey: ['transfers', transferStatus],
    queryFn: async () => unwrap(await api().transfers.list({ status: transferStatus, limit: 100 })),
  });
  const active = (locations.data ?? []).filter((item) => item.active);
  const refresh = async () => {
    await Promise.all(
      ['locations', 'transfers', 'stock', 'location-inventory', 'location-summary'].map((key) =>
        client.invalidateQueries({ queryKey: [key] }),
      ),
    );
  };
  const selectedLocation = locations.data?.find((item) => item.id === (selected || active[0]?.id));
  return (
    <div className="locations-page">
      <header className="page-heading">
        <h1>Ubicaciones</h1>
        <div className="header-actions">
          {canConfigure && (
            <button className="button secondary" onClick={() => setEditor(null)}>
              <Icon name="plus" size={18} />
              Nueva ubicación
            </button>
          )}
          <button
            className="button primary"
            disabled={active.length < 2}
            onClick={() => setDispatchOpen(true)}
          >
            <Icon name="arrow" size={18} />
            Nuevo traslado
          </button>
        </div>
      </header>
      {locations.isError && (
        <div className="alert error" role="alert">
          {errorMessage(locations.error)}
        </div>
      )}
      <div className="settings-tabs" role="tablist" aria-label="Ubicaciones">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'inventory'}
          className={view === 'inventory' ? 'selected' : ''}
          onClick={() => setView('inventory')}
        >
          Existencias
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'transfers'}
          className={view === 'transfers' ? 'selected' : ''}
          onClick={() => setView('transfers')}
        >
          Traslados
        </button>
      </div>
      {view === 'inventory' && (
        <div className="location-workspace">
          <section className="location-directory" aria-label="Locales y depósitos">
            <h2>Locales y depósitos</h2>
            {locations.isPending && <PerlaLoading size="compact" label="Cargando ubicaciones…" />}
            {locations.data?.map((item) => (
              <div className="location-directory-row" key={item.id}>
                <button
                  className={selectedLocation?.id === item.id ? 'selected' : ''}
                  onClick={() => setSelected(item.id)}
                >
                  <Icon name="stock" size={20} />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.active ? (item.isDefault ? 'Principal' : item.code) : 'Inactiva'}
                    </small>
                  </span>
                </button>
                {canConfigure && (
                  <button
                    className="icon-button"
                    aria-label={`Editar ${item.name}`}
                    onClick={() => setEditor(item)}
                  >
                    <Icon name="edit" size={17} />
                  </button>
                )}
              </div>
            ))}
          </section>
          {selectedLocation && (
            <InventoryPane
              key={selectedLocation.id}
              location={selectedLocation}
              onLocationChange={setSelected}
              canTransfer={active.length >= 2 && selectedLocation.active}
              onTransfer={() => setDispatchOpen(true)}
            />
          )}
        </div>
      )}
      {view === 'transfers' && (
        <section className="dashboard-panel transfer-surface">
          <div className="dashboard-panel-heading">
            <h2>Traslados</h2>
            <span className="muted">
              {transfers.data?.length ?? '—'} traslados en esta vista · hasta 100
            </span>
          </div>
          <div className="export-filter-bar">
            <button
              className={`button ${transferStatus === 'IN_TRANSIT' ? 'primary' : 'secondary'} small`}
              aria-pressed={transferStatus === 'IN_TRANSIT'}
              onClick={() => setTransferStatus('IN_TRANSIT')}
            >
              <Icon name="stock" size={18} /> Por recibir
            </button>
            <label className="field">
              Estado de envíos
              <select
                value={transferStatus}
                onChange={(e) => setTransferStatus(e.target.value as typeof transferStatus)}
              >
                <option value="ALL">Todos</option>
                <option value="IN_TRANSIT">Por recibir</option>
                <option value="RECEIVED">Recibidos</option>
                <option value="CANCELLED">Cancelados</option>
              </select>
            </label>
            <SavedViews
              module="transfers"
              filters={{ status: transferStatus }}
              onApply={(filters) => {
                const value = scalarViewFilters(filters);
                setTransferStatus((value.status ?? 'ALL') as typeof transferStatus);
              }}
            />
            <ExportButton dataset="transfers" filters={{ status: transferStatus }} />
          </div>
          {transfers.isError ? (
            <div role="alert" className="alert error">
              {errorMessage(transfers.error)}
            </div>
          ) : transfers.isPending ? (
            <PerlaLoading size="compact" label="Cargando traslados…" />
          ) : transfers.data?.length ? (
            <div className="transfer-list">
              {transfers.data.map((item) => (
                <article key={item.id}>
                  <div className="transfer-number">
                    <strong>
                      {item.fromLocationName} → {item.toLocationName}
                    </strong>
                    <small>
                      N.º {item.number} · {new Date(item.dispatchedAt).toLocaleDateString('es-AR')}{' '}
                      · {item.items.length} productos
                    </small>
                  </div>
                  <span className={`transfer-status ${item.status.toLowerCase()}`}>
                    {labels[item.status]}
                  </span>
                  {item.status === 'IN_TRANSIT' ? (
                    <div className="row-actions">
                      <button
                        className="button quiet small"
                        onClick={() => setAction({ transfer: item, mode: 'cancel' })}
                      >
                        Cancelar
                      </button>
                      <button
                        className="button primary small"
                        onClick={() => setAction({ transfer: item, mode: 'receive' })}
                      >
                        Recibir
                      </button>
                    </div>
                  ) : (
                    <button
                      className="button secondary small"
                      onClick={() => setAction({ transfer: item, mode: 'receive' })}
                    >
                      Ver detalle
                    </button>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              {transferStatus === 'IN_TRANSIT'
                ? 'No hay traslados por recibir.'
                : transferStatus === 'ALL'
                  ? 'Todavía no hay traslados.'
                  : 'No hay traslados con este estado.'}
            </p>
          )}
        </section>
      )}
      {editor !== undefined && (
        <LocationDialog
          value={editor}
          onClose={() => setEditor(undefined)}
          onSaved={async () => {
            setEditor(undefined);
            await refresh();
          }}
        />
      )}
      {dispatchOpen && (
        <DispatchDialog
          locations={active}
          initialFrom={selectedLocation?.active ? selectedLocation.id : ''}
          onClose={() => setDispatchOpen(false)}
          onSaved={async () => {
            setDispatchOpen(false);
            setView('transfers');
            await refresh();
          }}
        />
      )}
      {action && (
        <TransferActionDialog
          {...action}
          onClose={() => setAction(undefined)}
          onSaved={async () => {
            setAction(undefined);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function InventoryPane({
  location,
  onLocationChange,
  canTransfer,
  onTransfer,
}: {
  location: Location;
  onLocationChange: (id: string) => void;
  canTransfer: boolean;
  onTransfer: () => void;
}) {
  const [query, setQuery] = useRememberedState('inventory', 'query', '');
  const [page, setPage] = useRememberedState('inventory', `page:${location.id}`, 0);
  const stock = useQuery({
    queryKey: ['location-inventory', location.id, query, page],
    queryFn: async () =>
      unwrap(
        await api().locations.inventory({
          locationId: location.id,
          query,
          limit: 20,
          offset: page * 20,
        }),
      ),
    retry: false,
  });
  return (
    <section className="dashboard-panel location-inventory">
      <div className="dashboard-panel-heading">
        <div>
          <h2>{location.name}</h2>
          <small>
            {location.code} · {stock.data?.total ?? '—'} artículos
          </small>
        </div>
        <button className="button secondary small" disabled={!canTransfer} onClick={onTransfer}>
          <Icon name="arrow" size={18} /> Trasladar desde aquí
        </button>
      </div>
      <div className="export-filter-bar">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            aria-label="Buscar stock en ubicación"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar artículo o código"
          />
        </label>
        <SavedViews
          module="inventory"
          filters={{ locationId: location.id, query }}
          onApply={(filters) => {
            const value = scalarViewFilters(filters);
            setQuery(value.query ?? '');
            setPage(0);
            if (value.locationId) onLocationChange(value.locationId);
          }}
        />
        <ExportButton dataset="inventory" filters={{ locationId: location.id, query }} />
      </div>
      {stock.isError && (
        <p role="alert">
          {errorMessage(stock.error)}{' '}
          <button onClick={() => void stock.refetch()}>Reintentar</button>
        </p>
      )}
      <div className="dashboard-table-scroll">
        <table>
          <thead>
            <tr>
              <th>Artículo</th>
              <th className="number">Existencia</th>
            </tr>
          </thead>
          <tbody>
            {stock.data?.items.map((item) => (
              <tr key={item.productId}>
                <td>
                  <strong>{item.name}</strong>
                  <small>{item.barcode ?? item.sku}</small>
                </td>
                <td className="number">
                  <strong className={item.quantityBase <= 0 ? 'stock-warning' : ''}>
                    {formatStock(item.quantityBase, item.unit)}
                  </strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {stock.isPending ? (
        <PerlaLoading size="compact" label="Consultando existencias…" />
      ) : stock.isFetching ? (
        <PerlaLoading size="inline" label="Actualizando existencias…" />
      ) : null}
      {stock.data?.total === 0 && <p>Sin artículos para esta búsqueda.</p>}
      {!!stock.data?.total && (
        <div className="table-pagination">
          <span>Página {page + 1}</span>
          <div className="row-actions">
            <button
              className="button secondary small"
              disabled={page === 0 || stock.isFetching}
              onClick={() => setPage((n) => n - 1)}
            >
              Anterior
            </button>
            <button
              className="button secondary small"
              disabled={!stock.data || (page + 1) * 20 >= stock.data.total || stock.isFetching}
              onClick={() => setPage((n) => n + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function LocationDialog({
  value,
  onClose,
  onSaved,
}: {
  value: Location | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(value?.name ?? '');
  const [code, setCode] = useState(value?.code ?? '');
  const [active, setActive] = useState(value?.active ?? true);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: () =>
      api()
        .locations.save({
          ...(value ? { id: value.id, expectedRevision: value.revision } : {}),
          name,
          code,
          active,
        })
        .then(unwrap),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      title={value ? 'Editar ubicación' : 'Nueva ubicación'}
      onClose={onClose}
      busy={save.isPending}
    >
      <form
        className="checkout-modal"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <fieldset disabled={save.isPending} className="plain-fields">
          <label className="field">
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Depósito central"
              required
              minLength={2}
              maxLength={80}
            />
          </label>
          <label className="field">
            Código corto
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              minLength={2}
              maxLength={24}
            />
          </label>
          {value && !value.isDefault && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              Ubicación activa
            </label>
          )}
        </fieldset>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            disabled={save.isPending}
            onClick={onClose}
          >
            Volver
          </button>
          <button className="button primary" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar ubicación'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function DispatchDialog({
  locations,
  initialFrom,
  onClose,
  onSaved,
}: {
  locations: Location[];
  initialFrom: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [from, setFrom] = useState(initialFrom || locations[0]!.id);
  const [to, setTo] = useState(
    locations.find((item) => item.id !== (initialFrom || locations[0]!.id))!.id,
  );
  const [lines, setLines] = useState<{ product: Product; amount: string }[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const balances = useQueries({
    queries: lines.map((line) => ({
      queryKey: ['location-inventory', from, 'product', line.product.id],
      queryFn: async () => {
        const page = unwrap(
          await api().locations.inventory({
            locationId: from,
            query: line.product.barcode ?? line.product.sku,
            limit: 100,
          }),
        );
        return page.items.find((item) => item.productId === line.product.id)?.quantityBase ?? 0;
      },
      retry: false,
      staleTime: 0,
      refetchOnMount: 'always' as const,
    })),
  });
  const invalid = lines.some((line, index) => {
    const value = parse(line.amount, line.product.saleUnit);
    return !canTransferQuantity(value, balances[index]);
  });
  const dispatch = useMutation({
    mutationFn: () =>
      api()
        .transfers.dispatch({
          operationKey: crypto.randomUUID(),
          fromLocationId: from,
          toLocationId: to,
          note,
          items: lines.map((line) => ({
            productId: line.product.id,
            quantityBase: parseQuantity(line.amount, line.product.saleUnit),
          })),
        })
        .then(unwrap),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      title="Nuevo traslado"
      onClose={onClose}
      busy={dispatch.isPending}
      wide
      className="marea-transfer-dialog"
    >
      <div className="checkout-modal">
        <fieldset disabled={dispatch.isPending} className="plain-fields">
          <div className="transfer-route">
            <label className="field">
              Desde
              <select
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  if (e.target.value === to)
                    setTo(locations.find((item) => item.id !== e.target.value)!.id);
                }}
              >
                {locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <Icon name="arrow" />
            <label className="field">
              Hacia
              <select value={to} onChange={(e) => setTo(e.target.value)}>
                {locations
                  .filter((item) => item.id !== from)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <EntityPicker<Product>
            label="Artículo para trasladar"
            queryKey="transfer-products"
            value={null}
            onChange={(product) => {
              if (product && !lines.some((line) => line.product.id === product.id))
                setLines((current) => [...current, { product, amount: '1' }]);
            }}
            load={async (query) =>
              unwrap(
                await api().products.search({
                  query,
                  status: 'ACTIVE',
                  activeOnly: true,
                  limit: 30,
                }),
              ).items.filter((item) => item.trackStock && item.stockInitialized)
            }
            detail={(item) => (item.saleUnit === 'KG' ? 'Por kilo' : (item.barcode ?? item.sku))}
          />
          <div className="transfer-lines">
            {lines.length === 0 && (
              <p className="empty-state">Elegí los artículos que vas a enviar.</p>
            )}
            {lines.map((line, index) => {
              const balance = balances[index];
              const amount = parse(line.amount, line.product.saleUnit);
              return (
                <article key={line.product.id}>
                  <div>
                    <strong>{line.product.name}</strong>
                    <small>
                      {balance?.isError
                        ? 'No se pudo consultar el stock'
                        : balance?.isFetching || balance?.data === undefined
                          ? 'Consultando stock…'
                          : `Disponible: ${formatStock(balance.data, line.product.saleUnit)}`}
                    </small>
                    {balance?.isError && (
                      <button
                        type="button"
                        className="button quiet small"
                        onClick={() => void balance.refetch()}
                      >
                        Reintentar disponibilidad
                      </button>
                    )}
                    {!balance?.isFetching &&
                      balance?.data !== undefined &&
                      amount !== null &&
                      amount > balance.data && (
                        <small className="stock-warning">Supera el stock del origen</small>
                      )}
                  </div>
                  <label className="field">
                    Enviar {line.product.saleUnit === 'KG' ? 'kg' : 'unidades'}
                    <input
                      aria-label={`Enviar ${line.product.name}`}
                      inputMode={line.product.saleUnit === 'KG' ? 'decimal' : 'numeric'}
                      value={line.amount}
                      onChange={(e) =>
                        setLines((current) =>
                          current.map((item) =>
                            item.product.id === line.product.id
                              ? { ...item, amount: e.target.value }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Quitar ${line.product.name}`}
                    onClick={() =>
                      setLines((current) =>
                        current.filter((item) => item.product.id !== line.product.id),
                      )
                    }
                  >
                    <Icon name="close" size={18} />
                  </button>
                </article>
              );
            })}
          </div>
          <details>
            <summary>Agregar una nota</summary>
            <label className="field">
              <span className="sr-only">Nota</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={240} />
            </label>
          </details>
        </fieldset>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <p role="status" className="transfer-summary">
          {lines.length} {lines.length === 1 ? 'artículo' : 'artículos'} ·{' '}
          {locations.find((item) => item.id === from)?.name} →{' '}
          {locations.find((item) => item.id === to)?.name}
        </p>
        <div className="dialog-actions">
          <button className="button secondary" disabled={dispatch.isPending} onClick={onClose}>
            Volver
          </button>
          <button
            className="button primary"
            disabled={dispatch.isPending || from === to || !lines.length || invalid}
            onClick={() => dispatch.mutate()}
          >
            {dispatch.isPending ? 'Despachando…' : 'Despachar traslado'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function TransferActionDialog({
  transfer,
  mode,
  onClose,
  onSaved,
}: {
  transfer: StockTransfer;
  mode: 'receive' | 'cancel';
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const closed = transfer.status !== 'IN_TRANSIT';
  const [received, setReceived] = useState(
    Object.fromEntries(
      transfer.items.map((item) => [item.productId, quantityInput(item.dispatchedBase, item.unit)]),
    ),
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const invalid = transfer.items.some((item) => {
    const amount = parse(received[item.productId] ?? '', item.unit);
    return amount === null || amount > item.dispatchedBase;
  });
  const mutation = useMutation({
    mutationFn: () =>
      mode === 'cancel'
        ? api()
            .transfers.cancel({
              transferId: transfer.id,
              operationKey: crypto.randomUUID(),
              reason,
            })
            .then(unwrap)
        : api()
            .transfers.receive({
              transferId: transfer.id,
              operationKey: crypto.randomUUID(),
              items: transfer.items.map((item) => ({
                productId: item.productId,
                receivedBase: parseQuantity(received[item.productId] ?? '0', item.unit),
              })),
            })
            .then(unwrap),
    onSuccess: onSaved,
    onError: (e) => setError(errorMessage(e)),
  });
  return (
    <Dialog
      title={
        closed
          ? `Traslado N.º ${transfer.number}`
          : mode === 'receive'
            ? 'Recibir mercadería'
            : 'Cancelar traslado'
      }
      onClose={onClose}
      busy={mutation.isPending}
      wide
    >
      <div className="checkout-modal">
        <div className="route-summary">
          <strong>{transfer.fromLocationName}</strong>
          <Icon name="arrow" />
          <strong>{transfer.toLocationName}</strong>
        </div>
        <fieldset className="plain-fields" disabled={mutation.isPending}>
          <div className="transfer-lines">
            {transfer.items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <small>Enviado: {formatStock(item.dispatchedBase, item.unit)}</small>
                </div>
                {closed ? (
                  <div>
                    <strong>
                      {transfer.status === 'CANCELLED'
                        ? 'Devuelto al origen'
                        : formatStock(item.receivedBase ?? 0, item.unit)}
                    </strong>
                    {item.differenceBase !== null && item.differenceBase > 0 && (
                      <small>Diferencia: {formatStock(item.differenceBase, item.unit)}</small>
                    )}
                  </div>
                ) : mode === 'receive' ? (
                  <label className="field">
                    Recibido {item.unit === 'KG' ? 'kg' : 'unidades'}
                    <input
                      inputMode={item.unit === 'KG' ? 'decimal' : 'numeric'}
                      value={received[item.productId] ?? ''}
                      onChange={(e) =>
                        setReceived((current) => ({
                          ...current,
                          [item.productId]: e.target.value,
                        }))
                      }
                    />
                  </label>
                ) : null}
              </article>
            ))}
          </div>
          {!closed && mode === 'cancel' && (
            <label className="field">
              Motivo
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={240}
              />
            </label>
          )}
        </fieldset>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" disabled={mutation.isPending} onClick={onClose}>
            Cerrar
          </button>
          {!closed && (
            <button
              className={`button ${mode === 'cancel' ? 'danger' : 'primary'}`}
              disabled={
                mutation.isPending || (mode === 'cancel' ? reason.trim().length < 3 : invalid)
              }
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending
                ? 'Guardando…'
                : mode === 'receive'
                  ? 'Confirmar recepción'
                  : 'Cancelar traslado'}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
