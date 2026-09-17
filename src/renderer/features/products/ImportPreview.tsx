import { useState } from 'react';
import type { ImportPreview as Preview, ImportResult } from '../../../shared/catalog';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

export function ImportPreview({
  preview,
  onClose,
  onApplied,
}: {
  preview: Preview;
  onClose: () => void;
  onApplied: (result: ImportResult) => void;
}) {
  const [operationKey] = useState(() => crypto.randomUUID());
  const [confirmed, setConfirmed] = useState(false);
  const [countsConfirmed, setCountsConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [shown, setShown] = useState(50);
  const disabled =
    busy ||
    preview.alreadyApplied ||
    preview.errors.length > 0 ||
    (preview.priceChanges > 0 && !confirmed) ||
    (preview.stockOpenings > 0 && !countsConfirmed);
  async function apply() {
    if (disabled) return;
    setBusy(true);
    setError('');
    try {
      onApplied(
        unwrap(
          await api().products.applyImport({
            previewToken: preview.previewToken,
            operationKey,
            confirmPriceChanges: confirmed,
            confirmStockCounts: countsConfirmed,
          }),
        ),
      );
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Revisar carga" onClose={onClose} busy={busy} wide>
      <div className="dialog-body">
        <p className="form-intro">
          {preview.sourceName} · {preview.rowCount.toLocaleString('es-AR')} productos
        </p>
        <div className="import-stats">
          <div>
            <strong>{preview.newCount}</strong>
            <span>Productos nuevos</span>
          </div>
          <div>
            <strong>{preview.updateCount}</strong>
            <span>Actualizaciones</span>
          </div>
          <div className={preview.errors.length ? 'invalid-stat' : ''}>
            <strong>{preview.errors.length}</strong>
            <span>Errores a corregir</span>
          </div>
        </div>
        {preview.alreadyApplied && <div className="alert info">Este archivo ya fue aplicado.</div>}
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {preview.errors.length > 0 && (
          <div className="import-errors">
            <p role="alert">
              Corregí estos errores y volvé a elegir el archivo. No se guardará ningún producto de
              esta carga.
            </p>
            <ul>
              {preview.errors.map((issue, index) => (
                <li key={index}>
                  <strong>Fila {issue.row}</strong>
                  <span>{issue.message}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {preview.rows.length > 0 && (
          <div className="preview-table">
            <table>
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Producto</th>
                  <th>Código de barras</th>
                  <th className="numeric">Precio</th>
                  {preview.stockOpenings > 0 && <th className="numeric">Conteo inicial</th>}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, shown).map((row) => (
                  <tr key={row.row}>
                    <td>
                      <span className={`pill ${row.action === 'CREATE' ? 'good' : ''}`}>
                        {row.action === 'CREATE' ? 'Alta' : 'Cambio'}
                      </span>
                    </td>
                    <td>
                      <strong>{row.name}</strong>
                      <small>{row.sku}</small>
                    </td>
                    <td className="barcode">{row.barcode ?? 'Sin código'}</td>
                    <td className="numeric">
                      {row.previousPriceCents !== null &&
                        row.previousPriceCents !== row.priceCents && (
                          <small>Antes: {formatMoney(row.previousPriceCents)}</small>
                        )}
                      {formatMoney(row.priceCents)}
                    </td>
                    {preview.stockOpenings > 0 && (
                      <td className="numeric">{formatStock(row.countedBase, row.unit)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {shown < preview.rows.length && (
              <button className="button secondary load-more" onClick={() => setShown(shown + 50)}>
                Ver más productos ({Math.min(shown, preview.rows.length)} de {preview.rows.length})
              </button>
            )}
          </div>
        )}
        {preview.priceChanges > 0 && !preview.alreadyApplied && (
          <label className="checkbox-row confirm-prices">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={busy}
            />
            <span>Confirmo los cambios de precio de {preview.priceChanges} productos.</span>
          </label>
        )}
        {preview.stockOpenings > 0 && !preview.alreadyApplied && (
          <label className="checkbox-row confirm-prices">
            <input
              type="checkbox"
              checked={countsConfirmed}
              onChange={(event) => setCountsConfirmed(event.target.checked)}
              disabled={busy}
              aria-label="Confirmar conteo físico del CSV"
            />
            <span>
              Confirmo que las cantidades de {preview.stockOpenings} productos provienen de un
              conteo físico real.
            </span>
          </label>
        )}
        <p className="subtle-note">
          La carga se guarda completa o no se guarda. Sin conteo inicial, las existencias quedan
          desconocidas.
        </p>
      </div>
      <div className="dialog-footer">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Volver
        </button>
        <button className="button primary" onClick={() => void apply()} disabled={disabled}>
          {busy ? 'Aplicando carga…' : 'Aplicar carga'}
        </button>
      </div>
    </Dialog>
  );
}
