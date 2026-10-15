import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeading } from '../../components/PageHeader';
import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { StockBalance, StockSearchInput } from '../../../shared/stock';
import { formatStock, stockLabels } from '../../../domain/inventory';
import { api, errorMessage, unwrap } from '../../api';
import { MovementForm } from './MovementForm';
import { MovementHistory } from './MovementHistory';
import { Icon } from '../../components/Icon';
import { PendingMovement } from './PendingMovement';
import { LotManager } from './LotManager';

export function StockList({
  initialFilter = 'ALL',
  lotsEnabled = false,
  embedded = false,
}: {
  initialFilter?: StockSearchInput['filter'];
  lotsEnabled?: boolean;
  embedded?: boolean;
}) {
  const connected = true;
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useRememberedState('stock', 'search', '');
  const [query, setQuery] = useState(search);
  const [filter, setFilter] = useRememberedState<StockSearchInput['filter']>(
    'stock',
    'filter',
    initialFilter,
  );
  const [categoryId, setCategoryId] = useRememberedState('stock', 'categoryId', '');
  const [brandId, setBrandId] = useRememberedState('stock', 'brandId', '');
  const [pages, setPages] = useRememberedState<(string | undefined)[]>('stock', 'pages', [
    undefined,
  ]);
  const cursor = pages.at(-1);
  const [editor, setEditor] = useState<{ balance: StockBalance; mode: 'count' | 'record' } | null>(
    null,
  );
  const [history, setHistory] = useState<StockBalance | null>(null);
  const [lots, setLots] = useState<StockBalance | null>(null);
  const [notice, setNotice] = useState('');
  const [blocked, setBlocked] = useState(false);
  const stock = useQuery({
    queryKey: ['stock', 'list', query, filter, categoryId, brandId, cursor],
    queryFn: async () =>
      unwrap(
        await api().stock.search({
          query,
          filter: filter ?? 'ALL',
          limit: 50,
          ...(categoryId ? { categoryId } : {}),
          ...(brandId ? { brandId } : {}),
          ...(cursor ? { cursor } : {}),
        }),
      ),
    enabled: connected,
    retry: false,
  });
  const taxonomy = useQuery({
    queryKey: ['product-taxonomy'],
    queryFn: async () => unwrap(await api().products.taxonomy({})),
    retry: false,
  });
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 100);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (!editor && !history && !lots && event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [editor, history, lots]);
  function close() {
    setEditor(null);
    setHistory(null);
    setLots(null);
    requestAnimationFrame(() => searchRef.current?.focus());
  }
  function saved() {
    setNotice('Existencias actualizadas. El movimiento quedó registrado.');
    void client.invalidateQueries({ queryKey: ['stock'] });
    void client.invalidateQueries({ queryKey: ['products'] });
    close();
  }
  return (
    <>
      {connected && (
        <PendingMovement
          onBlocked={setBlocked}
          onResolved={() => {
            setNotice('Se resolvió el registro pendiente. Revisá las existencias y el historial.');
            void client.invalidateQueries({ queryKey: ['stock'] });
            void client.invalidateQueries({ queryKey: ['products'] });
          }}
        />
      )}
      {!embedded && (
        <PageHeading className="page-heading">
          <div>
            <h1>Stock</h1>
          </div>
        </PageHeading>
      )}
      {!connected && (
        <div className="alert info">
          Abrí la aplicación de escritorio para registrar existencias.
        </div>
      )}
      {stock.isError && (
        <div className="alert error" role="alert">
          {errorMessage(stock.error)}
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <Icon name="check" />
          <span>{notice}</span>
          <button className="icon-button" aria-label="Cerrar aviso" onClick={() => setNotice('')}>
            <Icon name="close" />
          </button>
        </div>
      )}
      <section className="catalog-card stock-card">
        <div className="catalog-toolbar">
          <div className="search-field">
            <Icon name="search" />
            <input
              type="search"
              ref={searchRef}
              aria-label="Buscar stock"
              placeholder="Buscar por nombre o código"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPages([undefined]);
              }}
            />
            <kbd>F2</kbd>
          </div>
          <label className="filter-label">
            Estado
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as StockSearchInput['filter']);
                setPages([undefined]);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="SHORTAGES">Para reponer</option>
              <option value="UNKNOWN">Sin conteo</option>
              <option value="OUT">Agotados</option>
              <option value="LOW">Bajo mínimo</option>
              <option value="NEGATIVE">Negativos</option>
              <option value="OK">Disponibles</option>
              <option value="DISABLED">Sin control</option>
            </select>
          </label>
          <label className="filter-label">
            Categoría
            <select
              value={categoryId}
              onChange={(event) => {
                setCategoryId(event.target.value);
                setPages([undefined]);
              }}
            >
              <option value="">Todas</option>
              {taxonomy.data?.categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-label">
            Marca
            <select
              value={brandId}
              onChange={(event) => {
                setBrandId(event.target.value);
                setPages([undefined]);
              }}
            >
              <option value="">Todas</option>
              {taxonomy.data?.brands.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <SavedViews
            module="stock"
            filters={{
              query: search,
              filter: filter ?? 'ALL',
              ...(categoryId ? { categoryId } : {}),
              ...(brandId ? { brandId } : {}),
            }}
            onApply={(filters) => {
              const value = scalarViewFilters(filters);
              setSearch(value.query ?? '');
              setQuery(value.query ?? '');
              setFilter((value.filter ?? 'ALL') as StockSearchInput['filter']);
              setCategoryId(value.categoryId ?? '');
              setBrandId(value.brandId ?? '');
              setPages([undefined]);
            }}
          />
          <ExportButton
            dataset="stock"
            filters={{
              query: search,
              filter: filter ?? 'ALL',
              ...(categoryId ? { categoryId } : {}),
              ...(brandId ? { brandId } : {}),
            }}
          />
        </div>
        <div className="catalog-summary">
          <span>
            <strong>
              {stock.data?.total.toLocaleString('es-AR') ?? (stock.isPending ? '…' : '0')}
            </strong>{' '}
            productos
          </span>
        </div>
        <div className={`table-scroll ${stock.isPlaceholderData ? 'refreshing' : ''}`}>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="numeric">Existencia</th>
                <th className="numeric">Mínimo</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(query === search ? stock.data?.items : [])?.map((balance) => (
                <tr key={balance.productId}>
                  <td>
                    <strong className="product-name">{balance.name}</strong>
                    <small>
                      {balance.sku} · {balance.unit === 'KG' ? 'Por kilo' : 'Por unidad'}
                    </small>
                  </td>
                  <td
                    data-label="Disponible"
                    className={`numeric stock-quantity ${balance.state === 'NEGATIVE' ? 'negative-value' : ''}`}
                  >
                    {!balance.trackStock
                      ? 'Sin control'
                      : !balance.initialized
                        ? 'Sin conteo'
                        : formatStock(balance.quantityBase, balance.unit)}
                  </td>
                  <td className="numeric stock-minimum" data-label="Mínimo">
                    {balance.trackStock ? formatStock(balance.minStockBase, balance.unit) : '—'}
                  </td>
                  <td>
                    <span className={`pill stock-state-${balance.state.toLowerCase()}`}>
                      {stockLabels[balance.state]}
                    </span>
                  </td>
                  <td>
                    <div className="stock-actions">
                      <button
                        className="button secondary small"
                        aria-label={`Contar ${balance.name}`}
                        disabled={!balance.trackStock || blocked}
                        onClick={() => setEditor({ balance, mode: 'count' })}
                      >
                        Contar stock
                      </button>
                      <button
                        className="button secondary small"
                        aria-label={`Registrar movimiento de ${balance.name}`}
                        title="Ingreso o merma"
                        disabled={!balance.trackStock || !balance.initialized || blocked}
                        onClick={() => setEditor({ balance, mode: 'record' })}
                      >
                        <Icon name="plus" size={17} />
                        Ingreso / merma
                      </button>
                      <button
                        className="button quiet small"
                        aria-label={`Ver movimientos de ${balance.name}`}
                        title="Ver historial"
                        onClick={() => setHistory(balance)}
                      >
                        <Icon name="history" size={17} />
                        Movimientos
                      </button>
                      {lotsEnabled && balance.trackStock && balance.initialized && (
                        <button
                          className="button secondary small"
                          aria-label={`Administrar lotes de ${balance.name}`}
                          onClick={() => setLots(balance)}
                        >
                          Lotes
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!stock.data?.items.length && !stock.isError && (
                <tr>
                  <td colSpan={5} className="empty-table">
                    {connected && stock.isPending
                      ? (<PerlaLoading size="compact" label="Cargando existencias…" />)
                      : filter === 'SHORTAGES' && !query && !categoryId && !brandId
                        ? 'No hay productos para reponer.'
                        : query || filter !== 'ALL' || categoryId || brandId
                          ? 'No hay productos con este filtro.'
                          : 'Cargá productos para comenzar el control de stock.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!!stock.data?.total && (
          <div className="catalog-bottom">
            <div className="pagination">
              <span>Página {pages.length}</span>
              <button
                className="button secondary small"
                disabled={pages.length === 1 || stock.isFetching || query !== search}
                onClick={() => setPages(pages.slice(0, -1))}
              >
                Anterior
              </button>
              <button
                className="button secondary small"
                disabled={
                  !stock.data?.nextCursor ||
                  stock.isFetching ||
                  stock.isPlaceholderData ||
                  query !== search
                }
                onClick={() => setPages([...pages, stock.data!.nextCursor!])}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>
      <div className="page-footnote">
        <span>
          <kbd>F2</kbd> Buscar <kbd>Esc</kbd> Volver
        </span>
      </div>
      {editor && (
        <MovementForm balance={editor.balance} mode={editor.mode} onClose={close} onSaved={saved} />
      )}
      {history && <MovementHistory balance={history} onClose={close} />}
      {lots && <LotManager balance={lots} onClose={close} />}
    </>
  );
}
