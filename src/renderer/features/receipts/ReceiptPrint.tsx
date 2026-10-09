import { useState } from 'react';
import type { SaleReceipt } from '../../../shared/receipts';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { paymentLabels } from '../checkout/PaymentDialog';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

export function ReceiptPrint({ receipt, onClose }: { receipt: SaleReceipt; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { sale } = receipt.snapshot;
  async function print() {
    setBusy(true);
    setError('');
    try {
      window.print();
      if (receipt.status === 'PENDING')
        await api().receipts.markPrinted({ receiptId: receipt.id }).then(unwrap);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title="Comprobante de venta"
      onClose={onClose}
      busy={busy}
      wide
      className="receipt-dialog"
    >
      <div className={`receipt-preview receipt-${receipt.format.toLowerCase()}`}>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <header>
          <strong>{receipt.snapshot.businessName}</strong>
          <span>COMPROBANTE DE VENTA — NO FISCAL</span>
        </header>
        <p>
          Venta N.º {sale.number} ·{' '}
          {new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'America/Argentina/Buenos_Aires',
          }).format(new Date(sale.createdAt))}
        </p>
        <div className="receipt-items">
          {sale.items.map((item) => (
            <div key={item.id}>
              <span>
                {item.name} × {formatStock(item.quantityBase, item.unit)}
              </span>
              <strong>{formatMoney(item.netCents)}</strong>
            </div>
          ))}
        </div>
        {sale.promotions?.length ? (
          <div className="receipt-promotions">
            <span>Subtotal <strong>{formatMoney(sale.subtotalCents)}</strong></span>
            {sale.promotions.map((promotion) => (
              <span key={`${promotion.promotionId}:${promotion.revision}`}>
                {promotion.name} <strong>−{formatMoney(promotion.discountCents)}</strong>
              </span>
            ))}
            <span>Ahorro total <strong>−{formatMoney(sale.discountCents)}</strong></span>
          </div>
        ) : null}
        <div className="receipt-total">
          <span>Total</span>
          <strong>{formatMoney(sale.totalCents)}</strong>
        </div>
        <div className="receipt-payments">
          {sale.payments.map((payment, index) => (
            <span key={index}>
              {paymentLabels[payment.method]} · {formatMoney(payment.amountCents)}
            </span>
          ))}
          {Boolean(sale.onAccountCents) && (
            <span>A cuenta{sale.customerName ? ` · ${sale.customerName}` : ''} · {formatMoney(sale.onAccountCents!)}</span>
          )}
        </div>
        <footer>Gracias por tu compra</footer>
      </div>
      <div className="dialog-footer no-print">
        <button className="button secondary" onClick={onClose}>
          Cerrar
        </button>
        <button className="button primary" disabled={busy} onClick={() => void print()}>
          {busy ? 'Preparando…' : 'Imprimir comprobante'}
        </button>
      </div>
    </Dialog>
  );
}
