import { PageHeading } from '../../components/PageHeader';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { Product } from '../../../shared/catalog';
import type { CommercialPage, CommercialFilter } from '../../../shared/commercial-control';
import { CommercialFilterSchema } from '../../../shared/commercial-control';
import { SavedViews } from '../../components/SavedViews';
import { api, errorMessage, unwrap } from '../../api';
import { formatMoney } from '../../../domain/values';
import { PromotionForm } from '../promotions/PromotionForm';
import { PriceBulkDialog } from '../products/PriceBulkDialog';
import { controlValue, downloadControlExcel } from './client';
const reasonLabels: Record<string, string> = {
  MISSING_COST: 'Costo faltante',
  COST_ABOVE_PRICE: 'Costo mayor al precio',
  LOW_MARGIN: 'Margen bajo',
  UPDATED_COST: 'Costo actualizado',
  STALE_PRICE: 'Precio sin revisar',
};
export function CommercialPanel({
  onBack,
  initial,
}: {
  onBack?: () => void;
  initial?: Record<string, unknown>;
}) {
  const [view, setView] = useState<'prices' | 'rotation'>(
    initial?.view === 'rotation' ? 'rotation' : 'prices',
  );
  const [filters, setFilters] = useState<CommercialFilter>({
    days: 60,
    productIds: typeof initial?.productId === 'string' ? [initial.productId] : [],
    categoryIds: [],
    brandIds: [],
    includeEmpty: false,
    page: 1,
    limit: 25,
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState('');
  const [promotion, setPromotion] = useState(false);
  const available = useQuery({
    queryKey: ['commercial-options'],
    queryFn: () =>
      controlValue<{ flags: Record<string, boolean>; locations: { id: string; name: string }[] }>(
        'commercial',
        'options',
      ),
    retry: false,
  });
  const [options, setOptions] = useState(false);
  const [margin, setMargin] = useState('20');
  const [stale, setStale] = useState('60');
  const data = useQuery({
    queryKey: ['control-commercial', view, filters],
    queryFn: () => controlValue<CommercialPage>('commercial', view, filters),
    retry: false,
  });
  const taxonomy = useQuery({
    queryKey: ['product-taxonomy'],
    queryFn: () => api().products.taxonomy({}).then(unwrap),
    retry: false,
  });
  function filter(patch: Partial<CommercialFilter>) {
    setFilters((f) => ({ ...f, ...patch, page: 1 }));
    setSelected([]);
  }
  const review = useMutation({
    mutationFn: () =>
      controlValue('commercial', 'review', {
        operationKey: crypto.randomUUID(),
        items: data
          .data!.items.filter((i) => selected.includes(i.productId))
          .map((i) => ({
            productId: i.productId,
            priceCents: i.priceCents,
            priceVersion: i.priceVersion,
            costRevision: i.costRevision,
          })),
      }),
    onSuccess: () => {
      setSelected([]);
      void data.refetch();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const prices = useMutation({
    mutationFn: () => Promise.all(selected.map((id) => api().products.get(id).then(unwrap))),
    onSuccess: setProducts,
    onError: (e) => setError(errorMessage(e)),
  });
  const settings = useMutation({
    mutationFn: () =>
      controlValue('commercial', 'settings', {
        expectedRevision: data.data!.settings.revision,
        marginBasisPoints: Math.round(Number(margin.replace(',', '.')) * 100),
        staleDays: Number(stale),
      }),
    onSuccess: () => {
      setOptions(false);
      void data.refetch();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const exportRows = useMutation({
    mutationFn: () => downloadControlExcel('commercial', { view, filters }),
    onError: (e) => setError(errorMessage(e)),
  });
  const busy = review.isPending || prices.isPending || settings.isPending;
  return (
    <>
      <PageHeading className="page-heading">
        <h1>Revisión de productos</h1>
        <SavedViews<{ view: 'prices' | 'rotation' } & CommercialFilter>
          module="commercial"
          filters={{ view, ...filters }}
          onApply={(saved) => {
            const { view: nextView, ...savedFilters } = saved;
            setView(nextView);
            setFilters({ ...CommercialFilterSchema.parse(savedFilters), page: 1 });
            setSelected([]);
          }}
        />
        {onBack && (
          <button className="button secondary" onClick={onBack}>
            Volver
          </button>
        )}
        <button
          className="button secondary"
          disabled={exportRows.isPending || data.isPending}
          onClick={() => exportRows.mutate()}
        >
          Descargar Excel
        </button>
      </PageHeading>
      <div className="segmented-control" role="group" aria-label="Vista comercial">
        <button
          disabled={available.data?.flags.COSTS_MARGIN === false}
          className={view === 'prices' ? 'active' : ''}
          onClick={() => {
            setView('prices');
            setSelected([]);
          }}
        >
          Precios para revisar
        </button>
        <button
          disabled={available.data?.flags.STOCK_CONTROL === false}
          className={view === 'rotation' ? 'active' : ''}
          onClick={() => {
            setView('rotation');
            setSelected([]);
          }}
        >
          Sin movimiento
        </button>
      </div>
      <section className="panel">
        {filters.productIds.length > 0 && (
          <div className="dialog-actions">
            <span>Producto del pendiente seleccionado</span>
            <button className="button secondary" onClick={() => filter({ productIds: [] })}>
              Ver todos
            </button>
          </div>
        )}
        <div className="movement-filters">
          <label className="field">
            Período
            <select
              value={filters.days}
              onChange={(e) => filter({ days: Number(e.target.value) as 30 | 60 | 90 })}
            >
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
            </select>
          </label>
          {available.data?.flags.LOCATIONS_TRANSFERS && (
            <label className="field">
              Ubicación
              <select
                value={filters.locationId ?? ''}
                onChange={(e) => filter({ locationId: e.target.value || undefined })}
              >
                <option value="">Todas las ubicaciones</option>
                {available.data.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <details>
            <summary>Categorías y marcas</summary>
            {(['categories', 'brands'] as const).map((kind) => (
              <fieldset key={kind}>
                <legend>{kind === 'categories' ? 'Categorías' : 'Marcas'}</legend>
                {taxonomy.data?.[kind]
                  .filter((t) => t.active)
                  .map((t) => {
                    const key = kind === 'categories' ? 'categoryIds' : 'brandIds';
                    return (
                      <label key={t.id}>
                        <input
                          type="checkbox"
                          checked={filters[key].includes(t.id)}
                          onChange={(e) =>
                            filter({
                              [key]: e.target.checked
                                ? [...filters[key], t.id]
                                : filters[key].filter((id) => id !== t.id),
                            })
                          }
                        />
                        {t.name}
                      </label>
                    );
                  })}
              </fieldset>
            ))}
          </details>
          {view === 'rotation' && (
            <label className="field">
              <input
                type="checkbox"
                checked={filters.includeEmpty}
                onChange={(e) => filter({ includeEmpty: e.target.checked })}
              />
              Incluir artículos sin stock
            </label>
          )}
          {view === 'prices' && (
            <button
              className="button secondary"
              onClick={() => {
                setMargin(String((data.data?.settings.marginBasisPoints ?? 2000) / 100));
                setStale(String(data.data?.settings.staleDays ?? 60));
                setOptions((v) => !v);
              }}
            >
              Criterios
            </button>
          )}
        </div>
        {options && (
          <div className="movement-filters">
            <label className="field">
              Margen mínimo (%)
              <input
                inputMode="decimal"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
              />
            </label>
            <label className="field">
              Revisar después de (días)
              <input inputMode="numeric" value={stale} onChange={(e) => setStale(e.target.value)} />
            </label>
            <button
              className="button primary"
              disabled={busy || !data.data}
              onClick={() => settings.mutate()}
            >
              Guardar criterios
            </button>
          </div>
        )}
        {(error || data.isError) && (
          <div className="alert error" role="alert">
            {error || errorMessage(data.error)}
            <button
              className="button secondary"
              onClick={() => {
                setError('');
                void data.refetch();
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        <p>
          {data.data?.total ?? 0} productos · El margen previsto no incluye gastos, impuestos ni
          comisiones.
        </p>
        {selected.length > 0 && (
          <div className="dialog-actions">
            <span>{selected.length} seleccionados</span>
            <button className="button primary" disabled={busy} onClick={() => prices.mutate()}>
              Actualizar precios
            </button>
            {available.data?.flags.PROMOTIONS && (
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setPromotion(true)}
              >
                Preparar promoción
              </button>
            )}
            {view === 'prices' && (
              <button className="button secondary" disabled={busy} onClick={() => review.mutate()}>
                Conservar y marcar revisado
              </button>
            )}
          </div>
        )}
        <div className="preview-table" aria-busy={data.isFetching}>
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    aria-label="Seleccionar página"
                    checked={
                      !!data.data?.items.length && selected.length === data.data.items.length
                    }
                    onChange={(e) =>
                      setSelected(e.target.checked ? data.data!.items.map((i) => i.productId) : [])
                    }
                  />
                </th>
                <th>Producto</th>
                <th>{view === 'prices' ? 'Precio / costo' : 'Existencia / valor al costo'}</th>
                <th>{view === 'prices' ? 'Margen previsto' : 'Última venta'}</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.data?.items.map((i) => (
                <tr key={i.productId}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Seleccionar ${i.name}`}
                      checked={selected.includes(i.productId)}
                      onChange={(e) =>
                        setSelected((s) =>
                          e.target.checked
                            ? [...s, i.productId]
                            : s.filter((id) => id !== i.productId),
                        )
                      }
                    />
                  </td>
                  <td>
                    <strong>{i.name}</strong>
                    <small style={{ display: 'block' }}>
                      {i.lastPriceChange
                        ? `Precio actualizado: ${i.lastPriceChange.slice(0, 10)}`
                        : 'Fecha de precio no disponible'}
                    </small>
                  </td>
                  <td>
                    {view === 'prices' ? (
                      <>
                        {formatMoney(i.priceCents)}
                        <small style={{ display: 'block' }}>
                          {i.costCents === null
                            ? 'Costo faltante'
                            : `Costo: ${formatMoney(i.costCents)}`}{' '}
                          
                        </small>
                      </>
                    ) : (
                      <>
                        {i.unit === 'KG'
                          ? `${i.quantityBase / 1000} kg`
                          : `${i.quantityBase} unidades`}
                        <small style={{ display: 'block' }}>
                          {i.stockValueCents === null
                            ? 'Sin costo conocido'
                            : formatMoney(i.stockValueCents)}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    {view === 'prices' ? (
                      i.marginBasisPoints === null ? (
                        'Sin costo conocido'
                      ) : (
                        <>
                          {i.marginBasisPoints / 100}%
                          <details><summary>Ver costo y recargo</summary>
                          <p>{i.costOrigin === 'WEIGHTED_AVERAGE' ? 'Costo promedio de compras' : i.costOrigin === 'REFERENCE' ? 'Costo de referencia' : i.costOrigin ?? 'Origen no disponible'} · {i.costEffectiveAt?.slice(0, 10) ?? 'Fecha no disponible'}</p>
                          <small style={{ display: 'block' }}>
                            Recargo sobre costo:{' '}
                            {i.markupBasisPoints === null
                              ? 'Sin base'
                              : `${i.markupBasisPoints / 100}%`}
                          </small></details>
                        </>
                      )
                    ) : (
                      (i.lastSale ?? 'Nunca vendido')
                    )}
                  </td>
                  <td>
                    {view === 'prices'
                      ? i.reasons.map((r) => reasonLabels[r] ?? r).join(' · ')
                      : i.movementState === 'NEVER_SOLD'
                        ? 'Nunca vendido'
                        : 'Sin ventas recientes'}
                  </td>
                </tr>
              ))}
              {!data.data?.items.length && (
                <tr>
                  <td colSpan={5} className="empty-table">
                    {data.isPending
                      ? 'Cargando productos…'
                      : 'Sin productos pendientes con estos filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!!data.data?.total && <div className="dialog-footer">
          <button
            className="button secondary"
            disabled={filters.page === 1 || data.isFetching}
            onClick={() => {
              setFilters((f) => ({ ...f, page: f.page - 1 }));
              setSelected([]);
            }}
          >
            Anterior
          </button>
          <span>Página {filters.page}</span>
          <button
            className="button secondary"
            disabled={
              !data.data || filters.page * filters.limit >= data.data.total || data.isFetching
            }
            onClick={() => {
              setFilters((f) => ({ ...f, page: f.page + 1 }));
              setSelected([]);
            }}
          >
            Siguiente
          </button>
        </div>}
      </section>
      {promotion && (
        <PromotionForm
          promotion={null}
          initialProductIds={selected}
          onClose={() => setPromotion(false)}
        />
      )}
      {products && (
        <PriceBulkDialog
          products={products}
          onClose={() => setProducts(null)}
          onSaved={() => {
            setProducts(null);
            setSelected([]);
            void data.refetch();
          }}
        />
      )}
    </>
  );
}
