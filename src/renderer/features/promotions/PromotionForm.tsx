import { PerlaLoading } from '../../components/PerlaLoading';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Product, TaxonomyItem } from '../../../shared/catalog';
import type { Promotion, PromotionSaveInput } from '../../../shared/promotions';
import { formatMoney, parseArs } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';
import { Icon } from '../../components/Icon';

type Kind = PromotionSaveInput['type'];
const templates: { type: Kind; title: string; sample: string }[] = [
  { type: 'PERCENT', title: 'Porcentaje', sample: 'Ej. 15% menos' },
  { type: 'X_FOR_Y', title: 'Llevá X, pagá Y', sample: 'Ej. 3 × 2' },
  { type: 'QUANTITY_PRICE', title: 'Precio por cantidad', sample: 'Ej. 2 por $5.000' },
  { type: 'COMBO_PRICE', title: 'Combo', sample: 'Varios productos a un precio' },
];

function localDate(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 16) : '';
}
function isoDate(value: string) {
  return value ? new Date(value).toISOString() : null;
}
function previewMoney(value: string) {
  if (!value.trim()) return '$ 0';
  try {
    return formatMoney(parseArs(value));
  } catch {
    return 'Revisá el precio';
  }
}

export function PromotionForm({
  promotion,
  onClose,
  initialProductIds,
}: {
  promotion: Promotion | null;
  onClose: () => void;
  initialProductIds?: string[];
}) {
  const client = useQueryClient();
  const initial = promotion?.input;
  const [type, setType] = useState<Kind>(initial?.type ?? 'PERCENT');
  const [name, setName] = useState(initial?.name ?? '');
  const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'PAUSED'>(initial?.status ?? 'ACTIVE');
  const [priority, setPriority] = useState(String(initial?.priority ?? 10));
  const [startsAt, setStartsAt] = useState(localDate(initial?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(localDate(initial?.endsAt ?? null));
  const [productIds, setProductIds] = useState<string[]>(
    initial?.productIds ?? initialProductIds ?? [],
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.categoryIds ?? []);
  const [brandIds, setBrandIds] = useState<string[]>(initial?.brandIds ?? []);
  const [search, setSearch] = useState('');
  const [basisPoints, setBasisPoints] = useState(
    String(initial?.type === 'PERCENT' ? initial.basisPoints / 100 : 10),
  );
  const [buy, setBuy] = useState(String(initial?.type === 'X_FOR_Y' ? initial.buyQuantity : 3));
  const [pay, setPay] = useState(String(initial?.type === 'X_FOR_Y' ? initial.payQuantity : 2));
  const [threshold, setThreshold] = useState(
    String(initial?.type === 'QUANTITY_PRICE' ? initial.thresholdBase : 2),
  );
  const [specialPrice, setSpecialPrice] = useState(
    initial?.type === 'QUANTITY_PRICE'
      ? String(initial.specialPriceCents / 100).replace('.', ',')
      : '',
  );
  const [comboPrice, setComboPrice] = useState(
    initial?.type === 'COMBO_PRICE' ? String(initial.comboPriceCents / 100).replace('.', ',') : '',
  );
  const [componentQuantities, setComponentQuantities] = useState<Record<string, number>>(
    initial?.type === 'COMBO_PRICE'
      ? Object.fromEntries(initial.components.map((item) => [item.productId, item.quantityBase]))
      : {},
  );
  const [error, setError] = useState('');

  const products = useQuery({
    queryKey: ['promotion-product-search', search],
    queryFn: () =>
      api()
        .products.search({ query: search, activeOnly: true, status: 'ACTIVE', limit: 50 })
        .then(unwrap),
    retry: false,
  });
  const taxonomy = useQuery({
    queryKey: ['product-taxonomy'],
    queryFn: () => api().products.taxonomy({}).then(unwrap),
    retry: false,
  });
  const known = useMemo(
    () => new Map((products.data?.items ?? []).map((item) => [item.id, item])),
    [products.data],
  );

  const save = useMutation({
    mutationFn: async () => {
      const common = {
        ...(promotion ? { id: promotion.id, expectedRevision: promotion.revision } : {}),
        name: name.trim() || preview,
        status,
        priority: Number(priority),
        startsAt: isoDate(startsAt),
        endsAt: isoDate(endsAt),
        productIds: type === 'COMBO_PRICE' ? [] : productIds,
        categoryIds: type === 'COMBO_PRICE' ? [] : categoryIds,
        brandIds: type === 'COMBO_PRICE' ? [] : brandIds,
      };
      const input: PromotionSaveInput =
        type === 'PERCENT'
          ? {
              ...common,
              type,
              basisPoints: Math.round(Number(basisPoints.replace(',', '.')) * 100),
            }
          : type === 'X_FOR_Y'
            ? { ...common, type, buyQuantity: Number(buy), payQuantity: Number(pay) }
            : type === 'QUANTITY_PRICE'
              ? {
                  ...common,
                  type,
                  thresholdBase: Number(threshold),
                  specialPriceCents: parseArs(specialPrice),
                }
              : {
                  ...common,
                  type,
                  comboPriceCents: parseArs(comboPrice),
                  components: productIds.map((productId) => ({
                    productId,
                    quantityBase: componentQuantities[productId] ?? 1,
                  })),
                };
      return unwrap(await api().promotions.save(input));
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['promotions'] });
      onClose();
    },
    onError: (failure) => setError(errorMessage(failure)),
  });

  function toggle(list: string[], id: string, setter: (next: string[]) => void) {
    setter(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  }
  function selectProduct(product: Product) {
    toggle(productIds, product.id, setProductIds);
    setComponentQuantities((current) => ({ ...current, [product.id]: current[product.id] ?? 1 }));
  }
  const targetCount =
    type === 'COMBO_PRICE'
      ? productIds.length
      : productIds.length + categoryIds.length + brandIds.length;
  const preview =
    type === 'PERCENT'
      ? `${basisPoints || 0}% de ahorro`
      : type === 'X_FOR_Y'
        ? `Lleva ${buy || 0} y paga ${pay || 0}`
        : type === 'QUANTITY_PRICE'
          ? `${threshold || 0} por ${previewMoney(specialPrice)}`
          : `${productIds.length} productos por ${previewMoney(comboPrice)}`;

  return (
    <Dialog
      title={promotion ? 'Editar promoción' : 'Nueva promoción'}
      onClose={onClose}
      busy={save.isPending}
      wide
      className="promotion-dialog"
    >
      <div className="dialog-body promotion-form">
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <section className="promotion-form-section">
          <label className="field promotion-type-control">
            Tipo de promoción
            <select value={type} onChange={(event) => setType(event.target.value as Kind)}>
              {templates.map((template) => (
                <option key={template.type} value={template.type}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="promotion-form-section">
          <div className="promotion-step">
            <div>
              <strong>Elegí dónde aplica</strong>
              <small>
                {type === 'COMBO_PRICE'
                  ? 'Seleccioná al menos dos productos.'
                  : 'Productos, categorías o marcas.'}
              </small>
            </div>
            <b>{targetCount}</b>
          </div>
          <label className="search-field promotion-search">
            <Icon name="search" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar productos"
            />
          </label>
          {products.isPending && <PerlaLoading size="compact" label="Cargando productos…" />}
          {products.isError && (
            <p className="alert error" role="alert">
              {errorMessage(products.error)}{' '}
              <button className="button secondary" onClick={() => void products.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          {!products.isPending && !products.isError && !products.data?.items.length && (
            <p>No hay productos con esta búsqueda.</p>
          )}
          {taxonomy.isError && (
            <p className="alert error" role="alert">
              No se pudieron consultar categorías y marcas.{' '}
              <button className="button secondary" onClick={() => void taxonomy.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          <div className="promotion-product-picker">
            {(products.data?.items ?? []).map((product) => (
              <button
                type="button"
                className={productIds.includes(product.id) ? 'selected' : ''}
                key={product.id}
                onClick={() => selectProduct(product)}
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>
                    {product.sku} · {formatMoney(product.priceCents)}
                  </small>
                </span>
                <i>{productIds.includes(product.id) ? '✓' : '+'}</i>
              </button>
            ))}
          </div>
          {productIds.length > 0 && (
            <div className="promotion-selected">
              {productIds.map((id, index) => (
                <span key={id}>
                  {known.get(id)?.name ?? `Producto ${index + 1}`}
                  {type === 'COMBO_PRICE' && (
                    <input
                      aria-label="Cantidad"
                      type="number"
                      min="1"
                      value={componentQuantities[id] ?? 1}
                      onChange={(event) =>
                        setComponentQuantities((current) => ({
                          ...current,
                          [id]: Number(event.target.value),
                        }))
                      }
                    />
                  )}
                  <button
                    type="button"
                    aria-label="Quitar"
                    onClick={() => setProductIds(productIds.filter((item) => item !== id))}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {type !== 'COMBO_PRICE' && taxonomy.data && (
            <div className="promotion-taxonomy">
              <TaxonomyChoices
                title="Categorías"
                items={taxonomy.data.categories}
                selected={categoryIds}
                onToggle={(id) => toggle(categoryIds, id, setCategoryIds)}
              />
              <TaxonomyChoices
                title="Marcas"
                items={taxonomy.data.brands}
                selected={brandIds}
                onToggle={(id) => toggle(brandIds, id, setBrandIds)}
              />
            </div>
          )}
        </section>

        <section className="promotion-form-section">
          <div className="promotion-step">
            <div>
              <strong>Definí el beneficio</strong>
              <small>Nombre corto y valor que verá la caja.</small>
            </div>
          </div>
          <div className="form-grid promotion-benefit-grid">
            <label className="field span-2">
              Nombre
              <input
                data-dialog-focus
                value={name || preview}
                onChange={(event) => setName(event.target.value)}
                placeholder={preview}
                maxLength={100}
              />
            </label>
            {type === 'PERCENT' && (
              <label className="field">
                Descuento
                <input
                  inputMode="decimal"
                  value={basisPoints}
                  onChange={(event) => setBasisPoints(event.target.value)}
                />
                <small>%</small>
              </label>
            )}
            {type === 'X_FOR_Y' && (
              <>
                <label className="field">
                  Cantidad que lleva
                  <input
                    inputMode="numeric"
                    value={buy}
                    onChange={(event) => setBuy(event.target.value)}
                  />
                </label>
                <label className="field">
                  Cantidad que paga
                  <input
                    inputMode="numeric"
                    value={pay}
                    onChange={(event) => setPay(event.target.value)}
                  />
                </label>
              </>
            )}
            {type === 'QUANTITY_PRICE' && (
              <>
                <label className="field">
                  Cantidad mínima
                  <input
                    inputMode="numeric"
                    value={threshold}
                    onChange={(event) => setThreshold(event.target.value)}
                  />
                </label>
                <label className="field">
                  Precio especial
                  <input
                    inputMode="decimal"
                    value={specialPrice}
                    onChange={(event) => setSpecialPrice(event.target.value)}
                    placeholder="0,00"
                  />
                </label>
              </>
            )}
            {type === 'COMBO_PRICE' && (
              <label className="field">
                Precio del combo
                <input
                  inputMode="decimal"
                  value={comboPrice}
                  onChange={(event) => setComboPrice(event.target.value)}
                  placeholder="0,00"
                />
              </label>
            )}
            <div className="promotion-example">
              <span>Regla de la promoción</span>
              <strong>{preview}</strong>
              <small>Se aplicará automáticamente cuando el carrito cumpla la condición.</small>
            </div>
          </div>
        </section>

        <details className="promotion-advanced">
          <summary>
            Programación y prioridad ·{' '}
            {status === 'ACTIVE' ? 'Habilitada' : status === 'PAUSED' ? 'Pausada' : 'Borrador'}
            {startsAt ? ` · desde ${startsAt.replace('T', ' ')}` : ' · sin inicio programado'}
            {endsAt ? ` · hasta ${endsAt.replace('T', ' ')}` : ''}
          </summary>
          <div className="form-grid">
            <label className="field">
              Estado
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as typeof status)}
              >
                <option value="ACTIVE">Activa</option>
                <option value="DRAFT">Borrador</option>
                <option value="PAUSED">Pausada</option>
              </select>
            </label>
            <label className="field">
              Prioridad
              <input
                type="number"
                min="0"
                max="100"
                value={priority}
                onChange={(event) => setPriority(event.target.value)}
              />
            </label>
            <p className="promotion-priority-help">
              Si varias reglas compiten, la prioridad participa en la selección de la promoción
              aplicable.
            </p>
            <label className="field">
              Comienza
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
              />
            </label>
            <label className="field">
              Finaliza
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
              />
            </label>
          </div>
        </details>
      </div>
      <div className="dialog-footer">
        <span>
          {status === 'ACTIVE'
            ? `Regla: ${preview}. ${targetCount} selecciones. ${startsAt ? 'Comienza en la fecha programada.' : 'Sin fecha de inicio.'} ${endsAt ? 'Finaliza en la fecha indicada.' : 'Sin fecha de fin.'}`
            : 'Podés activarla más adelante.'}
        </span>
        <div className="dialog-actions">
          <button className="button secondary" onClick={onClose} disabled={save.isPending}>
            Cancelar
          </button>
          <button
            className="button primary"
            onClick={() => save.mutate()}
            disabled={
              save.isPending || (type === 'COMBO_PRICE' ? productIds.length < 2 : targetCount === 0)
            }
          >
            {save.isPending
              ? 'Guardando…'
              : promotion
                ? 'Guardar cambios'
                : status === 'ACTIVE'
                  ? 'Activar promoción'
                  : 'Guardar promoción'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function TaxonomyChoices({
  title,
  items,
  selected,
  onToggle,
}: {
  title: string;
  items: TaxonomyItem[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const active = items.filter((item) => item.active);
  if (!active.length) return null;
  return (
    <div>
      <strong>{title}</strong>
      <div>
        {active.map((item) => (
          <button
            type="button"
            className={selected.includes(item.id) ? 'selected' : ''}
            key={item.id}
            onClick={() => onToggle(item.id)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </div>
  );
}
