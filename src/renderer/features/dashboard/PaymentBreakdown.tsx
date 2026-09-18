import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { paymentLabels } from '../checkout/PaymentDialog';
export function PaymentBreakdown({ report }: { report: MonthlyReport }) {
  return (
    <section className="dashboard-panel">
      <h2>Medios de pago</h2>
      {report.payments.map((p) => (
        <div className="payment-metric" key={p.method}>
          <div>
            <strong>{paymentLabels[p.method]}</strong>
            <strong>{formatMoney(p.amountCents)}</strong>
          </div>
          <div className="metric-track">
            <span style={{ width: `${p.shareBasisPoints / 100}%` }} />
          </div>
          <small>
            {(p.shareBasisPoints / 100).toLocaleString('es-AR')}% del importe · {p.saleCount} ventas
            ({(p.saleShareBasisPoints / 100).toLocaleString('es-AR')}%)
          </small>
        </div>
      ))}
    </section>
  );
}
