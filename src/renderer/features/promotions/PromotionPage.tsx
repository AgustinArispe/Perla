import { PerlaLoading } from '../../components/PerlaLoading';
import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Promotion } from '../../../shared/promotions';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import { PromotionForm } from './PromotionForm';
import { formatMoney } from '../../../domain/values';
import { PageHeading } from '../../components/PageHeader';

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
  if (input.type === 'X_FOR_Y') return `Llevá ${input.buyQuantity}, pagá ${input.payQuantity}`;
  if (input.type === 'QUANTITY_PRICE') {
    // The engine compares each product's quantity: units for UNIT, grams for KG.
    // A category or brand can contain both forms of sale, so show both interpretations.
    const quantity = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 });
    return `Desde ${quantity.format(input.thresholdBase)} unidades o ${quantity.format(input.thresholdBase / 1000)} kg, según la forma de venta de cada producto · Precio especial: ${formatMoney(input.specialPriceCents)} por unidad o kg`;
  }
  return `Combo por ${formatMoney(input.comboPriceCents)}`;
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
      <PageHeading className="page-heading promotion-page-heading">
        <div>
          <h1>Promociones</h1>
        </div>
        <button className="button primary" onClick={() => setEditor(null)}>
          <Icon name="plus" size={18} />
          Nueva promoción
        </button>
      </PageHeading>
      {error && <div className="alert error">{error}</div>}
      <div className="export-filter-bar">
        <div className="promotion-tabs" role="group" aria-label="Estado de las promociones">
          <button
            className={view === 'CURRENT' ? 'active' : ''}
            aria-pressed={view === 'CURRENT'}
            onClick={() => setView('CURRENT')}
          >
            Activas <span>{counts.CURRENT}</span>
          </button>
          <button
            className={view === 'SCHEDULED' ? 'active' : ''}
            aria-pressed={view === 'SCHEDULED'}
            onClick={() => setView('SCHEDULED')}
          >
            Programadas <span>{counts.SCHEDULED}</span>
          </button>
          <button
            className={view === 'OTHER' ? 'active' : ''}
            aria-pressed={view === 'OTHER'}
            onClick={() => setView('OTHER')}
          >
            Pausadas, borradores y finalizadas <span>{counts.OTHER}</span>
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
          <PerlaLoading size="panel" label="Cargando promociones…" />
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
            const scope =
              input.type === 'COMBO_PRICE'
                ? `${input.components.length} productos del combo`
                : [
                    input.productIds.length
                      ? `${input.productIds.length} ${input.productIds.length === 1 ? 'producto' : 'productos'}`
                      : '',
                    input.categoryIds.length
                      ? `${input.categoryIds.length} ${input.categoryIds.length === 1 ? 'categoría' : 'categorías'}`
                      : '',
                    input.brandIds.length
                      ? `${input.brandIds.length} ${input.brandIds.length === 1 ? 'marca' : 'marcas'}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' · ');
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
                    <span>{scope}</span>
                    <span>
                      {input.startsAt
                        ? `Desde ${new Date(input.startsAt).toLocaleDateString('es-AR')}`
                        : 'Sin fecha de inicio'}
                    </span>
                    <span>
                      {input.endsAt
                        ? `Hasta ${new Date(input.endsAt).toLocaleDateString('es-AR')}`
                        : 'Sin fecha de finalización'}
                    </span>
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
