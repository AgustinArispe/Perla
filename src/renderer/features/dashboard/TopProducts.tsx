import { useState } from 'react';
import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { productShares } from './chart-data';
import { ProductShareChart, shareColors } from './ProductShareChart';
import { ExportButton } from '../../components/ExportButton';
export function TopProducts({ report }: { report: MonthlyReport }) {
  const [kind, setKind] = useState<'revenue' | 'units' | 'kilos'>('revenue');
  const allRows = report.rankings[kind];
  const valueOf = (row: (typeof allRows)[number]) =>
    kind === 'revenue' ? row.netCents : row.quantityBase;
  const negatives = allRows.filter((row) => valueOf(row) < 0);
  const rows = [
    ...allRows.filter((row) => valueOf(row) >= 0).slice(0, 5),
    ...negatives.slice(0, 5),
  ];
  const share = productShares(report.rankings[kind], kind);
  const format = (value: number) =>
    kind === 'revenue' ? formatMoney(value) : formatStock(value, kind === 'kilos' ? 'KG' : 'UNIT');
  const max = Math.max(
    1,
    ...rows.map((row) => Math.abs(kind === 'revenue' ? row.netCents : row.quantityBase)),
  );
  return (
    <section className="dashboard-panel results-products">
      <div className="dashboard-panel-heading">
        <h2>Productos más vendidos</h2>
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
      </div>
      {share.drawable && (
        <>
          <p className="results-panel-context">
            Participación sobre {format(share.total)} · todos los productos{' '}
            {kind === 'kilos' ? 'por kilo' : kind === 'units' ? 'por unidad' : 'del período'}
          </p>
          <ProductShareChart share={share} format={format} />
        </>
      )}
      {!share.drawable && rows.length > 0 && (
        <p className="results-panel-context">
          Hay movimientos negativos o sin importe. El ranking conserva sus signos; no corresponde
          representarlo como una dona. Neto de todos los productos: {format(share.total)}.
          {negatives.length > 0 &&
            ` ${negatives.length} productos con neto negativo: ${format(negatives.reduce((sum, row) => sum + valueOf(row), 0))}.`}
        </p>
      )}
      {rows.length > 0 && (
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
      {rows.length > 0 && (
        <details className="results-table-detail">
          <summary>Ver todos los productos ({allRows.length})</summary>
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
                {allRows.map((p) => (
                  <tr key={p.productId + p.unit}>
                    <td>{p.name}</td>
                    <td>{formatStock(p.quantityBase, p.unit)}</td>
                    <td>{formatMoney(p.netCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
      {!rows.length && <p className="dashboard-empty">No hay ventas en este grupo.</p>}
      <ExportButton
        dataset="ranking"
        filters={{ month: report.month, rank: kind }}
        label="Exportar este ranking"
      />
    </section>
  );
}
