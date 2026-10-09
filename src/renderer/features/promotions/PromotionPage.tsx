import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Promotion } from '../../../shared/promotions';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import { PromotionForm } from './PromotionForm';

type View = 'CURRENT' | 'SCHEDULED' | 'OTHER';
const typeLabel = {
  PERCENT: 'Porcentaje',
  X_FOR_Y: 'Llevá X, pagá Y',
  QUANTITY_PRICE: 'Precio por cantidad',
  COMBO_PRICE: 'Combo',
} as const;

function bucket(promotion: Promotion, now: number): View {
  const input = promotion.input;
  if (
    input.status === 'ACTIVE' &&
    (!input.startsAt || Date.parse(input.startsAt) <= now) &&
    (!input.endsAt || Date.parse(input.endsAt) > now)
  )
    return 'CURRENT';
  if (input.status === 'ACTIVE' && input.startsAt && Date.parse(input.startsAt) > now)
    return 'SCHEDULED';
  return 'OTHER';
}
function benefit(promotion: Promotion) {
  const input = promotion.input;
  if (input.type === 'PERCENT') return `${input.basisPoints / 100}% menos`;
  if (input.type === 'X_FOR_Y') return `${input.buyQuantity} × ${input.payQuantity}`;
  if (input.type === 'QUANTITY_PRICE') return `Desde ${input.thresholdBase} unidades`;
  return `${input.components.length} productos`;
}

export function PromotionPage() {
  const client = useQueryClient();
  const [view, setView] = useRememberedState<View>('promotions', 'view', 'CURRENT');
  const [editor, setEditor] = useState<Promotion | null | undefined>(undefined);
  const [error, setError] = useState('');
  const promotions = useQuery({
    queryKey: ['promotions'],
    queryFn: () => api().promotions.list().then(unwrap),
    retry: false,
  });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const counts = useMemo(
    () => ({
      CURRENT: 0,
      SCHEDULED: 0,
      OTHER: 0,
      ...Object.fromEntries(
        ['CURRENT', 'SCHEDULED', 'OTHER'].map((key) => [
          key,
          (promotions.data ?? []).filter((item) => bucket(item, now) === key).length,
        ]),
      ),
    }),
    [promotions.data, now],
  );
  const visible = (promotions.data ?? []).filter((item) => bucket(item, now) === view);
  const toggle = useMutation({
    mutationFn: async (promotion: Promotion) =>
      unwrap(
        await api().promotions.save({
          ...promotion.input,
          id: promotion.id,
          expectedRevision: promotion.revision,
          status: promotion.input.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
        }),
      ),
    onSuccess: async () => {
      setError('');
      await client.invalidateQueries({ queryKey: ['promotions'] });
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  return (
    <>
      <div className="page-heading promotion-page-heading">
        <div>
          <span className="eyebrow">Ventas</span>
          <h1>Promociones</h1>
        </div>
        <button className="button primary" onClick={() => setEditor(null)}>
          <Icon name="plus" size={18} />
          Nueva promoción
        </button>
      </div>
      <div className="promotion-overview panel">
        <div>
          <span>Activas ahora</span>
          <strong>{counts.CURRENT}</strong>
          <small>Se aplican automáticamente en Caja</small>
        </div>
        <div>
          <span>Programadas</span>
          <strong>{counts.SCHEDULED}</strong>
          <small>Comienzan en la fecha indicada</small>
        </div>
        <div>
          <span>Borradores y finalizadas</span>
          <strong>{counts.OTHER}</strong>
          <small>Sin efecto sobre las ventas</small>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      <div className="export-filter-bar">
        <div className="promotion-tabs" role="tablist">
          <button className={view === 'CURRENT' ? 'active' : ''} onClick={() => setView('CURRENT')}>
            Activas <span>{counts.CURRENT}</span>
          </button>
          <button
            className={view === 'SCHEDULED' ? 'active' : ''}
            onClick={() => setView('SCHEDULED')}
          >
            Programadas <span>{counts.SCHEDULED}</span>
          </button>
          <button className={view === 'OTHER' ? 'active' : ''} onClick={() => setView('OTHER')}>
            Borradores y finalizadas <span>{counts.OTHER}</span>
          </button>
        </div>
        <SavedViews
          module="promotions"
          filters={{ view }}
          onApply={(filters) => {
            const value = scalarViewFilters(filters);
            setView(value.view === 'SCHEDULED' || value.view === 'OTHER' ? value.view : 'CURRENT');
          }}
        />
        <ExportButton dataset="promotions" filters={{ view }} />
      </div>
      <section className="promotion-list panel">
        {promotions.isPending ? (
          <div className="empty-state">Cargando promociones…</div>
        ) : promotions.isError ? (
          <div className="alert error">{errorMessage(promotions.error)}</div>
        ) : visible.length === 0 ? (
          <div className="promotion-empty">
            <span>
              <Icon name="tag" size={28} />
            </span>
            <strong>
              {view === 'CURRENT'
                ? 'No hay promociones activas'
                : view === 'SCHEDULED'
                  ? 'No hay promociones programadas'
                  : 'No hay borradores ni finalizadas'}
            </strong>
            <small>Creá una oferta y el sistema hará el resto en Caja.</small>
            <button className="button secondary" onClick={() => setEditor(null)}>
              Crear promoción
            </button>
          </div>
        ) : (
          visible.map((promotion) => {
            const input = promotion.input;
            const targetTotal =
              input.type === 'COMBO_PRICE'
                ? input.components.length
                : input.productIds.length + input.categoryIds.length + input.brandIds.length;
            return (
              <article className="promotion-card" key={promotion.id}>
                <div className="promotion-card-icon">
                  <Icon name="tag" size={22} />
                </div>
                <div className="promotion-card-main">
                  <div>
                    <span className={`status-pill ${input.status.toLowerCase()}`}>
                      {input.status === 'ACTIVE'
                        ? bucket(promotion, now) === 'SCHEDULED'
                          ? 'Programada'
                          : bucket(promotion, now) === 'CURRENT'
                            ? 'Activa'
                            : 'Finalizada'
                        : input.status === 'DRAFT'
                          ? 'Borrador'
                          : 'Pausada'}
                    </span>
                    <small>{typeLabel[input.type]}</small>
                  </div>
                  <h2>{input.name}</h2>
                  <p>
                    <strong>{benefit(promotion)}</strong>
                    <span>
                      {targetTotal} {targetTotal === 1 ? 'objetivo' : 'objetivos'}
                    </span>
                    {input.endsAt && (
                      <span>Hasta {new Date(input.endsAt).toLocaleDateString('es-AR')}</span>
                    )}
                  </p>
                </div>
                <div className="promotion-card-actions">
                  <button className="button secondary small" onClick={() => setEditor(promotion)}>
                    Editar
                  </button>
                  <button
                    className="text-button"
                    disabled={toggle.isPending}
                    onClick={() => toggle.mutate(promotion)}
                  >
                    {input.status === 'ACTIVE' ? 'Pausar' : 'Activar'}
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
      {editor !== undefined && (
        <PromotionForm promotion={editor} onClose={() => setEditor(undefined)} />
      )}
    </>
  );
}
