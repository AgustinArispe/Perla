import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeader } from '../../components/PageHeader';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useRememberedState } from '../../components/useRememberedState';
import { DailySalesChart } from './DailySalesChart';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap, errorMessage } from '../../api';
import { formatMoney } from '../../../domain/values';
import { PaymentBreakdown } from './PaymentBreakdown';
import { TopProducts } from './TopProducts';
import { TopCategories } from './TopCategories';
import { MonthlyReportPrint } from './MonthlyReportPrint';
import { Icon } from '../../components/Icon';
import { PeriodComparison } from './PeriodComparison';
import { AnimatedValue } from './AnimatedValue';
const dayFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
function dayLabel(value: string) {
  return dayFormat.format(new Date(`${value}T12:00:00Z`));
}
export function DashboardPage({
  onOpenStock,
  onOpenDay,
  profitabilityEnabled = false,
  locationsEnabled = false,
}: {
  onOpenStock?: () => void;
  onOpenDay?: (date: string) => void;
  profitabilityEnabled?: boolean;
  locationsEnabled?: boolean;
}) {
  const [month, setMonth] = useRememberedState(
    'results',
    'month',
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date()),
  );
  const [printing, setPrinting] = useState(false);
  const [exploring, setExploring] = useState(false);
  const currentMonth = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
  function selectMonth(value: string) {
    setMonth(value);
    setExploring(false);
  }
  function stepMonth(direction: number) {
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) return;
    const next = new Date(`${month}-15T12:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + direction);
    const value = next.toISOString().slice(0, 7);
    if (value >= '1000-01' && value <= currentMonth) selectMonth(value);
  }
  const report = useQuery({
    queryKey: ['dashboard', month],
    queryFn: async () => unwrap(await api().dashboard.monthly(month)),
    enabled: /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month),
    retry: false,
  });
  const data = report.data;
  return (
    <>
      <PageHeader
        title="Resultados"
        context="Ventas, productos y margen del período elegido."
        className="dashboard-heading"
        actions={
          <div className="dashboard-heading-actions">
            <details className="dashboard-export-menu">
              <summary>Exportar</summary>
              <div>
                <ExportButton
                  dataset="dashboard"
                  filters={{ month }}
                  label="Resumen mensual · Excel"
                />
                <ExportButton
                  dataset="payments"
                  filters={{ month }}
                  label="Medios de pago · Excel"
                />
                <ExportButton
                  dataset="ranking"
                  filters={{ month, rank: 'revenue' }}
                  label="Productos · Excel"
                />
                {profitabilityEnabled && (
                  <ExportButton
                    dataset="profitability"
                    filters={{ month }}
                    label="Margen · Excel"
                  />
                )}
                {data && (
                  <button className="button secondary" onClick={() => setPrinting(true)}>
                    Reporte PDF
                  </button>
                )}
              </div>
            </details>
            <div className="dashboard-month-navigation" role="group" aria-label="Cambiar mes">
              <button
                className="button secondary"
                type="button"
                aria-label="Mes anterior"
                disabled={!month || month === '1000-01'}
                onClick={() => stepMonth(-1)}
              >
                <Icon name="arrow" size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
              <label className="field">
                Mes
                <input
                  aria-label="Mes"
                  type="month"
                  value={month}
                  min="1000-01"
                  max={currentMonth}
                  onChange={(event) => selectMonth(event.target.value)}
                />
              </label>
              <button
                className="button secondary"
                type="button"
                aria-label="Mes siguiente"
                disabled={!month || month >= currentMonth}
                onClick={() => stepMonth(1)}
              >
                <Icon name="arrow" size={18} />
              </button>
            </div>
            {month !== currentMonth && (
              <button
                className="button secondary"
                type="button"
                onClick={() => selectMonth(currentMonth)}
              >
                Mes actual
              </button>
            )}
          </div>
        }
      />
      {report.isError && (
        <div className="alert error" role="alert">
          {errorMessage(report.error)}{' '}
          <button className="button secondary small" onClick={() => void report.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {report.isPending && month && <PerlaLoading label="Consultando el mes…" />}
      {data && (
        <>
          <div
            className={`dashboard-metrics results-metrics${profitabilityEnabled ? ' with-margin' : ''}`}
          >
            <article className="dashboard-net">
              <span>
                <Icon name="chart" size={18} /> Vendido neto
              </span>
              <strong data-testid="monthly-net">
                <AnimatedValue value={formatMoney(data.totals.netCents)} />
              </strong>
              <small>
                Del {dayLabel(data.period.from)} al {dayLabel(data.period.to)}
              </small>
              <small className="monthly-comparison">
                {data.comparison.changeBasisPoints === null
                  ? 'Sin base de comparación'
                  : `${data.comparison.changeBasisPoints >= 0 ? '+' : ''}${(data.comparison.changeBasisPoints / 100).toLocaleString('es-AR')}% frente al mes anterior`}
              </small>
              <small>
                Anterior: {dayLabel(data.period.previousFrom)} · {dayLabel(data.period.previousTo)}{' '}
                · {formatMoney(data.comparison.previous.netCents)}
              </small>
            </article>
            <div className="dashboard-metrics-secondary">
              <article>
                <span>Ventas</span>
                <strong>
                  <AnimatedValue value={data.totals.saleCount.toLocaleString('es-AR')} />
                </strong>
                <small>
                  {data.totals.saleCount === 1 ? 'Venta completada' : 'Ventas completadas'}
                </small>
              </article>
              <article>
                <span>Ticket promedio</span>
                <strong>
                  <AnimatedValue value={formatMoney(data.totals.averageCents)} />
                </strong>
                <small>Por venta completada</small>
              </article>
              {profitabilityEnabled && (
                <article>
                  <span>Margen bruto conocido</span>
                  <strong>{formatMoney(data.profitability.grossMarginCents)}</strong>
                  <small>
                    {data.profitability.coverageBasisPoints < 10000
                      ? `${(data.profitability.coverageBasisPoints / 100).toLocaleString('es-AR')}% de ${data.profitability.coverageBasis === 'ABSOLUTE_MOVEMENT_NET' ? 'movimientos' : 'ventas'} con costo registrado · Parcial`
                      : 'Costos registrados completos'}
                  </small>
                  <small>No es ganancia neta</small>
                </article>
              )}
            </div>
          </div>
          <button
            type="button"
            className="button secondary"
            aria-expanded={exploring}
            onClick={() => setExploring(!exploring)}
          >
            Explorar períodos
          </button>
          {exploring && <PeriodComparison key={month} monthlyReport={data} />}

          <DailySalesChart key={month} report={data} {...(onOpenDay ? { onOpenDay } : {})} />
          <div className="results-analysis-grid">
            <TopProducts report={data} />
            <TopCategories report={data} />
            <PaymentBreakdown report={data} />
          </div>

          {profitabilityEnabled && (
            <details className="profitability-panel dashboard-panel" aria-label="Rentabilidad">
              <summary>Detalle del margen conocido</summary>
              <div className="profitability-heading">
                <div>
                  <h2>Margen bruto</h2>
                </div>
                <span
                  className={
                    data.profitability.coverageBasisPoints < 10000 ? 'coverage partial' : 'coverage'
                  }
                >
                  {data.profitability.coverageBasisPoints / 100}% cubierto
                </span>
              </div>
              <div className="profitability-metrics">
                {data.profitability.coverageBasisPoints < 10000 && (
                  <article>
                    <span>Neto de movimientos con costo</span>
                    <strong>{formatMoney(data.profitability.coveredNetCents)}</strong>
                  </article>
                )}
                <article>
                  <span>Costo de mercadería</span>
                  <strong>{formatMoney(data.profitability.knownCostCents)}</strong>
                </article>
                <article className="profitability-primary">
                  <span>Margen bruto conocido</span>
                  <strong>
                    <AnimatedValue value={formatMoney(data.profitability.grossMarginCents)} />
                  </strong>
                </article>
              </div>
              {data.profitability.missingLineCount > 0 && (
                <p>
                  {data.profitability.missingLineCount}{' '}
                  {data.profitability.missingLineCount === 1
                    ? 'renglón sin costo'
                    : 'renglones sin costo'}
                  . El margen considera solamente los movimientos con costo conocido.
                </p>
              )}
              <small>No incluye gastos, impuestos ni comisiones.</small>
              {data.profitability.products.length > 0 && (
                <details className="profitability-breakdown">
                  <summary>Ver margen por producto y categoría</summary>
                  <div className="profitability-breakdown-grid">
                    <div>
                      <h3>Productos</h3>
                      {data.profitability.products.slice(0, 8).map((item) => (
                        <div className="profitability-row" key={item.id}>
                          <span>{item.name}</span>
                          <strong>
                            {item.coverageBasisPoints === 0
                              ? 'Sin costo'
                              : formatMoney(item.grossMarginCents)}
                          </strong>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3>Categorías</h3>
                      {data.profitability.categories.slice(0, 8).map((item) => (
                        <div className="profitability-row" key={item.id}>
                          <span>{item.name}</span>
                          <strong>
                            {item.coverageBasisPoints === 0
                              ? 'Sin costo'
                              : formatMoney(item.grossMarginCents)}
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </details>
          )}
          <details className="dashboard-panel results-breakdown">
            <summary>Desglose de ventas</summary>
            <div className="dashboard-secondary-facts">
              <span>
                Venta bruta <strong>{formatMoney(data.totals.grossCents)}</strong>
              </span>
              <span>
                Descuentos <strong>{formatMoney(data.totals.discountCents)}</strong>
              </span>
              <span>
                Anuladas{' '}
                <strong data-testid="monthly-voided">{formatMoney(data.totals.voidedCents)}</strong>{' '}
                · {data.totals.voidedCount} operaciones
              </span>
            </div>
            <p>
              El neto descuenta las devoluciones confirmadas. Los cobros de deuda no son ventas
              nuevas.
            </p>
          </details>
          {onOpenStock && (
            <aside className="dashboard-inventory-link">
              <button className="button ghost" onClick={onOpenStock}>
                Ver inventario actual{locationsEnabled ? ' y ubicaciones' : ''}
              </button>
              <small>
                Existencias actuales al{' '}
                {new Date(data.generatedAt).toLocaleDateString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                })}
                ; fuera del período histórico.
              </small>
              <details>
                <summary>Exportar reposición actual</summary>
                <ExportButton dataset="lowStock" filters={{ month }} />
                {locationsEnabled && (
                  <ExportButton
                    dataset="locations"
                    filters={{ month }}
                    label="Ubicaciones y movimientos · Excel"
                  />
                )}
              </details>
            </aside>
          )}
          <p className="dashboard-note">
            Último movimiento:{' '}
            {data.lastChangedAt
              ? new Date(data.lastChangedAt).toLocaleString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                })
              : 'sin actividad'}
          </p>
        </>
      )}
      {data && printing && (
        <MonthlyReportPrint
          report={data}
          profitabilityEnabled={profitabilityEnabled}
          onClose={() => setPrinting(false)}
        />
      )}
    </>
  );
}
