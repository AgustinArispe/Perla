import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { Icon } from '../../components/Icon';
import { alignDaily, chartExtent } from './chart-data';

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
export function reportDay(value: string) {
  return dateFormat.format(new Date(value + 'T12:00:00Z'));
}
const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 });

export function DailySalesChart({
  report,
  onOpenDay,
}: {
  report: MonthlyReport;
  onOpenDay?: (date: string) => void;
}) {
  const [compare, setCompare] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [motion, setMotion] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const previous = report.previousDaily ?? [];
  const positions = alignDaily(report.daily, compare ? previous : []);
  const values = [
    ...report.daily.map((d) => d.netCents),
    ...(compare ? previous.map((d) => d.netCents) : []),
  ];
  const extent = chartExtent(values),
    range = extent.max - extent.min;
  const top = (value: number) => (100 * (extent.max - value)) / range;
  const zero = top(0);
  const peak = Math.max(0, ...report.daily.map((d) => d.netCents));
  const selected = report.daily.find((d) => d.date === selectedDate);
  const prior = selected ? previous[report.daily.indexOf(selected)] : undefined;
  const hasActivity = values.some((value) => value !== 0);
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 700px)');
    let frame = 0;
    const revealLatestDays = () => {
      cancelAnimationFrame(frame);
      if (narrow.matches)
        frame = requestAnimationFrame(() => {
          const chart = chartRef.current;
          if (chart) chart.scrollLeft = chart.scrollWidth;
        });
    };
    revealLatestDays();
    narrow.addEventListener('change', revealLatestDays);
    return () => {
      cancelAnimationFrame(frame);
      narrow.removeEventListener('change', revealLatestDays);
    };
  }, [report.period.to]);
  const barStyle = (value: number) => ({
    top: `${Math.min(top(value), zero)}%`,
    height: `${(100 * Math.abs(value)) / range}%`,
  });
  return (
    <section className="dashboard-panel results-daily" aria-label="Ventas diarias">
      <div className="results-panel-heading">
        <div>
          <h2>Ventas por día</h2>
          <p>
            {reportDay(report.period.from)} al {reportDay(report.period.to)} ·{' '}
            {report.period.open ? 'Mes en curso' : 'Mes completo'}
          </p>
        </div>
        {previous.length > 0 && (
          <label className="results-compare-toggle">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Comparar con el mes anterior
          </label>
        )}
      </div>
      <div className="results-chart-key">
        <span>
          <i />
          Período elegido
        </span>
        {compare && (
          <span>
            <i className="previous" />
            {reportDay(report.period.previousFrom)} al {reportDay(report.period.previousTo)}
          </span>
        )}
        {peak > 0 && (
          <span className="results-best-day">
            Mejor día: {reportDay(report.daily.find((d) => d.netCents === peak)!.date)} ·{' '}
            {formatMoney(peak)}
          </span>
        )}
      </div>
      {!hasActivity ? (
        <div className="dashboard-empty-chart" role="status">
          {report.totals.saleCount === 0
            ? 'Todavía no hay ventas en este mes.'
            : 'Las ventas de este mes no tienen importe neto.'}
        </div>
      ) : (
        <>
          <div className="results-plot-layout">
            <div className="results-axis" aria-hidden="true">
              {extent.ticks.map((tick) => (
                <span key={tick} style={{ top: `${top(tick)}%` }}>
                  {tick === 0 ? '$ 0' : '$ ' + compact.format(tick / 100)}
                </span>
              ))}
            </div>
            <div
              className="results-plot-scroll"
              ref={chartRef}
              tabIndex={0}
              aria-label="Importe neto vendido por día"
            >
              <div
                className="results-plot"
                style={
                  {
                    gridTemplateColumns: `repeat(${positions.length}, minmax(22px, 1fr))`,
                    '--days': positions.length,
                  } as CSSProperties
                }
              >
                <div className="results-gridlines" aria-hidden="true">
                  {extent.ticks.map((tick) => (
                    <span
                      key={tick}
                      className={tick === 0 ? 'zero' : ''}
                      style={{ top: `${top(tick)}%` }}
                    />
                  ))}
                </div>
                {positions.map(({ current: day, previous: earlier }, index) => {
                  const key = day?.date ?? 'previous:' + earlier!.date;
                  const description = day
                    ? `${reportDay(day.date)}: ${formatMoney(day.netCents)}, ${day.saleCount} ventas`
                    : `Sin día equivalente en el período elegido; anterior ${reportDay(earlier!.date)}: ${formatMoney(earlier!.netCents)}`;
                  return (
                    <button
                      key={key}
                      type="button"
                      className="daily-chart-day results-day"
                      aria-pressed={selectedDate === key}
                      data-negative={(day?.netCents ?? 0) < 0}
                      data-peak={day?.netCents === peak && peak > 0}
                      onClick={(event) => {
                        setMotion(event.detail !== 0);
                        setSelectedDate(key);
                      }}
                      title={description}
                      aria-label={
                        description +
                        (day && earlier ? `; anterior ${formatMoney(earlier.netCents)}` : '')
                      }
                    >
                      <div className="results-day-track">
                        {earlier && (
                          <span
                            className="results-bar previous"
                            style={barStyle(earlier.netCents)}
                          />
                        )}
                        {day && (
                          <span className="results-bar current" style={barStyle(day.netCents)} />
                        )}
                      </div>
                      <small>
                        {String(index + 1).padStart(2, '0')}
                        {!day ? '*' : ''}
                      </small>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="results-chart-hint">
            Elegí un día para ver su detalle. El neto incluye las devoluciones de esa fecha.
            {compare &&
              previous.length > report.daily.length &&
              ' * Día sin equivalente en el mes elegido.'}
            {onOpenDay &&
              ' El histórico muestra ventas completadas del día; las devoluciones de ventas anteriores se consultan en sus comprobantes.'}
          </p>
          {!selected && compare && selectedDate?.startsWith('previous:') && (
            <div
              className="daily-chart-selection results-day-detail"
              role="status"
              aria-live="polite"
              data-motion="instant"
            >
              <strong>{reportDay(selectedDate.slice(9))}</strong>
              <span>
                Solo mes anterior ·{' '}
                {formatMoney(previous.find((day) => day.date === selectedDate.slice(9))!.netCents)}.
                No existe un día equivalente en el mes elegido.
              </span>
              <button
                className="button ghost small"
                aria-label="Cerrar detalle del día"
                onClick={() => setSelectedDate(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          )}
          {selected && (
            <div
              className="daily-chart-selection results-day-detail"
              data-motion={motion ? 'gentle' : 'instant'}
              role="status"
              aria-live="polite"
            >
              <div>
                <strong>{reportDay(selected.date)}</strong>
                <span>
                  {selected.saleCount} {selected.saleCount === 1 ? 'venta' : 'ventas'}
                </span>
              </div>
              <div>
                <strong>{formatMoney(selected.netCents)}</strong>
                <span>
                  Promedio{' '}
                  {selected.saleCount
                    ? formatMoney(Math.round(selected.netCents / selected.saleCount))
                    : '—'}
                </span>
              </div>
              {compare && prior && (
                <div>
                  <strong>{formatMoney(prior.netCents)}</strong>
                  <span>Anterior · {reportDay(prior.date)}</span>
                </div>
              )}
              {onOpenDay && (
                <button
                  type="button"
                  className="button secondary small"
                  onClick={() => onOpenDay(selected.date)}
                >
                  Ver ventas del día <Icon name="arrow" size={16} />
                </button>
              )}
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
      <details className="results-table-detail">
        <summary>Ver importes diarios</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th>Ventas</th>
                <th>Neto</th>
                {compare && <th>Mes anterior</th>}
              </tr>
            </thead>
            <tbody>
              {positions.map(({ current: day, previous: earlier }, index) => (
                <tr key={index}>
                  <td>{day ? reportDay(day.date) : 'Sin día equivalente'}</td>
                  <td>{day ? day.saleCount : '—'}</td>
                  <td>{day ? formatMoney(day.netCents) : '—'}</td>
                  {compare && (
                    <td>
                      {earlier
                        ? `${reportDay(earlier.date)} · ${formatMoney(earlier.netCents)}`
                        : 'Sin día equivalente'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
