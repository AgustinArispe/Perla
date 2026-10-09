import { useState } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { StockBalance } from '../../../shared/stock';
import { StockCountSchema, StockRecordSchema } from '../../../shared/stock';
import { formatStock } from '../../../domain/inventory';
import { parseQuantity, quantityInput } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';
import { savePending, clearPending } from './pending';
import type { PendingStock } from './pending';

export function MovementForm({
  balance,
  mode,
  onClose,
  onSaved,
}: {
  balance: StockBalance;
  mode: 'count' | 'record';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [operationKey] = useState(() => crypto.randomUUID());
  const [kind, setKind] = useState<'RECEIPT' | 'WASTE'>('RECEIPT');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [insufficient, setInsufficient] = useState(false);
  const [allowNegative, setAllowNegative] = useState(false);
  const [counted, setCounted] = useState(() =>
    mode === 'count' && balance.quantityBase !== null && balance.quantityBase >= 0
      ? quantityInput(balance.quantityBase, balance.unit)
      : '',
  );
  let countedBase: number | null = null;
  try {
    if (counted.trim()) countedBase = parseQuantity(counted, balance.unit);
  } catch {
    /* Wait for a valid quantity. */
  }
  const difference =
    countedBase !== null && balance.quantityBase !== null
      ? countedBase - balance.quantityBase
      : null;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setError('');
    try {
      const quantity = parseQuantity(String(data.get('quantity')), balance.unit);
      const base = {
        productId: balance.productId,
        operationKey,
        expectedRevision: balance.revision,
        expectedProductRevision: balance.productRevision,
        reason: String(data.get('reason')),
      };
      const pending: PendingStock =
        mode === 'count'
          ? {
              action: balance.initialized ? 'count' : 'opening',
              name: balance.name,
              input: StockCountSchema.parse({ ...base, countedBase: quantity }),
            }
          : {
              action: 'record',
              name: balance.name,
              input: StockRecordSchema.parse({
                ...base,
                kind,
                deltaBase: kind === 'WASTE' ? -quantity : quantity,
                allowNegative,
              }),
            };
      savePending(pending);
      setBusy(true);
      const result =
        pending.action === 'record'
          ? await api().stock.record(pending.input)
          : await api().stock[pending.action](pending.input);
      if (result.ok || !result.error.retryable) clearPending(operationKey);
      if (!result.ok && result.error.code === 'INSUFFICIENT_STOCK') setInsufficient(true);
      unwrap(result);
      onSaved();
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
    <Dialog
      title={
        mode === 'count'
          ? balance.initialized
            ? 'Contar existencias'
            : 'Conteo inicial'
          : 'Registrar movimiento'
      }
      onClose={onClose}
      busy={busy}
      className="stock-movement-dialog"
    >
      <form onSubmit={(event) => void save(event)} onKeyDown={keyboard}>
        <div className="dialog-body">
          <div className="stock-product-summary">
            <div>
              <h3>{balance.name}</h3>
              <span>
                {balance.sku} · {balance.unit === 'KG' ? 'Por kilo' : 'Por unidad'}
              </span>
            </div>
            <div>
              <small>Existencia actual</small>
              <strong>{formatStock(balance.quantityBase, balance.unit)}</strong>
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={busy}>
            {mode === 'record' && (
              <label className="field">
                Tipo de movimiento
                <select
                  aria-label="Tipo de movimiento"
                  value={kind}
                  onChange={(event) => {
                    setKind(event.target.value as 'RECEIPT' | 'WASTE');
                    setAllowNegative(false);
                    setInsufficient(false);
                    setError('');
                  }}
                >
                  <option value="RECEIPT">Ingreso de mercadería</option>
                  <option value="WASTE">Merma o pérdida</option>
                </select>
              </label>
            )}
            <label className="field">
              {mode === 'count' ? 'Cantidad contada' : 'Cantidad'}
              <div className="quantity-field">
                <input
                  name="quantity"
                  required
                  aria-label={mode === 'count' ? 'Cantidad contada' : 'Cantidad'}
                  inputMode={balance.unit === 'KG' ? 'decimal' : 'numeric'}
                  value={mode === 'count' ? counted : undefined}
                  placeholder={balance.unit === 'KG' ? '0,000' : '0'}
                  autoFocus
                  onChange={(event) => {
                    setAllowNegative(false);
                    if (mode === 'count') setCounted(event.target.value);
                  }}
                />
                <span>{balance.unit === 'KG' ? 'kg' : 'unidades'}</span>
              </div>
              {mode === 'count' && difference !== null && (
                <span className={`stock-count-difference${difference < 0 ? ' negative' : ''}`}>
                  Diferencia:{' '}
                  <strong>
                    {difference > 0 ? '+' : difference < 0 ? '−' : ''}
                    {formatStock(Math.abs(difference), balance.unit)}
                  </strong>
                </span>
              )}
              <small>
                {mode === 'count'
                  ? 'El conteo reemplaza la existencia actual.'
                  : kind === 'RECEIPT'
                    ? 'Cantidad que ingresa al stock.'
                    : 'Cantidad que se retira por pérdida, rotura u otro motivo.'}
              </small>
            </label>
            <label className="field">
              Motivo
              <input
                name="reason"
                required
                minLength={3}
                maxLength={240}
                placeholder={
                  mode === 'count'
                    ? 'Ej.: Conteo del estante'
                    : kind === 'RECEIPT'
                      ? 'Ej.: Compra de mercadería'
                      : 'Ej.: Envase dañado'
                }
              />
            </label>
            {insufficient && (
              <label className="checkbox-row negative-confirm">
                <input
                  type="checkbox"
                  aria-label="Confirmar saldo negativo"
                  checked={allowNegative}
                  onChange={(event) => setAllowNegative(event.target.checked)}
                />
                <span>Confirmo registrar un saldo negativo con este motivo.</span>
              </label>
            )}
          </fieldset>
        </div>
        <div className="dialog-footer">
          <span className="shortcut-note">Ctrl + S para guardar · Esc para volver</span>
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? 'Guardando…' : mode === 'count' ? 'Guardar conteo' : 'Guardar movimiento'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
