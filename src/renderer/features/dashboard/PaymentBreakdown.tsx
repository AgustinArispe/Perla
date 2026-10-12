import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { paymentLabels } from '../checkout/PaymentDialog';
export function PaymentBreakdown({ report }: { report: MonthlyReport }) {
  const used = report.payments.filter(
    (payment) =>
      payment.amountCents !== 0 || payment.saleCount > 0 || (payment.refundCount ?? 0) > 0,
  );
  const unused = report.payments.filter((payment) => !used.includes(payment));
  const total = used.reduce((sum, payment) => sum + payment.amountCents, 0);
  const signed = used.some((payment) => payment.amountCents < 0);
  const max = Math.max(1, ...used.map((payment) => Math.abs(payment.amountCents)));
  return (
    <section className="dashboard-panel results-payments">
      <div className="dashboard-panel-heading">
        <h2>Medios de pago</h2>
      </div>
      <p className="results-panel-context">
        Pagos de ventas menos reembolsos del período. No incluye cobros posteriores de deuda.
      </p>
      <div className="results-payment-total">
        <span>Total por medios de pago</span>
        <strong>{formatMoney(total)}</strong>
      </div>
      {used.map((p) => (
        <div className="payment-metric" key={p.method} data-payment={p.method}>
          <div>
            <strong>{paymentLabels[p.method]}</strong>
            <strong>{formatMoney(p.amountCents)}</strong>
          </div>

          <div className={`results-payment-track${signed ? ' signed' : ''}`} aria-hidden="true">
            <i
              data-negative={p.amountCents < 0}
              style={{
                width: `${((signed ? 50 : 100) * Math.abs(p.amountCents)) / (signed ? max : Math.max(total, 1))}%`,
              }}
            />
          </div>
          <small>
            {!signed && total > 0
              ? `${((100 * p.amountCents) / total).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% de pagos netos`
              : p.amountCents < 0
                ? 'Reembolsos mayores que pagos'
                : p.amountCents === 0
                  ? 'Movimientos compensados: neto cero'
                  : 'Pagos netos positivos'}
          </small>
          <details>
            <summary>Operaciones con este medio</summary>
            <p>
              {p.saleCount} {p.saleCount === 1 ? 'venta' : 'ventas'} · {p.refundCount ?? 0}{' '}
              reembolsos · {(p.saleShareBasisPoints / 100).toLocaleString('es-AR')}% de las ventas.
              Una venta mixta puede aparecer en varios medios.
            </p>
          </details>
        </div>
      ))}
      {!used.length && <p>Sin pagos registrados en este mes.</p>}
      {unused.length > 0 && (
        <details className="unused-payment-methods">
          <summary>Medios sin movimientos ({unused.length})</summary>
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
