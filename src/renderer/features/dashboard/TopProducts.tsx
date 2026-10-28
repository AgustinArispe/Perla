import { useState } from 'react';
import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { productShares } from './chart-data';
import { rankProducts, type RankingLimit } from '../../../domain/ranking';
import { RankingLimitSelect } from './RankingLimitSelect';
import { ProductShareChart, shareColors } from './ProductShareChart';
import { ExportButton } from '../../components/ExportButton';
export function TopProducts({ report }: { report: MonthlyReport }) {
  const [kind, setKind] = useState<'revenue' | 'units' | 'kilos'>('revenue');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [limit, setLimit] = useState<RankingLimit>(25);
  const allRows = report.rankings[kind];
  const valueOf = (row: (typeof allRows)[number]) =>
    kind === 'revenue' ? row.netCents : row.quantityBase;
  const negatives = allRows.filter((row) => valueOf(row) < 0);
  const rows = rankProducts(allRows, kind, limit);
  const share = productShares(report.rankings[kind], kind, limit);
  const format = (value: number) =>
    kind === 'revenue' ? formatMoney(value) : formatStock(value, kind === 'kilos' ? 'KG' : 'UNIT');
  const max = Math.max(
    1,
    ...rows.map((row) => Math.abs(kind === 'revenue' ? row.netCents : row.quantityBase)),
  );
  return (
    <section className="dashboard-panel results-products results-ranking">
      <div className="dashboard-panel-heading">
        <h2>Productos más vendidos</h2>
      </div>
      <div className="ranking-toolbar">
        <label className="field">
          Ordenar por
          <select
            aria-label="Ordenar productos"
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
          >
            <option value="revenue">Importe vendido</option>
            <option value="units">Unidades</option>
            <option value="kilos">Kilos</option>
          </select>
        </label>
        <RankingLimitSelect value={limit} onChange={setLimit} />
      </div>
      <div className="ranking-visual">
        {share.drawable && (
          <>
            <p className="results-panel-context">
              Participación entre los {share.segments.length} productos principales ·{' '}
              {format(share.total)}.
              {share.omittedCount > 0 &&
                ` Representan el ${((100 * share.total) / share.periodTotal).toLocaleString('es-AR', { maximumFractionDigits: 1 })}% del período. Los demás productos no se incluyen en esta dona.`}
            </p>
            <ProductShareChart share={share} format={format} />
          </>
        )}
        {!share.drawable && rows.length > 0 && (
          <p className="results-panel-context">
            Hay movimientos negativos o sin importe. El ranking conserva sus signos; no corresponde
            representarlo como una dona. Neto de todos los productos: {format(share.periodTotal)}.
            {negatives.length > 0 &&
              ` ${negatives.length} productos con neto negativo: ${format(negatives.reduce((sum, row) => sum + valueOf(row), 0))}.`}
          </p>
        )}
        {rows.length > 0 && !share.drawable && (
          <ol className="results-product-bars" aria-label="Ranking de productos">
            {rows.map((product, index) => {
              const value = kind === 'revenue' ? product.netCents : product.quantityBase;
              return (
                <li key={product.productId + product.unit}>
                  <div>
                    <span>{product.name}</span>
                    <strong>{format(value)}</strong>
                  </div>
                  <div className="results-rank-track">
                    <i
                      style={{
                        width: `${(100 * Math.abs(value)) / max}%`,
                        background: value < 0 ? 'var(--danger)' : shareColors[index % 5],
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {!rows.length && <p className="dashboard-empty">No hay ventas en este grupo.</p>}
      </div>
      <div className="ranking-panel-footer">
        {rows.length > 0 && (
          <details
            className="results-table-detail"
            onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          >
            <summary>Ver detalle de los {rows.length} productos principales</summary>
            {detailsOpen && (
              <div className="ranking-table">
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p) => (
                      <tr key={p.productId + p.unit}>
                        <td>{p.name}</td>
                        <td>{formatStock(p.quantityBase, p.unit)}</td>
                        <td>{formatMoney(p.netCents)}</td>
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
          filters={{ month: report.month, rank: kind, topCount: limit }}
          label={`Exportar Top ${limit} productos`}
        />
      </div>
    </section>
  );
}
