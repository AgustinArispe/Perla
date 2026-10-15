import { PerlaLoading } from '../../components/PerlaLoading';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { FeatureFlags, FeatureStatus } from '../../../shared/features';
import { errorMessage } from '../../api';
import { Dialog } from '../../components/Dialog';
import { webValue } from '../../web-client';

const featureGroups: { title: string; keys: (keyof FeatureFlags)[] }[] = [
  { title: 'Ventas', keys: ['RECEIPTS', 'RETURNS', 'PROMOTIONS', 'PRODUCT_LABELS'] },
  {
    title: 'Mercadería y compras',
    keys: [
      'STOCK_CONTROL',
      'REPLENISHMENT',
      'SUPPLIERS_PURCHASES',
      'SUPPLIER_ACCOUNTS',
      'LOTS',
      'LOCATIONS_TRANSFERS',
    ],
  },
  { title: 'Clientes', keys: ['CUSTOMERS', 'CUSTOMER_CREDIT'] },
  { title: 'Análisis y seguimiento', keys: ['MONTHLY_DASHBOARD', 'COSTS_MARGIN', 'NOTIFICATIONS'] },
];

export function FeaturesPanel({
  onOpenPurchaseHistory,
}: {
  onOpenPurchaseHistory?: (() => void) | undefined;
}) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['business-features'],
    queryFn: () => webValue<FeatureStatus>('/settings/features'),
    retry: false,
  });
  const [draft, setDraft] = useState<FeatureFlags | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const enabled = draft ?? query.data?.enabled;
  const changed = useMemo(
    () =>
      Boolean(
        enabled &&
        query.data &&
        Object.entries(enabled).some(
          ([key, value]) => query.data!.enabled[key as keyof FeatureFlags] !== value,
        ),
      ),
    [enabled, query.data],
  );
  function toggle(key: keyof FeatureFlags) {
    if (!enabled) return;
    const next = { ...enabled, [key]: !enabled[key] };
    if (key === 'SUPPLIER_ACCOUNTS' && next.SUPPLIER_ACCOUNTS) next.SUPPLIERS_PURCHASES = true;
    if (key === 'SUPPLIERS_PURCHASES' && !next.SUPPLIERS_PURCHASES) next.SUPPLIER_ACCOUNTS = false;
    if (key === 'REPLENISHMENT' && next.REPLENISHMENT) {
      next.STOCK_CONTROL = true;
      next.SUPPLIERS_PURCHASES = true;
    }
    if (
      (key === 'STOCK_CONTROL' && !next.STOCK_CONTROL) ||
      (key === 'SUPPLIERS_PURCHASES' && !next.SUPPLIERS_PURCHASES)
    )
      next.REPLENISHMENT = false;
    if (key === 'CUSTOMER_CREDIT' && next.CUSTOMER_CREDIT) next.CUSTOMERS = true;
    if (key === 'CUSTOMERS' && !next.CUSTOMERS) next.CUSTOMER_CREDIT = false;
    if (key === 'LOCATIONS_TRANSFERS' && next.LOCATIONS_TRANSFERS) next.STOCK_CONTROL = true;
    if (key === 'STOCK_CONTROL' && !next.STOCK_CONTROL) next.LOCATIONS_TRANSFERS = false;
    setDraft(next);
    setError('');
  }
  async function save() {
    if (!enabled || !query.data || busy) return;
    setBusy(true);
    setError('');
    try {
      await webValue<FeatureStatus>('/settings/features', 'PUT', {
        expectedRevision: query.data.revision,
        enabled,
      });
      setDraft(null);
      setReviewOpen(false);
      await client.invalidateQueries({ queryKey: ['business-features'] });
    } catch (failure) {
      setError(errorMessage(failure));
      setReviewOpen(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dashboard-panel settings-features" aria-labelledby="features-heading">
      <div className="panel-heading">
        <div>
          <h2 id="features-heading">Funciones del negocio</h2>
          <p>Activá solamente las herramientas que necesitás.</p>
        </div>
      </div>
      {query.isPending && (
        <PerlaLoading size="compact" label="Cargando funciones…" />
      )}
      {query.isError && (
        <div className="alert error" role="alert">
          {errorMessage(query.error)}{' '}
          <button className="button secondary" onClick={() => void query.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      <div className="feature-list">
        {query.data &&
          featureGroups.map((group) => (
            <section className="commerce-feature-group" key={group.title}>
              <h3>{group.title}</h3>
              {query.data?.features
                .filter((feature) => group.keys.includes(feature.key))
                .map((feature) => (
                  <div className="feature-row" key={feature.key}>
                    <div>
                      <strong>{feature.name}</strong>
                      <small>{feature.description}</small>
                    </div>
                    <button
                      type="button"
                      className={`feature-switch ${enabled?.[feature.key] ? 'enabled' : ''}`}
                      role="switch"
                      aria-checked={Boolean(enabled?.[feature.key])}
                      aria-label={feature.name}
                      disabled={busy}
                      onClick={() => toggle(feature.key)}
                    >
                      <span />
                      {enabled?.[feature.key] ? 'Activa' : 'Pausada'}
                    </button>
                    {feature.key === 'SUPPLIERS_PURCHASES' &&
                      !enabled?.SUPPLIERS_PURCHASES &&
                      onOpenPurchaseHistory && (
                        <button
                          className="button quiet small"
                          type="button"
                          onClick={onOpenPurchaseHistory}
                        >
                          Ver registros
                        </button>
                      )}
                  </div>
                ))}
            </section>
          ))}
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {changed && (
        <div className="feature-actions">
          <button className="button secondary" type="button" onClick={() => setDraft(null)}>
            Descartar
          </button>
          <button className="button primary" type="button" onClick={() => setReviewOpen(true)}>
            Aplicar cambios
          </button>
        </div>
      )}
      {reviewOpen && (
        <Dialog title="Aplicar cambios" busy={busy} onClose={() => setReviewOpen(false)}>
          <div className="dialog-body">
            <p>
              Revisá todas las funciones que cambian, incluidas las dependencias. Los registros
              históricos se conservan.
            </p>
            <ul className="commerce-feature-changes">
              {query.data?.features
                .filter((feature) => query.data!.enabled[feature.key] !== enabled?.[feature.key])
                .map((feature) => (
                  <li key={feature.key}>
                    <strong>{feature.name}</strong>:{' '}
                    {enabled?.[feature.key] ? 'se activa' : 'se pausa'}
                  </li>
                ))}
            </ul>
            {enabled?.REPLENISHMENT && !query.data?.enabled.REPLENISHMENT && (
              <p>
                Reposición requiere Stock y Proveedores y compras; ambas funciones quedan activas.
              </p>
            )}
            {query.data?.enabled.REPLENISHMENT && !enabled?.REPLENISHMENT && (
              <p>
                Reposición se puede pausar después de recibir o cancelar los pedidos pendientes. El
                historial se conserva.
              </p>
            )}
            {query.data?.enabled.LOCATIONS_TRANSFERS && !enabled?.LOCATIONS_TRANSFERS && (
              <p>
                Recibí o cancelá los traslados en tránsito antes de pausar Ubicaciones y traslados.
              </p>
            )}
            {query.data?.enabled.CUSTOMERS && !enabled?.CUSTOMERS && (
              <p>Clientes solo puede pausarse cuando no quedan saldos pendientes por cobrar.</p>
            )}
            {!query.data?.enabled.CUSTOMER_CREDIT && enabled?.CUSTOMER_CREDIT && (
              <p>Cuenta corriente requiere Clientes; el directorio queda activo.</p>
            )}
            {!query.data?.enabled.LOCATIONS_TRANSFERS && enabled?.LOCATIONS_TRANSFERS && (
              <p>
                Ubicaciones y traslados requiere Control de stock; ambas funciones quedan activas.
              </p>
            )}
            {query.data?.enabled.STOCK_CONTROL && !enabled?.STOCK_CONTROL && (
              <p className="feature-impact">
                Al reactivar Stock, realizá un conteo para volver a usar las existencias actuales.
              </p>
            )}
            {!query.data?.enabled.SUPPLIER_ACCOUNTS && enabled?.SUPPLIER_ACCOUNTS && (
              <p className="feature-impact">
                También se activará Proveedores y compras para registrar las deudas.
              </p>
            )}
            {query.data?.enabled.SUPPLIER_ACCOUNTS && !enabled?.SUPPLIER_ACCOUNTS && (
              <p className="feature-impact">
                La cuenta sólo se puede pausar cuando no quedan compras pendientes.
              </p>
            )}
            <div className="dialog-actions">
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setReviewOpen(false)}
              >
                Volver
              </button>
              <button
                className="button primary"
                type="button"
                disabled={busy}
                onClick={() => void save()}
              >
                {busy ? 'Aplicando…' : 'Confirmar cambios'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
