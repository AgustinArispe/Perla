import { ExportButton } from '../../components/ExportButton';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap, errorMessage } from '../../api';
import { formatMoney } from '../../../domain/values';
import { PaymentBreakdown } from './PaymentBreakdown';
import { TopProducts } from './TopProducts';
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
  profitabilityEnabled = false,
  locationsEnabled = false,
}: {
  onOpenStock?: () => void;
  profitabilityEnabled?: boolean;
  locationsEnabled?: boolean;
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [month, setMonth] = useState(() =>
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date()),
  );
  const [printing, setPrinting] = useState(false);
  const [exploring, setExploring] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectionMotion, setSelectionMotion] = useState(true);
  const currentMonth = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
  function selectMonth(value: string) {
    setMonth(value);
    setSelectedDate(null);
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
  const maxDaily = Math.max(0, ...(data?.daily.map((day) => day.netCents) ?? []));
  const maxMagnitude = Math.max(0, ...(data?.daily.map((day) => Math.abs(day.netCents)) ?? []));
  const selectedDay = data?.daily.find((day) => day.date === selectedDate);
  useEffect(() => {
    function showLatestDays() {
      if (!window.matchMedia('(max-width: 700px)').matches) return;
      const chart = chartRef.current;
      if (chart) chart.scrollLeft = chart.scrollWidth - chart.clientWidth;
    }
    showLatestDays();
    window.addEventListener('resize', showLatestDays);
    return () => window.removeEventListener('resize', showLatestDays);
  }, [data?.period.to]);
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <h1>Resumen mensual</h1>
        </div>
        <div className="dashboard-heading-actions">
          <details className="dashboard-export-menu">
            <summary>Exportar</summary>
            <div>
              <ExportButton
                dataset="dashboard"
                filters={{ month }}
                label="Resumen mensual · Excel"
              />
              <ExportButton dataset="payments" filters={{ month }} label="Medios de pago · Excel" />
              <ExportButton
                dataset="ranking"
                filters={{ month, rank: 'revenue' }}
                label="Productos · Excel"
              />
              {profitabilityEnabled && (
                <ExportButton dataset="profitability" filters={{ month }} label="Margen · Excel" />
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
      </div>
      {report.isError && (
        <div className="alert error" role="alert">
          {errorMessage(report.error)}{' '}
          <button className="button secondary small" onClick={() => void report.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {report.isPending && month && (
        <div className="dashboard-loading" role="status" aria-busy="true">
          <span>Consultando el mes…</span>
          <div />
          <div />
          <div />
        </div>
      )}
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
                      ? `${data.profitability.coverageBasisPoints / 100}% de ventas con costo registrado · Parcial`
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

          <section className="dashboard-panel daily-sales-panel">
            <div className="perla-chart-heading">
              <div>
                <h2>Ventas por día</h2>
                <small>
                  Del {dayLabel(data.period.from)} al {dayLabel(data.period.to)}
                  {data.period.open
                    ? ' · Mes en curso; días futuros fuera del informe'
                    : ' · Mes completo'}
                </small>
              </div>
              {maxDaily > 0 && (
                <span>
                  Mejor día{' '}
                  <strong>
                    {dayLabel(data.daily.find((day) => day.netCents === maxDaily)!.date)}
                  </strong>{' '}
                  · {formatMoney(maxDaily)}
                </span>
              )}
            </div>
            {data.daily.some((day) => day.netCents < 0) && (
              <p className="dashboard-note">
                Altura por importe absoluto. Los días con neto negativo llevan signo −.
              </p>
            )}
            {maxMagnitude === 0 ? (
              <div className="dashboard-empty-chart" role="status">
                {data.totals.saleCount === 0
                  ? 'Todavía no hay ventas en este mes.'
                  : 'Las ventas de este mes no tienen importe neto.'}
              </div>
            ) : (
              <>
                <div className="daily-chart-area">
                  <div className="daily-chart-scale">
                    <span>{formatMoney(maxMagnitude)}</span>
                    <span>$ 0</span>
                  </div>
                  <div
                    ref={chartRef}
                    className="daily-chart"
                    aria-label="Importe neto vendido por día"
                    tabIndex={0}
                  >
                    {data.daily.map((d) => (
                      <button
                        key={d.date}
                        type="button"
                        className="daily-chart-day"
                        aria-pressed={selectedDate === d.date}
                        onClick={(event) => {
                          setSelectionMotion(event.detail !== 0);
                          setSelectedDate(d.date);
                        }}
                        data-negative={d.netCents < 0}
                        data-peak={d.netCents === maxDaily && maxDaily > 0}
                        title={`${dayLabel(d.date)} · ${formatMoney(d.netCents)} · ${d.saleCount} ${d.saleCount === 1 ? 'venta' : 'ventas'}`}
                        aria-label={`${dayLabel(d.date)}: ${formatMoney(d.netCents)}, ${d.saleCount} ${d.saleCount === 1 ? 'venta' : 'ventas'}`}
                      >
                        <div>
                          <span
                            style={{
                              height: `${(100 * Math.abs(d.netCents)) / Math.max(maxMagnitude, 1)}%`,
                            }}
                          />
                        </div>
                        <small>{d.date.slice(8)}</small>
                      </button>
                    ))}
                  </div>
                </div>
                {selectedDay && (
                  <div
                    key={selectedDay.date}
                    className="daily-chart-selection"
                    data-motion={selectionMotion ? 'gentle' : 'instant'}
                    role="status"
                    aria-live="polite"
                  >
                    <strong>{dayLabel(selectedDay.date)}</strong>
                    <span>
                      {selectedDay.saleCount.toLocaleString('es-AR')}{' '}
                      {selectedDay.saleCount === 1 ? 'venta' : 'ventas'}
                    </span>
                    <strong>{formatMoney(selectedDay.netCents)}</strong>
                    <span>
                      Promedio{' '}
                      {formatMoney(
                        selectedDay.saleCount
                          ? Math.round(selectedDay.netCents / selectedDay.saleCount)
                          : 0,
                      )}
                    </span>
                    <button
                      type="button"
                      className="button ghost small"
                      aria-label="Cerrar detalle del día"
                      onClick={() => setSelectedDate(null)}
                    >
                      <Icon name="close" size={18} />
                    </button>
                  </div>
                )}
              </>
            )}
            <details>
              <summary>Ver importes diarios</summary>
              <table>
                <thead>
                  <tr>
                    <th>Día</th>
                    <th>Ventas</th>
                    <th>Neto</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((d) => (
                    <tr key={d.date}>
                      <td>{dayLabel(d.date)}</td>
                      <td>{d.saleCount}</td>
                      <td>{formatMoney(d.netCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
          <div className="dashboard-grid">
            <PaymentBreakdown report={data} />
            <TopProducts report={data} />
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
                    <span>Ventas con costo registrado</span>
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
                  . El margen considera la venta cubierta.
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
            Actualizado:{' '}
            {data.lastChangedAt
              ? new Date(data.lastChangedAt).toLocaleString('es-AR', {
                  timeZone: 'America/Argentina/Buenos_Aires',
                })
              : 'sin ventas'}
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
