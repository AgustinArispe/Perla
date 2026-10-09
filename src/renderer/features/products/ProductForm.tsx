import { TaxonomyCreateDialog } from './TaxonomyManager';
import { EntityActivity } from '../../components/EntityActivity';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Product } from '../../../shared/catalog';
import { ProductSaveSchema } from '../../../shared/catalog';
import { parseArs, parseQuantity, moneyInput, quantityInput } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

export function ProductForm({
  product,
  onClose,
  onSaved,
  costsEnabled,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
  costsEnabled: boolean;
}) {
  const [taxonomyCreate, setTaxonomyCreate] = useState<'category' | 'brand' | null>(null);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [brandId, setBrandId] = useState(product?.brandId ?? '');
  const [extrasOpen, setExtrasOpen] = useState(Boolean(product));
  const [unit, setUnit] = useState<'UNIT' | 'KG'>(product?.saleUnit ?? 'UNIT');
  const [generatedSku] = useState(() => `ART-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  const [busy, setBusy] = useState(false);
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? true);
  const [error, setError] = useState('');
  const taxonomy = useQuery({
    queryKey: ['product-taxonomy'],
    queryFn: async () => unwrap(await api().products.taxonomy({})),
    retry: false,
  });
  const cost = useQuery({
    queryKey: ['product-cost', product?.id],
    queryFn: async () => unwrap(await api().costs.get(product!.id)),
    enabled: costsEnabled && Boolean(product) && !trackStock,
    retry: false,
  });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      const barcode = String(data.get('barcode') ?? '').trim() || null;
      const sku = String(data.get('sku') ?? '').trim() || barcode || generatedSku;
      const input = ProductSaveSchema.parse({
        ...(product ? { id: product.id, expectedRevision: product.revision } : {}),
        sku,
        barcode,
        name: data.get('name'),
        category: null,
        categoryId: String(data.get('categoryId') ?? '') || null,
        brand: null,
        brandId: String(data.get('brandId') ?? '') || null,
        priceCents: parseArs(String(data.get('price'))),
        saleUnit: unit,
        active: data.get('active') === 'on',
        trackStock: data.get('trackStock') === 'on',
        minStockBase: parseQuantity(String(data.get('minimum') || '0'), unit),
      });
      setBusy(true);
      const saved = unwrap(await api().products.save(input));
      const referenceCost = String(data.get('referenceCost') ?? '').trim();
      if (costsEnabled && !trackStock && referenceCost)
        unwrap(
          await api().costs.setReference({
            productId: saved.id,
            unitCostCents: parseArs(referenceCost),
            expectedRevision: cost.data?.revision ?? 0,
          }),
        );
      onSaved(saved);
    } catch (failure) {
      setExtrasOpen(true);
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  function keyboard(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!busy) event.currentTarget.requestSubmit();
    }
  }
  return (
    <>
      <Dialog
        title={product ? 'Editar producto' : 'Nuevo producto'}
        onClose={onClose}
        busy={busy}
        className="product-dialog"
      >
        <form className="product-form" onSubmit={(event) => void save(event)} onKeyDown={keyboard}>
          <div className="dialog-body">
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <fieldset disabled={busy}>
              <div className="product-form-essential">
                <label className="field">
                  Nombre del producto
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={140}
                    defaultValue={product?.name ?? ''}
                    data-dialog-focus
                  />
                </label>
                <div className="form-grid">
                  <label className="field">
                    Forma de venta
                    <select
                      name="unit"
                      value={unit}
                      onChange={(event) => setUnit(event.target.value as 'UNIT' | 'KG')}
                    >
                      <option value="UNIT">Por unidad</option>
                      <option value="KG">Por kilo</option>
                    </select>
                  </label>
                  <label className="field">
                    Precio de venta
                    <div className="money-field">
                      <span>$</span>
                      <input
                        name="price"
                        inputMode="decimal"
                        required
                        defaultValue={product ? moneyInput(product.priceCents) : ''}
                        placeholder="0,00"
                      />
                    </div>
                    <small>{unit === 'KG' ? 'Precio por kilo' : 'Precio por unidad'}</small>
                  </label>
                </div>
                <label className="field">
                  Código de barras
                  <input
                    name="barcode"
                    maxLength={64}
                    defaultValue={product?.barcode ?? ''}
                    placeholder="Escaneá o dejalo vacío para generarlo"
                    autoComplete="off"
                  />
                  {!product && (
                    <small>
                      Si no tiene código de fábrica, se genera uno y queda una etiqueta pendiente.
                    </small>
                  )}
                </label>
              </div>
              <details
                className="product-options"
                open={extrasOpen}
                onToggle={(event) => setExtrasOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>Más opciones</span>
                  <small>Categoría, código interno y stock</small>
                </summary>
                <div className="product-options-body">
                  <div className="form-grid">
                    <label className="field">
                      Categoría
                      <select
                        name="categoryId"
                        value={categoryId}
                        onChange={(event) => setCategoryId(event.target.value)}
                      >
                        <option value="">Sin categoría</option>
                        {taxonomy.data?.categories.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="field">
                      Marca
                      <select
                        name="brandId"
                        value={brandId}
                        onChange={(event) => setBrandId(event.target.value)}
                      >
                        <option value="">Sin marca</option>
                        {taxonomy.data?.brands.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="product-taxonomy-actions">
                      <button
                        type="button"
                        className="button quiet small"
                        onClick={() => setTaxonomyCreate('category')}
                      >
                        Nueva categoría
                      </button>
                      <button
                        type="button"
                        className="button quiet small"
                        onClick={() => setTaxonomyCreate('brand')}
                      >
                        Nueva marca
                      </button>
                    </div>
                    <label className="field">
                      Código interno
                      <input
                        name="sku"
                        maxLength={64}
                        defaultValue={product?.sku ?? ''}
                        placeholder="Se genera si queda vacío"
                      />
                    </label>
                  </div>
                  <div className="product-form-switches">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        name="active"
                        aria-label="Activo"
                        defaultChecked={product?.active ?? true}
                      />
                      <span>Activo</span>
                    </label>
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        name="trackStock"
                        checked={trackStock}
                        onChange={(event) => setTrackStock(event.target.checked)}
                      />
                      <span>Controlar stock</span>
                    </label>
                  </div>
                  {costsEnabled && !trackStock && (
                    <label className="field minimum-field">
                      Costo de referencia ({unit === 'KG' ? 'por kilo' : 'por unidad'})
                      <div className="money-field">
                        <span>$</span>
                        <input
                          key={`${product?.id ?? 'new'}-${cost.data?.revision ?? 0}`}
                          name="referenceCost"
                          inputMode="decimal"
                          defaultValue={cost.data ? moneyInput(cost.data.unitCostCents) : ''}
                          placeholder="Sin costo"
                        />
                      </div>
                      <small>Estimación para calcular margen bruto.</small>
                    </label>
                  )}
                  <label className="field minimum-field">
                    Mínimo para reponer ({unit === 'KG' ? 'kg' : 'unidades'})
                    <input
                      key={unit}
                      name="minimum"
                      inputMode={unit === 'KG' ? 'decimal' : 'numeric'}
                      defaultValue={
                        product && product.saleUnit === unit
                          ? quantityInput(product.minStockBase, unit)
                          : '0'
                      }
                    />
                  </label>
                </div>
              </details>
            </fieldset>
          </div>
          <div className="dialog-footer">
            <span className="shortcut-note">Ctrl + S para guardar · Esc para volver</span>
            <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar producto'}
            </button>
          </div>
        </form>
        {product && <EntityActivity entityType="product" entityId={product.id} />}
      </Dialog>
      {taxonomyCreate && (
        <TaxonomyCreateDialog
          kind={taxonomyCreate}
          onClose={() => setTaxonomyCreate(null)}
          onCreated={(item) => {
            if (taxonomyCreate === 'category') setCategoryId(item.id);
            else setBrandId(item.id);
            setTaxonomyCreate(null);
          }}
        />
      )}
    </>
  );
}
