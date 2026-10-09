import { useState } from 'react';
import type { DraftRecord } from '../../../shared/catalog';
import { parseArs, moneyInput, formatMoney } from '../../../domain/values';
import { Dialog } from '../../components/Dialog';
import { errorMessage } from '../../api';
export function DiscountDialog({
  discount,
  onApply,
  onClose,
  automaticDiscountCents = 0,
  automaticPromotionNames = [],
}: {
  discount: DraftRecord['body']['discount'];
  onApply: (discount: DraftRecord['body']['discount']) => void;
  onClose: () => void;
  automaticDiscountCents?: number;
  automaticPromotionNames?: string[];
}) {
  const [type, setType] = useState(discount.type),
    [value, setValue] = useState(
      discount.type === 'NONE'
        ? '0'
        : moneyInput(discount.type === 'FIXED' ? discount.amountCents : discount.basisPoints),
    ),
    [error, setError] = useState('');
  return (
    <Dialog title="Descuento de la venta" onClose={onClose}>
      <form
        className="checkout-modal"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const amount = parseArs(value);
            onApply(
              type === 'NONE'
                ? { type }
                : type === 'FIXED'
                  ? { type, amountCents: amount }
                  : { type, basisPoints: amount },
            );
          } catch (failure) {
            setError(errorMessage(failure));
          }
        }}
      >
        {automaticDiscountCents > 0 && type !== 'NONE' && (
          <div className="manual-discount-warning" role="status">
            <strong>El carrito ya ahorra {formatMoney(automaticDiscountCents)}</strong>
            <span>{automaticPromotionNames.join(' · ')}</span>
            <small>Al aplicar este descuento manual, esas promociones se reemplazan.</small>
          </div>
        )}
        <label className="field">
          Tipo de descuento
          <select
            aria-label="Tipo de descuento"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            <option value="NONE">Sin descuento</option>
            <option value="PERCENT">Porcentaje</option>
            <option value="FIXED">Monto en pesos</option>
          </select>
        </label>
        {type !== 'NONE' && (
          <label className="field">
            Valor del descuento
            <input
              aria-label="Valor del descuento"
              inputMode="decimal"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              autoFocus
            />
            <small>
              {type === 'PERCENT' ? 'Porcentaje entre 0 y 100.' : 'Monto a descontar del subtotal.'}
            </small>
          </label>
        )}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" onClick={onClose}>
            Volver · Esc
          </button>
          <button className="button primary">Aplicar descuento</button>
        </div>
      </form>
    </Dialog>
  );
}
