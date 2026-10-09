import { ExportButton } from '../../components/ExportButton';
import { useQuery } from '@tanstack/react-query';
import { api, errorMessage, unwrap } from '../../api';
import { formatMoney } from '../../../domain/values';
import { Icon } from '../../components/Icon';
export function LocationSummary({ month }: { month: string }) {
  const report = useQuery({
    queryKey: ['location-summary', month],
    queryFn: async () => unwrap(await api().locations.summary(month)),
    retry: false,
  });
  return (
    <section className="dashboard-panel location-summary-panel">
      <div className="dashboard-panel-heading">
        <h2>Mercadería por ubicación</h2>
        <ExportButton dataset="locations" filters={{ month }} />
      </div>
      {report.isPending && <p role="status">Consultando ubicaciones…</p>}
      {report.isError && <p role="alert">{errorMessage(report.error)}</p>}
      <div className="location-summary-grid">
        {report.data?.locations.map((location) => (
          <article key={location.id}>
            <header>
              <Icon name="stock" size={20} />
              <strong>{location.name}</strong>
            </header>
            <div className="location-summary-facts">
              <span>
                <b>{location.quantityUnits.toLocaleString('es-AR')}</b> unidades
              </span>
              <span>
                <b>
                  {(location.quantityGrams / 1000).toLocaleString('es-AR', {
                    maximumFractionDigits: 2,
                  })}
                </b>{' '}
                kg
              </span>
            </div>
            <div className="location-summary-transit">
              <span>{location.incomingTransfers} por recibir</span>
              <span>{location.outgoingTransfers} en envío</span>
            </div>
            {location.lowStockCount > 0 && (
              <small className="stock-warning">
                {location.lowStockCount} artículos bajo mínimo
              </small>
            )}
            {location.hasTerminal && (
              <div className="location-summary-sales">
                <span>{location.saleCount} ventas</span>
                <strong>{formatMoney(location.netCents)}</strong>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
