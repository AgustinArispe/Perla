import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { StockBalance } from '../../../shared/stock';
import { formatStock } from '../../../domain/inventory';
import { parseQuantity, quantityInput } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';

type InitialLot = { id: string; code: string; expiresOn: string; quantity: string };

export function LotManager({ balance, onClose }: { balance: StockBalance; onClose: () => void }) {
  const client = useQueryClient();
  const [error, setError] = useState('');
  const [initialLots, setInitialLots] = useState<InitialLot[]>([
    {
      id: crypto.randomUUID(),
      code: '',
      expiresOn: '',
      quantity: quantityInput(balance.quantityBase ?? 0, balance.unit),
    },
  ]);
  const status = useQuery({
    queryKey: ['lots', balance.productId],
    queryFn: async () => unwrap(await api().lots.status(balance.productId)),
    retry: false,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['lots', balance.productId] });
    await client.invalidateQueries({ queryKey: ['stock'] });
  };
  const enable = useMutation({
    mutationFn: async () => unwrap(await api().lots.enable(balance.productId)),
    onSuccess: refresh,
    onError: (failure) => setError(errorMessage(failure)),
  });
  const reconcile = useMutation({
    mutationFn: async () =>
      unwrap(
        await api().lots.reconcile({
          productId: balance.productId,
          operationKey: crypto.randomUUID(),
          lots: initialLots.map((lot) => ({
            code: lot.code,
            expiresOn: lot.expiresOn || null,
            quantityBase: parseQuantity(lot.quantity, balance.unit),
          })),
        }),
      ),
    onSuccess: refresh,
    onError: (failure) => setError(errorMessage(failure)),
  });
  const block = useMutation({
    mutationFn: async (input: { lotId: string; blocked: boolean }) =>
      unwrap(await api().lots.setBlocked(input)),
    onSuccess: refresh,
    onError: (failure) => setError(errorMessage(failure)),
  });
  const busy = enable.isPending || reconcile.isPending || block.isPending;
  const data = status.data;
  return (
    <Dialog title={`Lotes · ${balance.name}`} onClose={onClose} busy={busy} wide className="lot-dialog">
      {error && <div className="alert error">{error}</div>}
      {status.isPending ? (
        <div className="dialog-body">Cargando lotes…</div>
      ) : !data?.enabled ? (
        <div className="dialog-body lot-intro">
          <span className="lot-symbol"><Icon name="box" size={26} /></span>
          <div>
            <strong>Controlar por lote y vencimiento</strong>
            <p>Al vender, el sistema descontará primero la mercadería que vence antes.</p>
          </div>
          <button className="button primary" onClick={() => enable.mutate()} disabled={busy}>
            Activar lotes
          </button>
        </div>
      ) : !data.reconciled ? (
        <div className="dialog-body">
          <div className="lot-reconcile-heading">
            <div>
              <strong>Distribuí la existencia actual</strong>
              <small>Total a distribuir: {formatStock(data.stockQuantityBase, balance.unit)}</small>
            </div>
            <button
              className="button secondary small"
              onClick={() =>
                setInitialLots((current) => [
                  ...current,
                  { id: crypto.randomUUID(), code: '', expiresOn: '', quantity: '' },
                ])
              }
            >
              <Icon name="plus" size={16} /> Agregar lote
            </button>
          </div>
          <div className="lot-initial-list">
            {initialLots.map((lot, index) => (
              <div className="lot-initial-row" key={lot.id}>
                <label>
                  <span>Lote</span>
                  <input
                    value={lot.code}
                    data-dialog-focus={index === 0 ? true : undefined}
                    placeholder="Ej. PROV-1026"
                    onChange={(event) =>
                      setInitialLots((current) =>
                        current.map((item) => item.id === lot.id ? { ...item, code: event.target.value } : item),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Vence</span>
                  <input
                    type="date"
                    value={lot.expiresOn}
                    onChange={(event) =>
                      setInitialLots((current) =>
                        current.map((item) => item.id === lot.id ? { ...item, expiresOn: event.target.value } : item),
                      )
                    }
                  />
                </label>
                <label>
                  <span>Cantidad</span>
                  <input
                    inputMode="decimal"
                    value={lot.quantity}
                    onChange={(event) =>
                      setInitialLots((current) =>
                        current.map((item) => item.id === lot.id ? { ...item, quantity: event.target.value } : item),
                      )
                    }
                  />
                </label>
                {initialLots.length > 1 && (
                  <button
                    className="icon-button"
                    aria-label="Quitar lote"
                    onClick={() => setInitialLots((current) => current.filter((item) => item.id !== lot.id))}
                  >
                    <Icon name="close" size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="dialog-actions">
            <button className="button secondary" onClick={onClose}>Cancelar</button>
            <button className="button primary" disabled={busy} onClick={() => reconcile.mutate()}>
              Guardar distribución
            </button>
          </div>
        </div>
      ) : (
        <div className="dialog-body">
          <div className="lot-list">
            {data.lots.map((lot) => {
              const expired = Boolean(lot.expiresOn && lot.expiresOn < new Date().toISOString().slice(0, 10));
              return (
                <article className="lot-row" key={lot.id}>
                  <div className="lot-row-main">
                    <strong>{lot.code}</strong>
                    <small>{lot.expiresOn ? `Vence ${new Intl.DateTimeFormat('es-AR').format(new Date(`${lot.expiresOn}T12:00:00`))}` : 'Sin vencimiento'}</small>
                  </div>
                  <strong className="lot-quantity">{formatStock(lot.quantityBase, balance.unit)}</strong>
                  <span className={`pill ${expired ? 'danger' : lot.status === 'BLOCKED' ? 'warning' : 'success'}`}>
                    {expired ? 'Vencido' : lot.status === 'BLOCKED' ? 'Bloqueado' : 'Disponible'}
                  </span>
                  <button
                    className="button secondary small"
                    disabled={busy || expired}
                    onClick={() => block.mutate({ lotId: lot.id, blocked: lot.status !== 'BLOCKED' })}
                  >
                    {lot.status === 'BLOCKED' ? 'Habilitar' : 'Bloquear'}
                  </button>
                </article>
              );
            })}
            {!data.lots.length && <div className="empty-state"><strong>Sin lotes con existencia</strong></div>}
          </div>
        </div>
      )}
    </Dialog>
  );
}
