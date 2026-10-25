import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from '../../../shared/auth';
import type { PreparedOrder } from '../../../shared/prepared-orders';
import {
  CheckoutSchema,
  type CheckoutInput,
  type PaymentInput,
  type SaleDetail,
} from '../../../shared/sales';
import type { SaleReceipt } from '../../../shared/receipts';
import { api, unwrap, errorMessage } from '../../api';
import { Dialog } from '../../components/Dialog';
import { PaymentDialog } from '../checkout/PaymentDialog';
import { ReceiptPrint } from '../receipts/ReceiptPrint';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import '../delivery-notes/delivery-notes.css';

export function PreparedOrderCash({
  user,
  paymentMethods,
  receiptsEnabled,
  onClose,
}: {
  user: User;
  paymentMethods: PaymentInput['method'][];
  receiptsEnabled: boolean;
  onClose: () => void;
}) {
  const storageKey = `bocha.prepared-order.pending.${user.id}`;
  const [recovered] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return { pending: null, error: '' };
      const input = CheckoutSchema.parse(JSON.parse(raw));
      if (!input.preparedOrderId)
        throw new Error('La operación guardada no corresponde a una orden.');
      return {
        pending: input,
        error: 'Hay un cobro pendiente de confirmar. Consultá el resultado antes de reintentar.',
      };
    } catch (failure) {
      return { pending: null, error: errorMessage(failure) };
    }
  });
  const client = useQueryClient();
  const [number, setNumber] = useState('');
  const [order, setOrder] = useState<PreparedOrder | null>(null);
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(recovered.error);
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [pending, setPending] = useState<CheckoutInput | null>(recovered.pending);
  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      setOrder(unwrap(await api().preparedOrders.byNumber(Number(number))));
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function accepted(result: SaleDetail) {
    setSale(result);
    setPaying(false);
    setPending(null);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* A subsequent recovery will find this confirmed sale. */
    }
    await client.invalidateQueries();
    try {
      if (receiptsEnabled) {
        const printed = await api().receipts.create({ saleId: result.id, format: 'THERMAL_80' });
        if (printed.ok) setReceipt(printed.value);
        else setError(`Venta N.º ${result.number} cobrada. ${printed.error.message}`);
      }
    } catch (failure) {
      setError(`Venta N.º ${result.number} cobrada. ${errorMessage(failure)}`);
    }
  }
  async function send(input: CheckoutInput) {
    setBusy(true);
    setError('');
    try {
      const result = await api().sales.complete(input);
      if (result.ok) await accepted(result.value);
      else {
        setError(result.error.message);
        if (!result.error.retryable) {
          localStorage.removeItem(storageKey);
          setPending(null);
        }
      }
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  async function pay(payments: PaymentInput[], override?: { reason: string }) {
    if (!order || busy) return;
    const input: CheckoutInput = {
      ...order.body,
      preparedOrderId: order.id,
      expectedQuoteHash: order.quote.quoteHash,
      payments,
      ...(override ? { negativeStockOverride: override } : {}),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(input));
      setPending(input);
      await send(input);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  async function check() {
    if (!pending) return;
    setBusy(true);
    setError('');
    try {
      const result = unwrap(await api().sales.findByCheckoutKey(pending.checkoutKey));
      if (result) await accepted(result);
      else
        setError('El cobro todavía no figura confirmado. Podés reintentar con los mismos datos.');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return createPortal(<ReceiptPrint receipt={receipt} onClose={onClose} />, document.body);
  if (pending && !busy)
    return createPortal(
      <Dialog title="Confirmar resultado del cobro" onClose={onClose}>
        <p>{error || 'Comprobá el resultado antes de continuar.'}</p>
        <div className="dialog-footer">
          <button className="button secondary" onClick={() => void check()}>
            Consultar resultado
          </button>
          <button className="button primary" onClick={() => void send(pending)}>
            Reintentar mismo cobro
          </button>
          <button className="button secondary" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </Dialog>,
      document.body,
    );
  if (paying && order)
    return createPortal(
      <PaymentDialog
        totalCents={order.quote.totalCents}
        paymentMethods={paymentMethods}
        role={user.role}
        busy={busy}
        backendError={error}
        onClose={() => setPaying(false)}
        onConfirm={pay}
      />,
      document.body,
    );
  return createPortal(
    <Dialog title="Cobrar orden preparada" onClose={onClose} busy={busy} wide>
      <form onSubmit={(e) => void lookup(e)} className="delivery-note-filters">
        <label>
          Número de orden
          <input
            required
            type="number"
            min="1"
            value={number}
            disabled={busy || Boolean(pending)}
            onChange={(e) => {
              setNumber(e.target.value);
              setOrder(null);
            }}
          />
        </label>
        <button className="button primary" disabled={busy || Boolean(pending)}>
          Buscar orden
        </button>
      </form>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {sale && (
        <p className="alert" role="status">
          Orden cobrada. Venta N.º {sale.number} · {formatMoney(sale.totalCents)}
        </p>
      )}
      {order && !sale && (
        <div style={{ padding: 20 }}>
          <h2>
            Orden N.º {order.number} · {order.customerName}
          </h2>
          <p>
            Preparó {order.preparedBy} · {order.locationName}
          </p>
          {order.items.map((item, i) => (
            <p key={i}>
              {item.name} · {formatStock(item.quantityBase, item.unit)}
            </p>
          ))}
          <p>
            Total: <strong>{formatMoney(order.quote.totalCents)}</strong>
          </p>
          {order.status === 'READY' ? (
            <button
              className="button primary"
              disabled={busy || !paymentMethods.length}
              onClick={() => setPaying(true)}
            >
              Cobrar orden
            </button>
          ) : (
            <p>
              {order.status === 'PAID'
                ? `Ya cobrada en la venta N.º ${order.saleNumber}.`
                : 'La orden está cancelada.'}
            </p>
          )}
        </div>
      )}
      <div className="dialog-footer">
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Dialog>,
    document.body,
  );
}
