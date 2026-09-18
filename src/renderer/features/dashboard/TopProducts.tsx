import { useState } from 'react';
import type { MonthlyReport } from '../../../shared/reports';
import { formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
export function TopProducts({ report }: { report: MonthlyReport }) {
  const [kind, setKind] = useState<'revenue' | 'units' | 'kilos'>('revenue');
  const rows = report.rankings[kind].slice(0, 10);
  return (
    <section className="dashboard-panel">
      <div className="dashboard-panel-heading">
        <h2>Productos más vendidos</h2>
        <label className="field">
          Ordenar por
          <select
            aria-label="Ordenar productos"
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
          >
            <option value="revenue">Facturación neta</option>
            <option value="units">Unidades</option>
            <option value="kilos">Kilos</option>
          </select>
        </label>
      </div>
      <p>Primeros 10 · nombres guardados al vender.</p>
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
            <tr key={p.productId}>
              <td>{p.name}</td>
              <td>{formatStock(p.quantityBase, p.unit)}</td>
              <td>{formatMoney(p.netCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p>No hay ventas en este grupo.</p>}
    </section>
  );
}
