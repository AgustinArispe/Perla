import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeading } from '../../components/PageHeader';
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { WeeklySummary } from '../../../shared/commercial-control';
import { formatMoney } from '../../../domain/values';
import { errorMessage } from '../../api';
import { controlValue, downloadControlExcel } from './client';
import { perlaBrandArtwork as logo } from '../../components/PerlaBrand';
const today = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const shift = (s: string, n: number) =>
  new Date(Date.parse(s + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
const monday = (s: string) => shift(s, -((new Date(s + 'T12:00:00Z').getUTCDay() + 6) % 7));
const escape = (value: unknown) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
function printReport(w: WeeklySummary) {
  const frame = document.createElement('iframe');
  frame.title = 'Resumen semanal para imprimir';
  frame.style.position = 'fixed';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.opacity = '0';
  const rows = [
    ['Ventas netas', formatMoney(w.totals.netCents)],
    ['Operaciones', w.totals.saleCount],
    ['Margen bruto conocido', formatMoney(w.profitability.grossMarginCents)],
    ['Cobertura de costo', `${w.profitability.coverageBasisPoints / 100}%`],
  ];
  frame.srcdoc = `<!doctype html><html lang="es"><head><title>Perla · Resumen semanal</title><style>@page{size:A4;margin:18mm}body{font:14px Arial;color:#152b36}header{background:#fff;color:#152b36;border-bottom:2px solid #b38b47;padding:18px 0;display:flex;gap:16px;align-items:center;print-color-adjust:exact}header .print-logo{position:relative;display:block;flex:none;width:72px;height:72px;overflow:hidden;background:#fff}header img{position:absolute;top:-27px;left:-11px;width:94px;height:141px;max-width:none}header strong{font:700 26px Arial}header small{display:block;color:#596970}h1{font:26px Arial}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;padding:12px 0;border-bottom:1px solid #ddd;overflow-wrap:anywhere}td{text-align:right;font-variant-numeric:tabular-nums}article{break-inside:avoid}small{line-height:1.6}</style></head><body><header><span class="print-logo"><img src="${escape(new URL(logo, location.href).href)}" alt=""/></span><div><strong>Perla</strong><small>Perla Negra · Pescados y mariscos</small></div></header><article><h2>Resumen semanal${w.partial ? ' · Parcial' : ''}</h2><p>${escape(w.from)} al ${escape(w.to)}</p><small>${w.source === 'LIVE' ? 'Consulta en vivo' : `Versión ${w.version}`} · Generado ${escape(w.generatedAt)}</small><table>${rows.map(([a, b]) => `<tr><th>${escape(a)}</th><td>${escape(b)}</td></tr>`).join('')}</table><p>Devoluciones descontadas de ventas netas. Los cobros de deuda no son ventas nuevas. El margen considera únicamente líneas con costo conocido y no incluye gastos, impuestos ni comisiones.</p><h3>Pendientes al generar</h3>${w.pending.length ? w.pending.map((p) => `<p>${escape(p.name)}: ${escape(p.unit === 'KG' ? `${p.quantityBase / 1000} kg` : `${p.quantityBase} unidades`)} disponibles</p>`).join('') : '<p>Sin pendientes de stock.</p>'}</article></body></html>`;
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 60000);
  };
  document.body.append(frame);
}
export function WeeklyPanel({ onBack }: { onBack?: () => void }) {
  const [start, setStart] = useState(() => shift(monday(today()), -7));
  const [live, setLive] = useState(false);
  const [version, setVersion] = useState<number | undefined>();
  const [error, setError] = useState('');
  const input = { weekStart: start, live, ...(version ? { version } : {}) };
  const report = useQuery({
    queryKey: ['control-weekly', input],
    queryFn: () => controlValue<WeeklySummary>('commercial', 'weekly.get', input),
    retry: false,
  });
  const versions = useQuery({
    queryKey: ['weekly-versions', start, report.data?.version],
    queryFn: () =>
      controlValue<{ version: number; generatedAt: string }[]>('commercial', 'weekly.versions', {
        weekStart: start,
      }),
    retry: false,
    enabled: !live,
  });
  const recalculate = useMutation({
    mutationFn: () =>
      controlValue<WeeklySummary>('commercial', 'weekly.recalculate', {
        weekStart: start,
        operationKey: crypto.randomUUID(),
      }),
    onSuccess: () => {
      setVersion(undefined);
      void report.refetch();
      void versions.refetch();
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const excel = useMutation({
    mutationFn: () =>
      downloadControlExcel(
        'commercial',
        { ...input, ...(!live && report.data ? { version: report.data.version } : {}) },
        'exportWeekly',
      ),
    onError: (e) => setError(errorMessage(e)),
  });
  const w = report.data;
  return (
    <>
      <PageHeading className="page-heading">
        <h1>Resumen semanal</h1>
        {onBack && (
          <button className="button secondary" onClick={onBack}>
            Volver
          </button>
        )}
      </PageHeading>
      <section className="panel weekly-report">
        <div className="movement-filters">
          <label className="field">
            Semana que empieza
            <input
              type="date"
              value={start}
              max={today()}
              onChange={(e) => {
                if (e.target.value) {
                  const s = monday(e.target.value);
                  setStart(s);
                  setLive(shift(s, 6) >= today());
                  setVersion(undefined);
                }
              }}
            />
          </label>
          <button
            className="button secondary"
            onClick={() => {
              setStart(monday(today()));
              setLive(true);
              setVersion(undefined);
            }}
          >
            Semana en curso
          </button>
          {!live && (
            <details className="weekly-version-detail">
              <summary>Versiones guardadas</summary>
              <label className="field">
                Versión
                <select
                  value={version ?? ''}
                  onChange={(e) => setVersion(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Última versión</option>
                  {versions.data?.map((v) => (
                    <option key={v.version} value={v.version}>
                      Versión {v.version} · {v.generatedAt.slice(0, 10)}
                    </option>
                  ))}
                </select>
              </label>
            </details>
          )}
        </div>
        {(error || report.isError) && (
          <div className="alert error" role="alert">
            {error || errorMessage(report.error)}
            <button
              className="button secondary"
              onClick={() => {
                setError('');
                void report.refetch();
              }}
            >
              Reintentar
            </button>
          </div>
        )}
        {report.isPending && <PerlaLoading size="compact" label="Preparando resumen…" />}
        {w && (
          <>
            <header>
              <h2>
                {w.from} al {w.to}
                {w.partial ? ' · Semana parcial' : ''}
              </h2>
              <details>
                <summary>
                  {w.source === 'LIVE'
                    ? 'Consulta en vivo'
                    : `Resumen guardado · Versión ${w.version}`}
                </summary>
                <p>
                  {w.source === 'LIVE'
                    ? 'Consulta en vivo'
                    : `Resumen guardado · Versión ${w.version}`}{' '}
                  · Generado {new Date(w.generatedAt).toLocaleString('es-AR')}
                </p>
              </details>
            </header>
            <dl className="weekly-totals">
              <div>
                <dt>Ventas netas</dt>
                <dd>{formatMoney(w.totals.netCents)}</dd>
              </div>
              <div>
                <dt>Operaciones</dt>
                <dd>{w.totals.saleCount}</dd>
              </div>
              <div>
                <dt>Margen bruto conocido</dt>
                <dd>{formatMoney(w.profitability.grossMarginCents)}</dd>
                <small>
                  {w.profitability.coverageBasisPoints / 100}% de{' '}
                  {w.profitability.coverageBasis === 'ABSOLUTE_MOVEMENT_NET'
                    ? 'movimientos'
                    : 'ventas'}{' '}
                  con costo registrado
                  {w.profitability.coverageBasisPoints < 10000 ? ' · Parcial' : ''} · No es ganancia
                  neta
                </small>
              </div>
              <div>
                <dt>Ticket promedio</dt>
                <dd>
                  {formatMoney(
                    w.totals.saleCount ? Math.round(w.totals.netCents / w.totals.saleCount) : 0,
                  )}
                </dd>
              </div>
            </dl>
            <p>
              {w.changeBasisPoints === null
                ? 'Sin base para comparar'
                : `${w.changeBasisPoints / 100}% respecto al mismo período de la semana anterior.`}
            </p>
            <details>
              <summary>Cómo se calculan las cifras</summary>
              <p>
                Ventas completadas menos devoluciones. Los cobros de deudas se mantienen separados.
                El margen usa solo líneas con costo conocido; {w.profitability.missingLineCount}{' '}
                líneas sin costo. No incluye gastos, impuestos ni comisiones.
              </p>
            </details>
            <details>
              <summary>Pendientes al generar ({w.pending.length})</summary>
              {w.pending.length ? (
                <ul>
                  {w.pending.map((p) => (
                    <li key={p.productId}>
                      {p.name}:{' '}
                      {p.unit === 'KG'
                        ? `${p.quantityBase / 1000} kg`
                        : `${p.quantityBase} unidades`}{' '}
                      disponibles
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Sin pendientes de stock.</p>
              )}
            </details>
            <div className="dialog-actions">
              <button
                className="button secondary"
                disabled={excel.isPending}
                onClick={() => excel.mutate()}
              >
                Descargar Excel
              </button>
              <button className="button secondary" onClick={() => printReport(w)}>
                Imprimir / Guardar PDF
              </button>
              {!live && (
                <details className="weekly-recalculate">
                  <summary>Actualizar informe guardado</summary>
                  <p>Genera una nueva versión y conserva las anteriores.</p>
                  <button
                    className="button secondary"
                    disabled={recalculate.isPending}
                    onClick={() => recalculate.mutate()}
                  >
                    Recalcular conservando versión
                  </button>
                </details>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
