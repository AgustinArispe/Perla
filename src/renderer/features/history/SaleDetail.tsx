import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  VoidSchema,
  type VoidInput,
  type SaleDetail,
  type VoidPreview,
} from '../../../shared/sales';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { Dialog } from '../../components/Dialog';
import { api, unwrap, errorMessage } from '../../api';
import { paymentLabels } from '../checkout/PaymentDialog';
const timestamp = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value));
export function SaleDetailView({
  saleId,
  userId,
  onClose,
}: {
  saleId: string;
  userId: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const key = `bocha.void.pending.v1.${userId}.${saleId}`;
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const input = raw ? VoidSchema.parse(JSON.parse(raw)) : null;
      if (input && input.saleId !== saleId)
        throw new Error('La anulación pendiente corresponde a otra venta.');
      return { input, error: '' };
    } catch (error) {
      return { input: null, error: errorMessage(error) };
    }
  });
  const [pending, setPending] = useState<VoidInput | null>(initial.input),
    [showVoid, setShowVoid] = useState(Boolean(initial.input)),
    [reason, setReason] = useState(initial.input?.reason ?? ''),
    [ack, setAck] = useState(initial.input?.acknowledgeRecount ?? false),
    [preview, setPreview] = useState<VoidPreview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(initial.error);
  const detail = useQuery({
    queryKey: ['sale-detail', saleId],
    queryFn: async () => unwrap(await api().sales.detail(saleId)),
    retry: false,
  });
  const sale = detail.data;
  function confirmed(value: SaleDetail) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* The server has already confirmed this operation. */
    }
    setPending(null);
    setShowVoid(false);
    setError('');
    client.setQueryData(['sale-detail', saleId], value);
    void client.invalidateQueries({ queryKey: ['sales-history'] });
    void client.invalidateQueries({ queryKey: ['stock'] });
    void client.invalidateQueries({ queryKey: ['dashboard'] });
  }
  async function prepare() {
    setBusy(true);
    setError('');
    try {
      setPreview(unwrap(await api().sales.previewVoid(saleId)));
      setShowVoid(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const input =
        pending ??
        VoidSchema.parse({
          saleId,
          operationKey: crypto.randomUUID(),
          reason,
          ...(ack ? { acknowledgeRecount: true } : {}),
        });
      localStorage.setItem(key, JSON.stringify(input));
      setPending(input);
      const result = await api().sales.void(input);
      if (result.ok) confirmed(result.value);
      else {
        setError(result.error.message);
        if (!result.error.retryable) {
          const current = unwrap(await api().sales.detail(saleId));
          if (current.status === 'VOIDED') confirmed(current);
          else {
            localStorage.removeItem(key);
            setPending(null);
            setPreview(unwrap(await api().sales.previewVoid(saleId)));
          }
        }
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function consult() {
    setBusy(true);
    try {
      const current = unwrap(await api().sales.detail(saleId));
      if (current.status === 'VOIDED') confirmed(current);
      else setError('La venta sigue completada. Podés reintentar la misma anulación.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={sale ? `Venta N.º ${sale.number}` : 'Detalle de venta'}
      busy={busy}
      onClose={onClose}
      wide
    >
      <div className="sale-detail">
        {(error || detail.isError) && (
          <div className="alert error" role="alert">
            {error || errorMessage(detail.error)}
          </div>
        )}
        {sale && (
          <>
            <div className="sale-detail-heading">
              <div>
                <strong className={sale.status === 'VOIDED' ? 'voided-label' : 'completed-label'}>
                  {sale.status === 'VOIDED' ? 'Anulada' : 'Completada'}
                </strong>
                <p>{timestamp(sale.createdAt)}</p>
                <p>
                  Atendió: <strong>{sale.actorName ?? 'Usuario sin registro histórico'}</strong>
                </p>
              </div>
              <strong className="sale-detail-total">{formatMoney(sale.totalCents)}</strong>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Descuento</th>
                  <th>Neto</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <small>{item.barcode ?? item.sku}</small>
                    </td>
                    <td>{formatStock(item.quantityBase, item.unit)}</td>
                    <td>
                      {formatMoney(item.unitPriceCents)}
                      {item.unit === 'KG' ? ' / kg' : ''}
                    </td>
                    <td>{formatMoney(item.discountCents)}</td>
                    <td>{formatMoney(item.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="sale-detail-breakdown">
              <span>
                Subtotal <strong>{formatMoney(sale.subtotalCents)}</strong>
              </span>
              <span>
                Descuento <strong>{formatMoney(sale.discountCents)}</strong>
              </span>
            </div>
            <h3>Medios de pago</h3>
            <div className="sale-payments">
              {sale.payments.map((p, i) => (
                <p key={i}>
                  <strong>
                    {paymentLabels[p.method]} · {formatMoney(p.amountCents)}
                  </strong>
                  {p.method === 'CASH' && (
                    <span>
                      Recibido {formatMoney(p.tenderedCents ?? p.amountCents)} · Vuelto{' '}
                      {formatMoney(p.changeCents)}
                    </span>
                  )}
                </p>
              ))}
              {!sale.payments.length && <p>Venta bonificada, sin pago.</p>}
            </div>
            <h3>Registro de la venta</h3>
            {sale.events.map((event, i) => (
              <div className="sale-event" key={i}>
                <span>
                  {timestamp(event.createdAt)} ·{' '}
                  {event.kind === 'COMPLETED' ? 'Venta guardada' : 'Anulación'}
                </span>
                <strong>{event.reason}</strong>
                {event.clockWarning && (
                  <p className="alert error" role="alert">
                    {event.clockWarning}
                  </p>
                )}
              </div>
            ))}
            {sale.status === 'COMPLETED' && !showVoid && (
              <button
                className="button secondary"
                disabled={busy || Boolean(initial.error)}
                onClick={() => void prepare()}
              >
                Anular venta
              </button>
            )}
            {showVoid && sale.status === 'COMPLETED' && (
              <div className="void-form">
                <h3>{pending ? 'Anulación pendiente de confirmar' : 'Anular esta venta'}</h3>
                {preview?.countedAfterSale.length ? (
                  <div className="alert error">
                    <p>
                      Hubo un conteo posterior para:{' '}
                      {preview.countedAfterSale.map((p) => p.name).join(', ')}.
                    </p>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={ack}
                        disabled={busy || Boolean(pending)}
                        onChange={(event) => setAck(event.target.checked)}
                      />
                      Confirmar reposición sobre el conteo actual
                    </label>
                  </div>
                ) : null}
                <label className="field">
                  Motivo de anulación
                  <input
                    aria-label="Motivo de anulación"
                    value={reason}
                    disabled={busy || Boolean(pending)}
                    onChange={(event) => setReason(event.target.value)}
                    minLength={3}
                    maxLength={240}
                    autoFocus
                  />
                </label>
                <p>La devolución del dinero se realiza por fuera del sistema.</p>
                <div className="dialog-actions">
                  {pending && (
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={() => void consult()}
                    >
                      Consultar anulación
                    </button>
                  )}
                  <button
                    className="button primary"
                    disabled={
                      busy ||
                      Boolean(initial.error) ||
                      Boolean(preview?.countedAfterSale.length && !ack)
                    }
                    onClick={() => void confirm()}
                  >
                    {busy ? 'Guardando…' : pending ? 'Reintentar anulación' : 'Confirmar anulación'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
