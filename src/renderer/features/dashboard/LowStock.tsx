import type { MonthlyReport } from '../../../shared/reports';
import { formatStock } from '../../../domain/inventory';
export function LowStock({ report }: { report: MonthlyReport }) {
  return (
    <section className="dashboard-panel">
      <h2>Stock bajo · actual</h2>
      <p>
        Existencias de hoy, independiente del mes elegido. {report.lowStock.length} productos para
        revisar.
      </p>
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
            {report.lowStock.slice(0, 100).map((p) => (
              <tr key={p.productId}>
                <td>{p.name}</td>
                <td>
                  <strong className={p.quantityBase <= 0 ? 'stock-warning' : ''}>
                    {formatStock(p.quantityBase, p.unit)}
                  </strong>
                </td>
                <td>{formatStock(p.minStockBase, p.unit)}</td>
                <td>{formatStock(p.soldBase, p.unit)}</td>
                <td>
                  {p.state === 'NEGATIVE'
                    ? 'Revisar existencia negativa'
                    : p.state === 'EMPTY'
                      ? 'Sin existencias'
                      : 'En el mínimo o por debajo'}
                  {p.revenueRank !== null && (
                    <small>Puesto {p.revenueRank} por facturación del mes</small>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!report.lowStock.length && <p>No hay productos con stock bajo conocido.</p>}
      {report.lowStock.length > 100 && (
        <p>Se muestran los primeros 100. Consultá el módulo Stock para revisar el resto.</p>
      )}
    </section>
  );
}
