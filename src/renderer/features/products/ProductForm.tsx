import { TaxonomyCreateDialog } from './TaxonomyManager';
import { EntityActivity } from '../../components/EntityActivity';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FormEvent, KeyboardEvent } from 'react';
import type { Product } from '../../../shared/catalog';
import { ProductSaveSchema } from '../../../shared/catalog';
import { parseArs, parseQuantity, moneyInput, quantityInput } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';
import { ZodError } from 'zod';

export function ProductForm({
  product,
  onClose,
  onSaved,
  onSaveAnother,
  costsEnabled,
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
  onSaveAnother?: (product: Product) => void;
  costsEnabled: boolean;
}) {
  const [taxonomyCreate, setTaxonomyCreate] = useState<'category' | 'brand' | null>(null);
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? '');
  const [brandId, setBrandId] = useState(product?.brandId ?? '');
  const [extrasOpen, setExtrasOpen] = useState(Boolean(product));
  const [unit, setUnit] = useState<'UNIT' | 'KG'>(product?.saleUnit ?? 'UNIT');
  const generatedSku = useRef(`ART-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  const formRef = useRef<HTMLFormElement>(null);
  const [notice, setNotice] = useState('');
  const [savedDraft, setSavedDraft] = useState<Product | null>(null);
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
    const another =
      !product &&
      Boolean(onSaveAnother) &&
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute('name') === 'saveAnother';
    setError('');
    setNotice('');
    try {
      const currentProduct = savedDraft ?? product;
      const barcode = String(data.get('barcode') ?? '').trim() || null;
      const sku =
        String(data.get('sku') ?? '').trim() ||
        currentProduct?.sku ||
        barcode ||
        generatedSku.current;
      const referenceCost = String(data.get('referenceCost') ?? '').trim();
      const referenceCostCents =
        costsEnabled && !trackStock && referenceCost ? parseArs(referenceCost) : null;
      if (referenceCostCents !== null && referenceCostCents <= 0)
        throw new Error('El costo de referencia debe ser mayor a cero.');
      const input = ProductSaveSchema.parse({
        ...(currentProduct
          ? { id: currentProduct.id, expectedRevision: currentProduct.revision }
          : {}),
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
      setSavedDraft(saved);
      if (referenceCostCents !== null)
        unwrap(
          await api().costs.setReference({
            productId: saved.id,
            unitCostCents: referenceCostCents,
            expectedRevision: cost.data?.revision ?? 0,
          }),
        );
      if (another) {
        onSaveAnother!(saved);
        setSavedDraft(null);
        generatedSku.current = `ART-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
        for (const name of ['name', 'price', 'barcode', 'sku', 'referenceCost']) {
          const field = formRef.current?.elements.namedItem(name);
          if (field instanceof HTMLInputElement) field.value = '';
        }
        setNotice(`${saved.name}: guardado. Podés cargar el siguiente.`);
        requestAnimationFrame(() =>
          formRef.current?.querySelector<HTMLInputElement>('[name="name"]')?.focus(),
        );
      } else onSaved(saved);
    } catch (failure) {
      if (failure instanceof ZodError) {
        const issue = failure.issues[0];
        setError(issue?.message ?? 'Revisá los datos del producto.');
        const names: Record<string, string> = { priceCents: 'price', minStockBase: 'minimum' };
        const path = String(issue?.path[0] ?? '');
        const name = names[path] ?? path;
        if (['minimum', 'sku'].includes(name)) setExtrasOpen(true);
        requestAnimationFrame(() => {
          const field = formRef.current?.elements.namedItem(name);
          if (field instanceof HTMLElement) field.focus();
        });
      } else setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  function keyboard(event: KeyboardEvent<HTMLFormElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      if (!busy) event.currentTarget.requestSubmit();
      return;
    }
    if (
      event.key === 'Enter' &&
      !event.nativeEvent.isComposing &&
      event.target instanceof HTMLInputElement &&
      event.target.type !== 'checkbox'
    ) {
      event.preventDefault();
      const fields = Array.from(event.currentTarget.elements).filter(
        (item): item is HTMLInputElement | HTMLSelectElement =>
          (item instanceof HTMLInputElement || item instanceof HTMLSelectElement) &&
          !item.disabled &&
          item.type !== 'checkbox' &&
          !item.closest('details:not([open])') &&
          item.getClientRects().length > 0,
      );
      const index = fields.indexOf(event.target);
      const next = fields[index + 1];
      if (next) next.focus();
      else
        event.currentTarget
          .querySelector<HTMLButtonElement>('button[type="submit"].primary')
          ?.focus();
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
        <form
          ref={formRef}
          className="product-form"
          onSubmit={(event) => void save(event)}
          onKeyDown={keyboard}
        >
          <div className="dialog-body">
            {notice && (
              <p className="product-save-notice" role="status">
                <Icon name="check" />
                {notice}
              </p>
            )}
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
                <div className="form-grid product-price-row">
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
                </div>
                <label className="field">
                  Código de barras
                  <input
                    name="barcode"
                    aria-label="Código de barras"
                    maxLength={64}
                    defaultValue={product?.barcode ?? ''}
                    placeholder="Escaneá el código del envase"
                    autoComplete="off"
                  />
                  {!product && <small>Sin código: Perla genera uno al guardar.</small>}
                </label>
              </div>
              <details
                className="product-options"
                open={extrasOpen}
                onToggle={(event) => setExtrasOpen(event.currentTarget.open)}
              >
                <summary>
                  <span>Más opciones</span>
                  <small>Clasificación y control de stock</small>
                  <Icon name="arrow" />
                </summary>
                <div className="product-options-body">
                  <div className="form-grid">
                    <div className="product-taxonomy-field">
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
                      <button
                        type="button"
                        className="button quiet small"
                        onClick={() => setTaxonomyCreate('category')}
                      >
                        <Icon name="plus" />
                        Nueva categoría
                      </button>
                    </div>
                    <div className="product-taxonomy-field">
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
                      <button
                        type="button"
                        className="button quiet small"
                        onClick={() => setTaxonomyCreate('brand')}
                      >
                        <Icon name="plus" />
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
          <div className="dialog-footer product-form-footer">
            <span className="shortcut-note">Ctrl + S para guardar</span>
            <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            {!product && onSaveAnother && (
              <button type="submit" name="saveAnother" className="button secondary" disabled={busy}>
                Guardar y cargar otro
              </button>
            )}
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
