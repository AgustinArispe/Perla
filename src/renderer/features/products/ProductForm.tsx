import { useState } from 'react';
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
}: {
  product: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}) {
  const [unit, setUnit] = useState<'UNIT' | 'KG'>(product?.saleUnit ?? 'UNIT');
  const [generatedSku] = useState(() => `ART-${crypto.randomUUID().slice(0, 8).toUpperCase()}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
        category: String(data.get('category') ?? '').trim() || null,
        priceCents: parseArs(String(data.get('price'))),
        saleUnit: unit,
        active: data.get('active') === 'on',
        trackStock: data.get('trackStock') === 'on',
        minStockBase: parseQuantity(String(data.get('minimum') || '0'), unit),
      });
      setBusy(true);
      onSaved(unwrap(await api().products.save(input)));
    } catch (failure) {
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
    <Dialog title={product ? 'Editar producto' : 'Nuevo producto'} onClose={onClose} busy={busy}>
      <form onSubmit={(event) => void save(event)} onKeyDown={keyboard}>
        <div className="dialog-body">
          <p className="form-intro">
            {product
              ? 'Actualizá los datos del catálogo.'
              : 'Cargá el nombre, el precio y la forma de venta.'}
          </p>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={busy}>
            <label className="field">
              Nombre del producto
              <input
                name="name"
                required
                minLength={2}
                maxLength={140}
                defaultValue={product?.name ?? ''}
                autoFocus
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Código de barras
                <input
                  name="barcode"
                  maxLength={64}
                  defaultValue={product?.barcode ?? ''}
                  placeholder="Escaneá o escribí el código"
                  autoComplete="off"
                />
                <small>Opcional para productos que se venden por peso.</small>
              </label>
              <label className="field">
                Código interno
                <input
                  name="sku"
                  maxLength={64}
                  defaultValue={product?.sku ?? ''}
                  placeholder="Se genera si lo dejás vacío"
                />
                <small>Identifica el producto dentro del almacén.</small>
              </label>
            </div>
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
                <small>
                  {unit === 'KG' ? 'Precio de 1 kilo, en pesos.' : 'Precio de 1 unidad, en pesos.'}
                </small>
              </label>
            </div>
            <label className="field">
              Categoría
              <input
                name="category"
                maxLength={80}
                defaultValue={product?.category ?? ''}
                placeholder="Ej.: Lácteos, Fiambres, Bebidas"
              />
            </label>
            <div className="form-section">
              <h3>Estado y reposición</h3>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="active"
                  aria-label="Activo"
                  defaultChecked={product?.active ?? true}
                />
                <span>Activo</span>
                <small>Disponible para la venta.</small>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  name="trackStock"
                  defaultChecked={product?.trackStock ?? true}
                />
                <span>Controlar stock</span>
              </label>
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
                <small>El conteo de existencias se hará desde Stock.</small>
              </label>
            </div>
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
    </Dialog>
  );
}
