import { PerlaLoading } from '../../components/PerlaLoading';
import { useEffect, useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '../../../shared/catalog';
import { formatMoney } from '../../../domain/values';
import { Dialog } from '../../components/Dialog';
import { api, unwrap, errorMessage } from '../../api';
export function ProductSearch({
  weightOnly,
  onClose,
  onSelect,
}: {
  weightOnly: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const optionsId = useId();
  const products = useQuery({
    queryKey: ['checkout-products', query, weightOnly],
    queryFn: async () =>
      unwrap(
        await api().products.search({
          query,
          activeOnly: true,
          status: 'ACTIVE',
          limit: 20,
          ...(weightOnly ? { saleUnit: 'KG' as const } : {}),
        }),
      ),
    retry: false,
  });
  const items = products.data?.items.filter((p) => !weightOnly || p.saleUnit === 'KG') ?? [];
  const activeIndex = Math.min(selected, Math.max(0, items.length - 1));
  useEffect(() => {
    document.getElementById(`${optionsId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, optionsId, products.data]);
  return (
    <Dialog
      title={weightOnly ? 'Elegir producto por kilo' : 'Buscar producto'}
      onClose={onClose}
      wide
    >
      <div className="checkout-modal">
        <label className="field">
          Nombre o código
          <input
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls={optionsId}
            aria-autocomplete="list"
            autoComplete="off"
            aria-activedescendant={
              !products.isFetching && items[activeIndex] ? `${optionsId}-${activeIndex}` : undefined
            }
            aria-label="Nombre o código"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelected(0);
            }}
            maxLength={120}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                setSelected((index) =>
                  Math.max(
                    0,
                    Math.min(items.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)),
                  ),
                );
              }
              if (event.key === 'Enter' && items[activeIndex] && !products.isFetching) {
                event.preventDefault();
                onSelect(items[activeIndex]!);
              }
            }}
          />
        </label>
        {products.isError && (
          <div className="alert error" role="alert">
            {errorMessage(products.error)}
            <button
              type="button"
              className="button secondary"
              onClick={() => void products.refetch()}
            >
              Reintentar
            </button>
          </div>
        )}
        <div
          className="checkout-search-results"
          id={optionsId}
          aria-busy={products.isFetching}
          role="listbox"
          aria-label="Productos encontrados"
        >
          {items.map((product, index) => (
            <button
              type="button"
              tabIndex={-1}
              className={`search-product${activeIndex === index ? ' selected' : ''}`}
              id={`${optionsId}-${index}`}
              role="option"
              aria-selected={activeIndex === index}
              data-product-name={product.name}
              onMouseEnter={() => setSelected(index)}
              disabled={products.isFetching}
              key={product.id}
              onClick={() => onSelect(product)}
              aria-label={`Agregar ${product.name}`}
            >
              <span>
                <strong>{product.name}</strong>
                <small>
                  {product.barcode ?? product.sku}
                  {product.saleUnit === 'KG' ? ' · Por kilo' : ''}
                </small>
              </span>
              <strong>{formatMoney(product.priceCents)}</strong>
            </button>
          ))}
          {products.isFetching && <PerlaLoading size="inline" label="Buscando…" />}
          {!items.length && !products.isFetching && !products.isError && (
            <p role="status">No hay productos con esa búsqueda.</p>
          )}
        </div>
      </div>
    </Dialog>
  );
}
