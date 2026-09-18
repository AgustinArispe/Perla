import { useState } from 'react';
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
            aria-label="Nombre o código"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={120}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Enter' && items[0]) {
                event.preventDefault();
                onSelect(items[0]);
              }
            }}
          />
        </label>
        {products.isError && (
          <div className="alert error" role="alert">
            {errorMessage(products.error)}
          </div>
        )}
        <div className="checkout-search-results">
          {items.map((product) => (
            <button
              className="search-product"
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
          {!items.length && !products.isPending && <p>No hay productos con esa búsqueda.</p>}
        </div>
      </div>
    </Dialog>
  );
}
