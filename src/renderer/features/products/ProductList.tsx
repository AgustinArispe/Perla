import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product, ImportPreview as Preview } from '../../../shared/catalog';
import { formatMoney } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import { ProductForm } from './ProductForm';
import { ImportPreview } from './ImportPreview';
import { TaxonomyManager } from './TaxonomyManager';
import { Dialog } from '../../components/Dialog';
import type { FeatureStatus } from '../../../shared/features';
import { webValue } from '../../web-client';
import { PriceBulkDialog } from './PriceBulkDialog';

export function ProductList({ canChangePrices = false }: { canChangePrices?: boolean }) {
  const connected = true;
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useRememberedState('products', 'search', '');
  const [query, setQuery] = useState(search);
  const [status, setStatus] = useRememberedState<'ALL' | 'ACTIVE' | 'INACTIVE'>(
    'products',
    'status',
    'ALL',
  );
  const [categoryId, setCategoryId] = useRememberedState('products', 'categoryId', '');
  const [brandId, setBrandId] = useRememberedState('products', 'brandId', '');
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);
  const [labelsOpen, setLabelsOpen] = useState(false);
  const [pages, setPages] = useRememberedState<(string | undefined)[]>('products', 'pages', [
    undefined,
  ]);
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [format, setFormat] = useState(false);
  const [selected, setSelected] = useState<Record<string, Product>>({});
  const [priceEditorOpen, setPriceEditorOpen] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 100);
    return () => clearTimeout(timer);
  }, [search]);
  const cursor = pages.at(-1);
  const products = useQuery({
    queryKey: ['products', query, status, categoryId, brandId, cursor],
    queryFn: async () =>
      unwrap(
        await api().products.search({
          query,
          status,
          activeOnly: false,
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
  const features = useQuery({
    queryKey: ['business-features'],
    queryFn: () => webValue<FeatureStatus>('/settings/features'),
    retry: false,
  });
  const labelsEnabled = features.data?.enabled.PRODUCT_LABELS ?? true;
  const costsEnabled = features.data?.enabled.COSTS_MARGIN ?? false;
  const labels = useQuery({
    queryKey: ['product-labels'],
    queryFn: async () => unwrap(await api().products.labels({ status: 'PENDING' })),
    enabled: labelsOpen && labelsEnabled,
    retry: false,
  });
  const toggle = useMutation({
    mutationFn: async (product: Product) =>
      unwrap(
        await api().products.setActive({
          productId: product.id,
          active: !product.active,
          expectedRevision: product.revision,
        }),
      ),
    onSuccess: (product) => {
      void client.invalidateQueries({ queryKey: ['products'] });
      setNotice(`${product.name}: ${product.active ? 'activado' : 'desactivado'}.`);
      setError('');
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const importFile = useMutation({
    mutationFn: async () => unwrap(await api().products.previewImport()),
    onSuccess: (value) => {
      if (value) setPreview(value);
      setError('');
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const createLabel = useMutation({
    mutationFn: async (productId: string) =>
      unwrap(await api().products.createLabel({ productId })),
    onSuccess: (label) => {
      setNotice(`Etiqueta para ${label.productName} lista para imprimir.`);
      setError('');
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const markLabelPrinted = useMutation({
    mutationFn: async (labelId: string) =>
      unwrap(await api().products.markLabelPrinted({ labelId })),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['product-labels'] });
      setNotice('Etiqueta marcada como impresa.');
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const modalOpen = editor !== undefined || Boolean(preview) || taxonomyOpen || priceEditorOpen;
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (modalOpen) return;
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === 'F3' && connected) {
        event.preventDefault();
        setEditor(null);
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [modalOpen, connected]);
  function restoreFocus() {
    requestAnimationFrame(() => searchRef.current?.focus());
  }
  function closeEditor() {
    setEditor(undefined);
    restoreFocus();
  }
  function closePreview() {
    setPreview(null);
    restoreFocus();
  }
  return (
    <>
      <div className="page-heading product-page-heading">
        <div>
          <h1>Productos</h1>
        </div>
        <div className="heading-actions">
          {canChangePrices && (
            <button
              className="button secondary"
              disabled={!Object.keys(selected).length}
              onClick={() => setPriceEditorOpen(true)}
            >
              Actualizar precios
              {Object.keys(selected).length ? ` (${Object.keys(selected).length})` : ''}
            </button>
          )}
          <button className="button secondary" onClick={() => setTaxonomyOpen(true)}>
            Categorías y marcas
          </button>
          {labelsEnabled && (
            <button className="button secondary" onClick={() => setLabelsOpen(true)}>
              Etiquetas{labels.data?.total ? ` (${labels.data.total})` : ''}
            </button>
          )}
          <button
            className="button secondary"
            disabled={!connected || importFile.isPending}
            onClick={() => importFile.mutate()}
            aria-label="Importar productos"
          >
            <Icon name="upload" />
            {importFile.isPending ? 'Leyendo archivo…' : 'Importar productos'}
          </button>
          <button className="button primary" disabled={!connected} onClick={() => setEditor(null)}>
            <Icon name="plus" />
            Nuevo producto<kbd>F3</kbd>
          </button>
        </div>
      </div>
      {!connected && (
        <div className="alert info">
          Vista previa. Abrí la aplicación de escritorio para cargar y consultar los datos del
          negocio.
        </div>
      )}
      {notice && (
        <div className="notice" role="status">
          <Icon name="check" size={18} />
          {notice}
          <button className="icon-button" aria-label="Ocultar aviso" onClick={() => setNotice('')}>
            <Icon name="close" size={18} />
          </button>
        </div>
      )}
      {(error || products.isError) && (
        <div className="alert error" role="alert">
          {error || errorMessage(products.error)}{' '}
          <button
            className="text-button"
            onClick={() => {
              setError('');
              void products.refetch();
            }}
          >
            Recargar productos
          </button>
        </div>
      )}
      <section className="catalog-card" aria-label="Catálogo de productos">
        <div className="catalog-toolbar">
          <div className="search-field">
            <Icon name="search" />
            <input
              ref={searchRef}
              type="search"
              aria-label="Buscar productos"
              placeholder="Buscar por nombre, código o código interno"
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
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPages([undefined]);
              }}
            >
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
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
            module="products"
            filters={{
              query: search,
              status,
              ...(categoryId ? { categoryId } : {}),
              ...(brandId ? { brandId } : {}),
            }}
            onApply={(filters) => {
              const value = scalarViewFilters(filters);
              setSearch(value.query ?? '');
              setQuery(value.query ?? '');
              setStatus((value.status ?? 'ALL') as typeof status);
              setCategoryId(value.categoryId ?? '');
              setBrandId(value.brandId ?? '');
              setPages([undefined]);
            }}
          />
          <ExportButton
            dataset="products"
            selectedIds={Object.keys(selected)}
            filters={{
              query: search,
              status,
              ...(categoryId ? { categoryId } : {}),
              ...(brandId ? { brandId } : {}),
            }}
          />
        </div>
        <div className="catalog-summary">
          <span>
            <strong>
              {products.data?.total.toLocaleString('es-AR') ?? (products.isPending ? '…' : '0')}
            </strong>{' '}
            productos
            {query ? ' encontrados' : ' en el catálogo'}
          </span>
          <span aria-live="polite">{products.isFetching ? 'Buscando…' : ''}</span>
        </div>
        {Object.keys(selected).length > 0 && (
          <div className="catalog-selection-bar" role="status">
            <strong>
              {Object.keys(selected).length}{' '}
              {Object.keys(selected).length === 1
                ? 'producto seleccionado'
                : 'productos seleccionados'}
            </strong>
            <span>Podés seguir buscando: tu selección se conserva.</span>
            <button className="button secondary" onClick={() => setSelected({})}>
              Limpiar selección
            </button>
          </div>
        )}
        <div className={`table-scroll ${products.isPlaceholderData ? 'refreshing' : ''}`}>
          <table>
            <thead>
              <tr>
                {
                  <th className="selection-cell">
                    <input
                      type="checkbox"
                      aria-label="Seleccionar productos de esta página"
                      checked={
                        Boolean(products.data?.items.length) &&
                        products.data!.items.every((product) => selected[product.id])
                      }
                      disabled={products.isFetching || query !== search}
                      onChange={(event) =>
                        setSelected((current) => {
                          const next = { ...current };
                          for (const product of products.data?.items ?? []) {
                            if (event.target.checked) next[product.id] = product;
                            else delete next[product.id];
                          }
                          if (Object.keys(next).length > 5000) return current;
                          return next;
                        })
                      }
                    />
                  </th>
                }
                <th>Producto</th>
                <th>Código de barras</th>
                <th>Venta</th>
                <th className="numeric">Precio</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {(query === search ? products.data?.items : [])?.map((product) => (
                <tr
                  key={product.id}
                  className={selected[product.id] ? 'catalog-row-selected' : undefined}
                >
                  {
                    <td className="selection-cell">
                      <input
                        type="checkbox"
                        aria-label={`Seleccionar ${product.name}`}
                        checked={Boolean(selected[product.id])}
                        disabled={!selected[product.id] && Object.keys(selected).length >= 5000}
                        onChange={(event) =>
                          setSelected((current) => {
                            const next = { ...current };
                            if (event.target.checked) next[product.id] = product;
                            else delete next[product.id];
                            return next;
                          })
                        }
                      />
                    </td>
                  }
                  <td>
                    <strong>{product.name}</strong>
                    <small>
                      {product.sku}
                      {product.category ? ` · ${product.category}` : ''}
                      {product.brand ? ` · ${product.brand}` : ''}
                    </small>
                  </td>
                  <td className="barcode">
                    {product.barcode ?? product.internalBarcode ?? (
                      <span className="muted">Sin código</span>
                    )}
                    {!product.barcode && product.internalBarcode && <small>Interno</small>}
                  </td>
                  <td>
                    <span className="pill unit-pill">
                      {product.saleUnit === 'KG' ? 'Por kilo' : 'Unidad'}
                    </span>
                  </td>
                  <td className="numeric product-price">{formatMoney(product.priceCents)}</td>
                  <td>
                    {labelsEnabled && product.internalBarcode && (
                      <button
                        className="edit-button"
                        aria-label={`Crear etiqueta para ${product.name}`}
                        disabled={createLabel.isPending}
                        onClick={() => createLabel.mutate(product.id)}
                      >
                        Etiqueta
                      </button>
                    )}
                    <button
                      className={`pill state-button ${product.active ? 'good' : ''}`}
                      aria-label={`${product.active ? 'Desactivar' : 'Activar'} ${product.name}`}
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(product)}
                    >
                      {product.active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td>
                    <button
                      className="edit-button"
                      aria-label={`Editar ${product.name}`}
                      onClick={() => setEditor(product)}
                    >
                      <Icon name="edit" size={20} />
                      <span>Editar</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.isPending && products.data?.items.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name={query ? 'search' : 'box'} size={34} />
              </div>
              <h2>
                {query || status !== 'ALL' || categoryId || brandId
                  ? 'No encontramos productos'
                  : 'Tu catálogo empieza acá'}
              </h2>
              <p>
                {query || status !== 'ALL' || categoryId || brandId
                  ? 'Probá con otro nombre o código, o cambiá el filtro de estado.'
                  : 'Agregá el primer producto o cargá el catálogo desde un archivo.'}
              </p>
              {!query && status === 'ALL' && !categoryId && !brandId && (
                <button
                  className="button primary"
                  disabled={!connected}
                  onClick={() => setEditor(null)}
                >
                  <Icon name="plus" />
                  Crear primer producto
                </button>
              )}
            </div>
          )}
          {!connected && (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="box" size={34} />
              </div>
              <h2>Catálogo conectado al escritorio</h2>
              <p>Los productos se guardan en la base local de la PC.</p>
            </div>
          )}
          {connected && products.isPending && (
            <div className="loading-state" role="status">
              Cargando catálogo…
            </div>
          )}
        </div>
        <div className="catalog-bottom">
          <button className="text-button" onClick={() => setFormat(!format)}>
            Formato para la carga inicial
          </button>
          {!!products.data?.total && (
            <div className="pagination">
              <span>Página {pages.length}</span>
              <button
                className="button secondary small"
                disabled={pages.length === 1 || products.isFetching || search !== query}
                onClick={() => setPages(pages.slice(0, -1))}
              >
                Anterior
              </button>
              <button
                className="button secondary small"
                disabled={
                  !products.data?.nextCursor ||
                  products.isFetching ||
                  products.isPlaceholderData ||
                  search !== query
                }
                onClick={() => setPages([...pages, products.data!.nextCursor!])}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </section>
      {format && (
        <div className="format-guide">
          <h3>Archivo de productos</h3>
          <p>
            CSV UTF-8, separado por punto y coma. Precio en pesos con coma decimal; el código de
            barras debe conservarse como texto.
          </p>
          <code>
            sku;barcode;nombre;precio_ars;unidad;activo;categoria;marca;stock_inicial;stock_minimo
          </code>
          <p>
            Unidad: UNIT o KG. Activo: si o no. Completá stock_inicial sólo con un conteo real, o
            dejalo vacío. Para cantidades por kilo usá 0,500 para medio kilo.
          </p>
        </div>
      )}
      {priceEditorOpen && (
        <PriceBulkDialog
          products={Object.values(selected)}
          onClose={() => setPriceEditorOpen(false)}
          onSaved={() => {
            setPriceEditorOpen(false);
            setSelected({});
            setNotice('Precios actualizados.');
          }}
        />
      )}
      <div className="page-footnote">
        <span>
          <kbd>F2</kbd> Buscar <kbd>F3</kbd> Nuevo <kbd>Esc</kbd> Volver
        </span>
      </div>
      {editor !== undefined && (
        <ProductForm
          product={editor}
          costsEnabled={costsEnabled}
          onClose={closeEditor}
          onSaveAnother={(product) => {
            setNotice(`${product.name}: guardado.`);
            void client.invalidateQueries({ queryKey: ['products'] });
            void client.invalidateQueries({ queryKey: ['product-labels'] });
          }}
          onSaved={(product) => {
            setNotice(`${product.name}: guardado.`);
            void client.invalidateQueries({ queryKey: ['products'] });
            closeEditor();
          }}
        />
      )}
      {preview && (
        <ImportPreview
          preview={preview}
          onClose={closePreview}
          onApplied={(result) => {
            setNotice(
              `${result.rowsApplied.toLocaleString('es-AR')} productos cargados${result.alreadyApplied ? ' anteriormente' : ''}.`,
            );
            void client.invalidateQueries({ queryKey: ['products'] });
            void client.invalidateQueries({ queryKey: ['stock'] });
            closePreview();
          }}
        />
      )}
      {taxonomyOpen && (
        <TaxonomyManager
          onClose={() => {
            setTaxonomyOpen(false);
            restoreFocus();
          }}
        />
      )}
      {labelsOpen && (
        <Dialog
          title="Etiquetas pendientes"
          onClose={() => {
            setLabelsOpen(false);
            restoreFocus();
          }}
          wide
        >
          <div className="dialog-body">
            {labels.isPending && <p>Cargando etiquetas…</p>}
            {labels.isError && <div className="alert error">{errorMessage(labels.error)}</div>}
            {!labels.isPending && !labels.data?.items.length && <p>No hay etiquetas pendientes.</p>}
            <div className="receipt-items">
              {labels.data?.items.map((label) => (
                <div key={label.id}>
                  <span>
                    <strong>{label.productName}</strong>
                    <small>{label.barcode}</small>
                  </span>
                  <button
                    className="button secondary small"
                    disabled={markLabelPrinted.isPending}
                    onClick={() => markLabelPrinted.mutate(label.id)}
                  >
                    Marcar impresa
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
