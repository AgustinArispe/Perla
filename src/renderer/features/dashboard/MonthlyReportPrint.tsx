import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { paymentLabels } from '../checkout/PaymentDialog';
import { PerlaMark } from '../../components/PerlaBrand';

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function MonthlyReportPrint({
  report,
  onClose,
  profitabilityEnabled = false,
}: {
  report: MonthlyReport;
  onClose: () => void;
  profitabilityEnabled?: boolean;
}) {
  const usedPayments = report.payments.filter(
    (payment) =>
      payment.amountCents !== 0 || payment.saleCount > 0 || (payment.refundCount ?? 0) > 0,
  );
  const paymentTotal = usedPayments.reduce((sum, payment) => sum + payment.amountCents, 0);
  const signedPayments = usedPayments.some((payment) => payment.amountCents < 0);
  const topProducts = report.rankings.revenue.slice(0, 8);
  return (
    <div className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className="report-toolbar">
        <button className="button secondary" onClick={onClose}>
          Volver
        </button>
        <button className="button primary" onClick={() => window.print()}>
          Imprimir / Guardar PDF
        </button>
      </div>
      <main className="monthly-report-print">
        <header className="report-header">
          <div className="report-mark">
            <PerlaMark />
          </div>
          <div>
            <span>PERLA · REPORTE PARA PERLA NEGRA</span>
            <h1 id="report-title">Resumen mensual</h1>
            <p>
              {dateFormat.format(new Date(`${report.period.from}T12:00:00Z`))} al{' '}
              {dateFormat.format(new Date(`${report.period.to}T12:00:00Z`))}
            </p>
          </div>
          <small>Generado el {new Date(report.generatedAt).toLocaleString('es-AR')}</small>
        </header>

        <section className="report-highlight">
          <span>Vendido neto</span>
          <strong>{formatMoney(report.totals.netCents)}</strong>
          <small>
            {report.totals.saleCount}{' '}
            {report.totals.saleCount === 1 ? 'venta completada' : 'ventas completadas'}
          </small>
        </section>
        <section className="report-kpis">
          <article>
            <span>Ticket promedio</span>
            <strong>{formatMoney(report.totals.averageCents)}</strong>
          </article>
          <article>
            <span>Descuentos</span>
            <strong>{formatMoney(report.totals.discountCents)}</strong>
          </article>
          <article>
            <span>Tarjetas</span>
            <strong>{formatMoney(report.cardCents)}</strong>
          </article>
          <article className={report.totals.voidedCents > 0 ? 'report-kpi-alert' : ''}>
            <span>Anuladas</span>
            <strong>{formatMoney(report.totals.voidedCents)}</strong>
          </article>
        </section>
        {profitabilityEnabled && (
          <section className="report-section report-profitability">
            <div className="report-section-heading">
              <h2>Margen bruto</h2>
              <span>
                {report.profitability.coverageBasisPoints / 100}% de{' '}
                {report.profitability.coverageBasis === 'ABSOLUTE_MOVEMENT_NET'
                  ? 'movimientos con costo'
                  : 'la venta cubierta'}
              </span>
            </div>
            <div className="report-profit-grid">
              <div>
                <span>Venta cubierta</span>
                <strong>{formatMoney(report.profitability.coveredNetCents)}</strong>
              </div>
              <div>
                <span>Costo de mercadería</span>
                <strong>{formatMoney(report.profitability.knownCostCents)}</strong>
              </div>
              <div>
                <span>Margen bruto conocido</span>
                <strong>{formatMoney(report.profitability.grossMarginCents)}</strong>
              </div>
            </div>
            <small>
              No incluye gastos, impuestos ni comisiones. Los productos sin costo quedan fuera del
              margen.
            </small>
            {report.profitability.products.length > 0 && (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cobertura</th>
                    <th>Margen bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {report.profitability.products.slice(0, 6).map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.coverageBasisPoints / 100}%</td>
                      <td>
                        {item.coverageBasisPoints
                          ? formatMoney(item.grossMarginCents)
                          : 'Sin costo'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}

        <section className="report-section">
          <div className="report-section-heading">
            <h2>Medios de pago</h2>
            <span>Pagos de ventas menos reembolsos; no incluye cobros posteriores de deuda</span>
          </div>
          {usedPayments.length ? (
            usedPayments.map((payment) => (
              <div className="report-payment" key={payment.method}>
                <div>
                  <strong>{paymentLabels[payment.method]}</strong>
                  <span>
                    {payment.saleCount} ventas · {payment.refundCount ?? 0} reembolsos
                  </span>
                </div>
                <div className="report-track">
                  {!signedPayments && paymentTotal > 0 && (
                    <i style={{ width: `${(100 * payment.amountCents) / paymentTotal}%` }} />
                  )}
                </div>
                <strong>{formatMoney(payment.amountCents)}</strong>
              </div>
            ))
          ) : (
            <p className="report-empty">Sin pagos registrados en el período.</p>
          )}
        </section>

        <div className="report-columns">
          <section className="report-section">
            <div className="report-section-heading">
              <h2>Más vendidos</h2>
              <span>Por facturación</span>
            </div>
            {topProducts.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((product, index) => (
                    <tr key={product.productId}>
                      <td>
                        <b>{index + 1}</b>
                        {product.name}
                      </td>
                      <td>{formatStock(product.quantityBase, product.unit)}</td>
                      <td>{formatMoney(product.netCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">Sin ventas en el período.</p>
            )}
          </section>
          <section className="report-section">
            <div className="report-section-heading">
              <h2>Reposición actual</h2>
              <span>{report.lowStock.length} productos</span>
            </div>
            <p>
              Existencias al generar este informe:{' '}
              {new Date(report.generatedAt).toLocaleDateString('es-AR', {
                timeZone: 'America/Argentina/Buenos_Aires',
              })}
              . Fuera del período histórico.
            </p>
            {report.lowStock.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Actual</th>
                    <th>Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {report.lowStock.slice(0, 8).map((product) => (
                    <tr key={product.productId}>
                      <td>{product.name}</td>
                      <td className={product.quantityBase <= 0 ? 'report-negative' : ''}>
                        {formatStock(product.quantityBase, product.unit)}
                      </td>
                      <td>{formatStock(product.minStockBase, product.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="report-empty">No hay productos para reponer.</p>
            )}
          </section>
        </div>
        <footer className="report-footer">
          Perla · Reporte para Perla Negra · Valores expresados en pesos argentinos
        </footer>
      </main>
    </div>
  );
}
