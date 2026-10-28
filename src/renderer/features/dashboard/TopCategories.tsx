import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { categoryShares, TOP_CATEGORIES_LIMIT } from './chart-data';
import { ProductShareChart } from './ProductShareChart';
import { useState } from 'react';
import { rankCategories, type RankingLimit } from '../../../domain/ranking';
import { RankingLimitSelect } from './RankingLimitSelect';
import { ExportButton } from '../../components/ExportButton';
export function TopCategories({ report }: { report: MonthlyReport }) {
  const rows = report.categorySales;
  const [limit, setLimit] = useState<RankingLimit>(TOP_CATEGORIES_LIMIT);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const selected = rankCategories(rows ?? [], limit);
  const share = categoryShares(rows ?? [], limit);
  const negative = rows?.filter((row) => row.netCents < 0) ?? [];
  return (
    <section className="dashboard-panel results-categories results-ranking">
      <div className="dashboard-panel-heading">
        <h2>Categorías más vendidas</h2>
      </div>
      <div className="ranking-toolbar">
        <div className="field">
          <span>Ordenar por</span>
          <span className="ranking-static-order">Importe vendido</span>
        </div>
        <RankingLimitSelect value={limit} onChange={setLimit} categories />
      </div>
      <div className="ranking-visual">
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
              {selected.map((row) => (
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
      </div>
      <div className="ranking-panel-footer">
        {selected.length > 0 && (
          <details
            className="results-table-detail"
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary>Ver detalle de las {selected.length} categorías principales</summary>
            {detailsOpen && (
              <div className="ranking-table">
                <table>
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.map((row) => (
                      <tr key={row.name}>
                        <td>{row.name}</td>
                        <td>{formatMoney(row.netCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </details>
        )}
        <ExportButton
          dataset="ranking"
          filters={{ month: report.month, rank: 'categories', topCount: limit }}
          label={`Exportar Top ${limit} categorías`}
        />
      </div>
    </section>
  );
}
