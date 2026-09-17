import { useEffect, useRef, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product, ImportPreview as Preview } from '../../../shared/catalog';
import { formatMoney } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import { ProductForm } from './ProductForm';
import { ImportPreview } from './ImportPreview';

export function ProductList() {
  const desktop = Boolean(window.bocha);
  const client = useQueryClient();
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [pages, setPages] = useState<(string | undefined)[]>([undefined]);
  const [editor, setEditor] = useState<Product | null | undefined>(undefined);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [format, setFormat] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search), 100);
    return () => clearTimeout(timer);
  }, [search]);
  const cursor = pages.at(-1);
  const products = useQuery({
    queryKey: ['products', query, status, cursor],
    queryFn: async () =>
      unwrap(
        await api().products.search({
          query,
          status,
          activeOnly: false,
          limit: 50,
          ...(cursor ? { cursor } : {}),
        }),
      ),
    enabled: desktop,
    placeholderData: keepPreviousData,
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
  const modalOpen = editor !== undefined || Boolean(preview);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (modalOpen) return;
      if (event.key === 'F2') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
      if (event.key === 'F3' && desktop) {
        event.preventDefault();
        setEditor(null);
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [modalOpen, desktop]);
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
      <div className="page-heading">
        <div>
          <span className="eyebrow">CATÁLOGO DEL ALMACÉN</span>
          <h1>Productos</h1>
          <p>Precios, códigos y formas de venta.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            disabled={!desktop || importFile.isPending}
            onClick={() => importFile.mutate()}
            aria-label="Importar productos"
          >
            <Icon name="upload" />
            {importFile.isPending ? 'Leyendo archivo…' : 'Importar productos'}
          </button>
          <button className="button primary" disabled={!desktop} onClick={() => setEditor(null)}>
            <Icon name="plus" />
            Nuevo producto<kbd>F3</kbd>
          </button>
        </div>
      </div>
      {!desktop && (
        <div className="alert info">
          Vista previa. Abrí la aplicación de escritorio para cargar y consultar los datos del
          almacén.
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
        </div>
        <div className="catalog-summary">
          <span>
            <strong>{products.data?.total.toLocaleString('es-AR') ?? '0'}</strong> productos
            {query ? ' encontrados' : ' en el catálogo'}
          </span>
          <span aria-live="polite">
            {products.isFetching ? 'Buscando…' : 'Precio en pesos argentinos'}
          </span>
        </div>
        <div className={`table-scroll ${products.isPlaceholderData ? 'refreshing' : ''}`}>
          <table>
            <thead>
              <tr>
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
              {products.data?.items.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                    <small>
                      {product.sku}
                      {product.category ? ` · ${product.category}` : ''}
                    </small>
                  </td>
                  <td className="barcode">
                    {product.barcode ?? <span className="muted">Sin código</span>}
                  </td>
                  <td>
                    <span className="pill unit-pill">
                      {product.saleUnit === 'KG' ? 'Por kilo' : 'Unidad'}
                    </span>
                  </td>
                  <td className="numeric product-price">{formatMoney(product.priceCents)}</td>
                  <td>
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
                {query || status !== 'ALL' ? 'No encontramos productos' : 'Tu catálogo empieza acá'}
              </h2>
              <p>
                {query || status !== 'ALL'
                  ? 'Probá con otro nombre o código, o cambiá el filtro de estado.'
                  : 'Agregá el primer producto o cargá el catálogo desde un archivo.'}
              </p>
              {!query && status === 'ALL' && (
                <button
                  className="button primary"
                  disabled={!desktop}
                  onClick={() => setEditor(null)}
                >
                  <Icon name="plus" />
                  Crear primer producto
                </button>
              )}
            </div>
          )}
          {!desktop && (
            <div className="empty-state">
              <div className="empty-icon">
                <Icon name="box" size={34} />
              </div>
              <h2>Catálogo conectado al escritorio</h2>
              <p>Los productos se guardan en la base local de la PC.</p>
            </div>
          )}
          {desktop && products.isPending && (
            <div className="loading-state" role="status">
              Cargando catálogo…
            </div>
          )}
        </div>
        <div className="catalog-bottom">
          <button className="text-button" onClick={() => setFormat(!format)}>
            Formato para la carga inicial
          </button>
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
            sku;barcode;nombre;precio_ars;unidad;activo;categoria;stock_inicial;stock_minimo
          </code>
          <p>
            Unidad: UNIT o KG. Activo: si o no. Dejá stock_inicial vacío; para mínimos por kilo usá
            0,500 para medio kilo.
          </p>
        </div>
      )}
      <div className="page-footnote">
        <span>Las bajas se hacen desactivando productos.</span>
        <span>
          <kbd>F2</kbd> Buscar <kbd>F3</kbd> Nuevo <kbd>Esc</kbd> Volver
        </span>
      </div>
      {editor !== undefined && (
        <ProductForm
          product={editor}
          onClose={closeEditor}
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
            closePreview();
          }}
        />
      )}
    </>
  );
}
