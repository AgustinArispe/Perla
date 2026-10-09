import {ExportButton} from '../../components/ExportButton';
import type { MonthlyReport } from "../../../shared/reports";
import { formatStock } from "../../../domain/inventory";
export function LowStock({
  report,
  onOpenStock,
}: {
  report: MonthlyReport;
  onOpenStock?: (() => void) | undefined;
}) {
  return (
    <section className="dashboard-panel low-stock-panel">
      <div className="dashboard-panel-heading"><ExportButton dataset="lowStock" filters={{month:report.month}} />
        <h2>Para reponer</h2>
        {onOpenStock && (
          <button
            type="button"
            className="button secondary small"
            onClick={onOpenStock}
          >
            Ver en Stock
          </button>
        )}
      </div>
      {report.lowStock.length ? (
        <>
          <p>{report.lowStock.length} productos para reponer.</p>
          <div className="dashboard-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Actual</th>
                  <th>Mínimo</th>
                  <th>Venta del mes</th>
                  <th>Prioridad de revisión</th>
                </tr>
              </thead>
              <tbody>
                {report.lowStock.slice(0, 8).map((p) => (
                  <tr key={p.productId}>
                    <td>{p.name}</td>
                    <td>
                      <strong
                        className={p.quantityBase <= 0 ? "stock-warning" : ""}
                      >
                        {formatStock(p.quantityBase, p.unit)}
                      </strong>
                    </td>
                    <td>{formatStock(p.minStockBase, p.unit)}</td>
                    <td>{formatStock(p.soldBase, p.unit)}</td>
                    <td>
                      {p.state === "NEGATIVE"
                        ? "Revisar existencia negativa"
                        : p.state === "EMPTY"
                          ? "Sin existencias"
                          : "En el mínimo o por debajo"}
                      {p.revenueRank !== null && (
                        <small>
                          Puesto {p.revenueRank} por facturación del mes
                        </small>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="dashboard-empty">No hay productos para reponer.</p>
      )}
      {report.lowStock.length > 8 && (
        <p>Mostrando 8 prioridades. Ver todas en Stock.</p>
      )}
    </section>
  );
}
