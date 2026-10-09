import { useMemo, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { parseQuantity, quantityInput } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { formatMoney } from '../../../domain/values';
import { proportionalIncrement } from '../../../domain/returns';
import type { ReturnConfirmInput } from '../../../shared/returns';
import { Dialog } from '../../components/Dialog';
import { api, errorMessage, unwrap } from '../../api';
import { paymentLabels } from '../checkout/PaymentDialog';

export function ReturnDialog({ saleId, onClose }: { saleId: string; onClose: () => void }) {
  const client = useQueryClient();
  const preview = useQuery({
    queryKey: ['sale-return-preview', saleId],
    queryFn: async () => unwrap(await api().sales.previewReturn(saleId)),
    retry: false,
  });
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [dispositions, setDispositions] = useState<
    Record<string, 'RESTOCK' | 'WASTE' | 'NONE'>
  >({});
  const [refundMethod, setRefundMethod] = useState<ReturnConfirmInput['refundMethod']>('CASH');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const selected = useMemo(() => {
    if (!preview.data) return [];
    return preview.data.items.flatMap((item) => {
      const raw = quantities[item.saleItemId]?.trim();
      if (!raw) return [];
      try {
        const quantityBase = parseQuantity(raw, item.unit);
        if (quantityBase > item.availableQuantityBase) return [];
        return [
          {
            saleItemId: item.saleItemId,
            quantityBase,
            disposition: item.trackableReturn
              ? (dispositions[item.saleItemId] ?? 'RESTOCK')
              : ('NONE' as const),
            estimatedCents: proportionalIncrement({
              totalAmountCents: item.soldNetCents,
              totalQuantityBase: item.soldQuantityBase,
              previousQuantityBase: item.returnedQuantityBase,
              returnedQuantityBase: quantityBase,
            }),
          },
        ];
      } catch {
        return [];
      }
    });
  }, [dispositions, preview.data, quantities]);
  const estimatedTotal = selected.reduce((sum, item) => sum + item.estimatedCents, 0);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!selected.length || busy) return;
    setBusy(true);
    setError('');
    try {
      unwrap(
        await api().sales.returnSale({
          saleId,
          operationKey: crypto.randomUUID(),
          reason,
          refundMethod,
          items: selected.map((item) => ({
            saleItemId: item.saleItemId,
            quantityBase: item.quantityBase,
            disposition: item.disposition,
          })),
        }),
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ['sale-detail', saleId] }),
        client.invalidateQueries({ queryKey: ['sale-return-preview', saleId] }),
        client.invalidateQueries({ queryKey: ['sale-returns', saleId] }),
        client.invalidateQueries({ queryKey: ['sales-history'] }),
        client.invalidateQueries({ queryKey: ['stock'] }),
        client.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Registrar devolución" onClose={onClose} busy={busy} wide>
      <form className="return-dialog" onSubmit={(event) => void submit(event)}>
        <div className="dialog-body">
          {(error || preview.isError) && (
            <div className="alert error" role="alert">
              {error || errorMessage(preview.error)}
            </div>
          )}
          <div className="return-lines">
            {preview.data?.items.map((item) => (
              <article className="return-line" key={item.saleItemId}>
                <div className="return-line-product">
                  <strong>{item.name}</strong>
                  <span>
                    Disponible para devolver: {formatStock(item.availableQuantityBase, item.unit)}
                  </span>
                </div>
                {item.availableQuantityBase > 0 ? (
                  <>
                    <label className="field">
                      Cantidad
                      <input
                        aria-label={`Cantidad a devolver de ${item.name}`}
                        inputMode={item.unit === 'KG' ? 'decimal' : 'numeric'}
                        placeholder={item.unit === 'KG' ? '0,000' : '0'}
                        value={quantities[item.saleItemId] ?? ''}
                        onChange={(event) =>
                          setQuantities((current) => ({
                            ...current,
                            [item.saleItemId]: event.target.value,
                          }))
                        }
                      />
                      <button
                        type="button"
                        className="text-action"
                        onClick={() =>
                          setQuantities((current) => ({
                            ...current,
                            [item.saleItemId]: quantityInput(item.availableQuantityBase, item.unit),
                          }))
                        }
                      >
                        Todo
                      </button>
                    </label>
                    {item.trackableReturn && (
                      <label className="field">
                        Destino
                        <select
                          value={dispositions[item.saleItemId] ?? 'RESTOCK'}
                          onChange={(event) =>
                            setDispositions((current) => ({
                              ...current,
                              [item.saleItemId]: event.target.value as 'RESTOCK' | 'WASTE',
                            }))
                          }
                        >
                          <option value="RESTOCK">Vuelve al stock</option>
                          <option value="WASTE">Se descarta</option>
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <span className="status-pill neutral">Devuelto por completo</span>
                )}
              </article>
            ))}
          </div>
          <div className="return-summary">
            <div>
              <span>Reintegro estimado</span>
              <strong>{formatMoney(estimatedTotal)}</strong>
            </div>
            <label className="field">
              Medio de reintegro
              <select
                value={refundMethod}
                onChange={(event) =>
                  setRefundMethod(event.target.value as ReturnConfirmInput['refundMethod'])
                }
              >
                {Object.entries(paymentLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Motivo
              <input
                required
                minLength={3}
                maxLength={240}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ej.: Producto devuelto"
              />
            </label>
          </div>
        </div>
        <div className="dialog-footer">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button type="submit" className="button primary" disabled={busy || !selected.length}>
            {busy ? 'Guardando…' : 'Confirmar devolución'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
