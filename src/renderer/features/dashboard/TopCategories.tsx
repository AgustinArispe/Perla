import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { categoryShares, TOP_CATEGORIES_LIMIT } from './chart-data';
import { ProductShareChart } from './ProductShareChart';
export function TopCategories({ report }: { report: MonthlyReport }) {
  const rows = report.categorySales;
  const share = categoryShares(rows ?? []);
  const negative = rows?.filter((row) => row.netCents < 0) ?? [];
  return (
    <section className="dashboard-panel results-categories">
      <div className="dashboard-panel-heading">
        <h2>Categorías más vendidas</h2>
        <span className="pill">Top {TOP_CATEGORIES_LIMIT} · importe neto</span>
      </div>
      {share.drawable ? (
        <>
          <p className="results-panel-context">
            Participación entre las {share.segments.length} categorías principales ·{' '}
            {formatMoney(share.total)}.
            {share.omittedCount > 0 &&
              ` Representan el ${((share.total * 100) / share.periodTotal).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% del período. Las demás categorías no se incluyen en esta dona.`}
          </p>
          <ProductShareChart share={share} format={formatMoney} categories />
        </>
      ) : negative.length ? (
        <>
          <p className="results-panel-context">
            Hay {negative.length} categorías con neto negativo. No se dibuja una dona para no
            ocultar devoluciones. Neto de todas las categorías: {formatMoney(share.periodTotal)}.
          </p>
          <ol className="results-category-ranking">
            {[...rows!]
              .sort((a, b) => b.netCents - a.netCents || a.name.localeCompare(b.name))
              .slice(0, TOP_CATEGORIES_LIMIT)
              .map((row) => (
                <li key={row.name}>
                  <span>{row.name}</span>
                  <strong>{formatMoney(row.netCents)}</strong>
                </li>
              ))}
          </ol>
        </>
      ) : (
        <p className="dashboard-empty">
          {rows
            ? 'No hay ventas por categoría en este período.'
            : 'Actualizá el reporte para consultar las categorías.'}
        </p>
      )}
      <p className="results-panel-context">
        Se usa la categoría registrada al vender, incluyendo devoluciones del período. Los artículos
        sin clasificación figuran como “Sin categoría”.
      </p>
    </section>
  );
}
