import { useState } from 'react';
import type { Product } from '../../../shared/catalog';
import { parseWeight } from '../../../domain/weight';
import { calculateSale } from '../../../domain/sale';
import { formatMoney, quantityInput } from '../../../domain/values';
import { Dialog } from '../../components/Dialog';
import { errorMessage } from '../../api';
export function WeightDialog({
  product,
  initialGrams,
  onClose,
  onConfirm,
}: {
  product: Product;
  initialGrams: number | null;
  onClose: () => void;
  onConfirm: (grams: number) => void;
}) {
  const [unit, setUnit] = useState<'GRAM' | 'KG'>('GRAM'),
    [value, setValue] = useState(initialGrams ? String(initialGrams) : ''),
    [error, setError] = useState('');
  let grams: number | null = null;
  try {
    grams = parseWeight(value, unit);
  } catch {
    /* Preview stays empty until weight is valid. */
  }
  let amount: number | null = null;
  try {
    if (grams !== null)
      amount = calculateSale(
        [{ unit: 'KG', priceCents: product.priceCents, quantityBase: grams }],
        { type: 'NONE' },
      ).totalCents;
  } catch {
    /* Invalid totals cannot be confirmed. */
  }
  return (
    <Dialog title={`Peso de ${product.name}`} onClose={onClose}>
      <form
        className="checkout-modal"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onConfirm(parseWeight(value, unit));
          } catch (failure) {
            setError(errorMessage(failure));
          }
        }}
      >
        <p className="price-per-kilo">{formatMoney(product.priceCents)} / kg</p>
        <div className="weight-fields">
          <label className="field">
            Peso
            <input
              aria-label="Peso"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
          </label>
          <label className="field">
            Unidad
            <select
              value={unit}
              onChange={(event) => {
                const next = event.target.value as 'GRAM' | 'KG';
                setValue(
                  grams === null
                    ? ''
                    : next === 'GRAM'
                      ? String(grams)
                      : quantityInput(grams, 'KG'),
                );
                setUnit(next);
              }}
            >
              <option value="GRAM">Gramos</option>
              <option value="KG">Kilos</option>
            </select>
          </label>
        </div>
        <div className="weight-preview">
          <span>{grams === null ? 'Ingresá el peso' : `${grams} gramos`}</span>
          <strong>{amount === null ? '—' : formatMoney(amount)}</strong>
        </div>
        <p className="capture-paused">Escaneo suspendido mientras ingresás el peso.</p>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Volver · Esc
          </button>
          <button className="button primary" disabled={amount === null}>
            Agregar peso · Enter
          </button>
        </div>
      </form>
    </Dialog>
  );
}
