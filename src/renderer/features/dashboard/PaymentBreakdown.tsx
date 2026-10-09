import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { paymentLabels } from '../checkout/PaymentDialog';
export function PaymentBreakdown({ report }: { report: MonthlyReport }) {
  const used = report.payments.filter((payment) => payment.amountCents > 0);
  const unused = report.payments.filter((payment) => payment.amountCents === 0);
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-heading">
        <h2>Medios de pago</h2>
      </div>
      {used.map((p) => (
        <div className="payment-metric" key={p.method} data-payment={p.method}>
          <div>
            <strong>{paymentLabels[p.method]}</strong>
            <strong>{formatMoney(p.amountCents)}</strong>
          </div>

          <small>{(p.shareBasisPoints / 100).toLocaleString('es-AR')}% del importe</small>
          <details>
            <summary>Operaciones con este medio</summary>
            <p>
              {p.saleCount} {p.saleCount === 1 ? 'venta' : 'ventas'} ·{' '}
              {(p.saleShareBasisPoints / 100).toLocaleString('es-AR')}% de las ventas. Una venta
              mixta puede aparecer en varios medios.
            </p>
          </details>
        </div>
      ))}
      {!used.length && <p>Sin pagos registrados en este mes.</p>}
      {unused.length > 0 && (
        <details className="unused-payment-methods">
          <summary>Medios sin ventas ({unused.length})</summary>
          <div>
            {unused.map((payment) => (
              <span key={payment.method}>{paymentLabels[payment.method]}</span>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}
