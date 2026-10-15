import { PerlaLoading } from '../../components/PerlaLoading';
import { ExportButton } from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage, unwrap } from '../../api';
import { formatMoney } from '../../../domain/values';
import type { ComparisonRequest, MonthlyReport } from '../../../shared/reports';
import { AnimatedValue } from './AnimatedValue';

const dateLabel = (value: string) =>
  new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${value}T12:00:00Z`));

export function PeriodComparison({ monthlyReport }: { monthlyReport?: MonthlyReport }) {
  const [preset, setPreset] = useState<ComparisonRequest['preset']>(
    monthlyReport ? 'CUSTOM' : 'MONTH',
  );
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [from, setFrom] = useState(monthlyReport?.period.from ?? `${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(monthlyReport?.period.to ?? today);
  const input: ComparisonRequest = preset === 'CUSTOM' ? { preset, from, to } : { preset };
  const valid = preset !== 'CUSTOM' || (Boolean(from) && Boolean(to) && from <= to);
  const query = useQuery({
    queryKey: ['dashboard-comparison', input],
    queryFn: async () => unwrap(await api().dashboard.compare(input)),
    enabled: valid,
    retry: false,
  });
  const data = query.data;
  return (
    <section className="period-comparison dashboard-panel" aria-labelledby="comparison-title">
      <div className="comparison-header">
        {valid && (data || preset === 'CUSTOM') && (
          <ExportButton
            dataset="comparison"
            filters={{
              preset: 'CUSTOM',
              from: data?.period.from ?? from,
              to: data?.period.to ?? to,
            }}
          />
        )}
        <div>
          <h2 id="comparison-title">Explorar períodos</h2>
        </div>
        <div className="comparison-presets" role="group" aria-label="Período a comparar">
          {(
            [
              ['TODAY', 'Hoy'],
              ['WEEK', 'Semana'],
              ['MONTH', 'Mes'],
              ['CUSTOM', 'Rango'],
            ] as const
          ).map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={preset === value ? 'selected' : ''}
              aria-pressed={preset === value}
              onClick={() => setPreset(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {preset === 'CUSTOM' && (
        <div className="comparison-dates">
          <label className="field">
            Desde
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="field">
            Hasta
            <input
              type="date"
              value={to}
              min={from || undefined}
              max={today}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
      )}
      {!data && query.isError && (
        <div className="alert error" role="alert">
          {errorMessage(query.error)}
        </div>
      )}
      {!data && query.isPending && valid && (
        <PerlaLoading size="panel" label="Calculando comparación…" />
      )}
      <p className="dashboard-note">
        Comparación con el tramo inmediatamente anterior de igual duración.
      </p>
      {data && (
        <div className="comparison-result">
          {
            <article>
              <span>
                {dateLabel(data.period.from)} — {dateLabel(data.period.to)}
              </span>
              <strong>
                <AnimatedValue value={formatMoney(data.current.netCents)} />
              </strong>
              <small>
                {data.current.saleCount} {data.current.saleCount === 1 ? 'venta' : 'ventas'} ·
                ticket {formatMoney(data.current.averageCents)}
              </small>
            </article>
          }
          <div className="comparison-change">
            <span
              className={
                data.changeBasisPoints === null
                  ? 'neutral'
                  : data.changeBasisPoints >= 0
                    ? 'positive'
                    : 'negative'
              }
            >
              {data.changeBasisPoints === null
                ? 'Sin base de comparación'
                : `${data.changeBasisPoints >= 0 ? '+' : ''}${(data.changeBasisPoints / 100).toLocaleString('es-AR')}%`}
            </span>
            <small>
              Anterior: {dateLabel(data.period.previousFrom)} — {dateLabel(data.period.previousTo)}{' '}
              · {formatMoney(data.previous.netCents)}
            </small>
          </div>
        </div>
      )}
    </section>
  );
}
