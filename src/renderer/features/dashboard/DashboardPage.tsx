import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap, errorMessage } from '../../api';
import { formatMoney } from '../../../domain/values';
import { PaymentBreakdown } from './PaymentBreakdown';
import { TopProducts } from './TopProducts';
import { LowStock } from './LowStock';
export function DashboardPage() {
  const [month, setMonth] = useState(() =>
    new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date()),
  );
  const report = useQuery({
    queryKey: ['dashboard', month],
    queryFn: async () => unwrap(await api().dashboard.monthly(month)),
    enabled: /^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month),
    retry: false,
  });
  const data = report.data;
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Resumen mensual</h1>
          <p>Ventas completadas y existencias para revisar.</p>
        </div>
        <label className="field">
          Mes
          <input
            aria-label="Mes"
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
          />
        </label>
      </div>
      {report.isError && (
        <div className="alert error" role="alert">
          {errorMessage(report.error)}{' '}
          <button className="button secondary small" onClick={() => void report.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {report.isPending && month && <p>Consultando el mes…</p>}
      {data && (
        <>
          <div className="dashboard-metrics">
            <article>
              <span>Vendido neto</span>
              <strong data-testid="monthly-net">{formatMoney(data.totals.netCents)}</strong>
              <small>{data.totals.saleCount} ventas completadas</small>
            </article>
            <article>
              <span>Ticket promedio</span>
              <strong>{formatMoney(data.totals.averageCents)}</strong>
              <small>Por venta completada</small>
            </article>
            <article>
              <span>Tarjeta</span>
              <strong data-testid="monthly-card">{formatMoney(data.cardCents)}</strong>
              <small>Débito + crédito</small>
            </article>
            <article>
              <span>Ventas anuladas</span>
              <strong data-testid="monthly-voided">{formatMoney(data.totals.voidedCents)}</strong>
              <small>{data.totals.voidedCount} operaciones excluidas</small>
            </article>
          </div>
          <div className="dashboard-period">
            <div>
              <strong>
                {data.period.open ? 'Mes en curso' : 'Período seleccionado'} · {data.period.from} al{' '}
                {data.period.to}
              </strong>
              <p>
                Bruto {formatMoney(data.totals.grossCents)} · Descuentos{' '}
                {formatMoney(data.totals.discountCents)}
              </p>
            </div>
            <div>
              <strong>
                {data.comparison.changeBasisPoints === null
                  ? 'Sin base de comparación'
                  : `${(data.comparison.changeBasisPoints / 100).toLocaleString('es-AR')}% frente al período anterior`}
              </strong>
              <p>
                {data.period.previousFrom} al {data.period.previousTo} ·{' '}
                {formatMoney(data.comparison.previous.netCents)}
              </p>
            </div>
          </div>
          <div className="dashboard-grid">
            <PaymentBreakdown report={data} />
            <TopProducts report={data} />
          </div>
          <section className="dashboard-panel">
            <h2>Ventas por día</h2>
            <div className="daily-chart" aria-label="Importe neto vendido por día">
              {data.daily.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date} · ${formatMoney(d.netCents)} · ${d.saleCount} ventas`}
                >
                  <div>
                    <span
                      style={{
                        height: `${Math.max(...data.daily.map((day) => day.netCents), 1) ? (100 * d.netCents) / Math.max(...data.daily.map((day) => day.netCents), 1) : 0}%`,
                      }}
                    />
                  </div>
                  <small>{d.date.slice(8)}</small>
                </div>
              ))}
            </div>
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
                      <td>{d.date}</td>
                      <td>{d.saleCount}</td>
                      <td>{formatMoney(d.netCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </section>
          <LowStock report={data} />
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
    </>
  );
}
