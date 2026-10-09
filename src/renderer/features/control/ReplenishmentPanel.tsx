import { useRememberedState } from '../../components/useRememberedState';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ReplenishmentCalendar,
  ReplenishmentOrder,
  Suggestion,
  SuggestionPage,
} from '../../../shared/replenishment';
import { moneyInput, parseArs, parseQuantity, quantityInput } from '../../../domain/values';
import { errorMessage } from '../../api';
import { controlValue, downloadControlExcel } from './client';

type Named = { id: string; name: string };
type Orders = { items: ReplenishmentOrder[]; total: number; nextOffset: number | null };
const stateLabels = {
  DRAFT: 'Borrador',
  ORDERED: 'Pedido confirmado',
  PARTIAL: 'Recibido en parte',
  RECEIVED: 'Recibido',
  CANCELLED: 'Resto cancelado',
};
const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dateNow = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(),
  );
function operationKey(action: string, input: unknown) {
  const token = JSON.stringify({ action, input });
  const stored = JSON.parse(localStorage.getItem('perla-replenishment-keys') ?? '{}') as Record<
    string,
    string
  >;
  if (!stored[token]) {
    stored[token] = crypto.randomUUID();
    localStorage.setItem(
      'perla-replenishment-keys',
      JSON.stringify(Object.fromEntries(Object.entries(stored).slice(-30))),
    );
  }
  return stored[token]!;
}
export function ReplenishmentPanel({
  onBack,
  embedded = false,
  initial,
}: {
  onBack?: () => void;
  embedded?: boolean;
  initial?: Record<string, unknown>;
}) {
  const client = useQueryClient();
  const [view, setView] = useState<'suggestions' | 'orders'>(
    initial?.orderId || initial?.view === 'orders' ? 'orders' : 'suggestions',
  );
  const [locationId, setLocation] = useState(
    typeof initial?.locationId === 'string' ? initial.locationId : '',
  );
  const [coverageDays, setCoverage] = useRememberedState('replenishment', 'coverageDays', 7);
  const [referenceDays, setReference] = useRememberedState('replenishment', 'referenceDays', 28);
  const [query, setQuery] = useRememberedState('replenishment', 'query', '');
  const [onlyNeeded, setOnlyNeeded] = useRememberedState('replenishment', 'onlyNeeded', true);
  const [productIds, setProductIds] = useState<string[]>(
    typeof initial?.productId === 'string' ? [initial.productId] : [],
  );
  const [offset, setOffset] = useState(0);
  const [orderOffset, setOrderOffset] = useState(0);
  const [status, setStatus] = useState('ALL');
  const [selected, setSelected] = useState<Record<string, Suggestion>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [supplierId, setSupplier] = useState('');
  const [expectedDate, setExpected] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [localOrder, setOrder] = useState<ReplenishmentOrder | null>(null);
  const [initialOrderId, setInitialOrderId] = useState(
    typeof initial?.orderId === 'string' ? initial.orderId : '',
  );
  const linkedOrder = useQuery({
    queryKey: ['control', 'replenishment', 'detail', initialOrderId],
    queryFn: () =>
      controlValue<ReplenishmentOrder>('replenishment', 'detail', { orderId: initialOrderId }),
    enabled: !!initialOrderId,
    retry: false,
  });
  const order = localOrder ?? (initialOrderId ? (linkedOrder.data ?? null) : null);
  const [receiptQty, setReceiptQty] = useState<Record<string, string>>({});
  const [receiptCost, setReceiptCost] = useState<Record<string, string>>({});
  const [lots, setLots] = useState<Record<string, string>>({});
  const [expiries, setExpiries] = useState<Record<string, string>>({});
  const [businessDate, setBusinessDate] = useState(dateNow);
  const [overReceipt, setOverReceipt] = useState(false);
  const [reviewedStock, setReviewed] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDays, setCalendarDays] = useState<number[]>([]);
  const [closedDates, setClosedDates] = useState('');
  const [rule, setRule] = useState<Suggestion | null>(null);
  const [purchaseMultiple, setPurchaseMultiple] = useState('');
  const locations = useQuery({
    queryKey: ['control', 'replenishment', 'locations'],
    queryFn: () => controlValue<Named[]>('replenishment', 'locations'),
    retry: false,
  });
  const destination = locationId || locations.data?.[0]?.id || '';
  const suppliers = useQuery({
    queryKey: ['control', 'replenishment', 'suppliers'],
    queryFn: () => controlValue<Named[]>('replenishment', 'suppliers'),
    retry: false,
  });
  const filters = useMemo(
    () => ({
      locationId: destination,
      coverageDays,
      referenceDays,
      query,
      productIds,
      onlyNeeded,
      offset,
      limit: 25,
    }),
    [destination, coverageDays, referenceDays, query, productIds, onlyNeeded, offset],
  );
  const suggestions = useQuery({
    queryKey: ['control', 'replenishment', 'suggest', filters],
    queryFn: () => controlValue<SuggestionPage>('replenishment', 'suggest', filters),
    enabled: !!destination && view === 'suggestions',
    retry: false,
  });
  const orderFilters = {
    ...(destination ? { locationId: destination } : {}),
    status,
    offset: orderOffset,
    limit: 50,
  };
  const orders = useQuery({
    queryKey: ['control', 'replenishment', 'orders', orderFilters],
    queryFn: () => controlValue<Orders>('replenishment', 'list', orderFilters),
    enabled: view === 'orders',
    retry: false,
  });
  const calendar = useQuery({
    queryKey: ['control', 'replenishment', 'calendar', destination],
    queryFn: () =>
      controlValue<ReplenishmentCalendar>('replenishment', 'calendar', { locationId: destination }),
    enabled: !!destination && calendarOpen,
    retry: false,
  });
  async function perform(work: () => Promise<void>) {
    setBusy(true);
    setNotice('');
    try {
      await work();
      await client.invalidateQueries({ queryKey: ['control', 'replenishment'] });
    } catch (e) {
      setNotice(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function toggle(row: Suggestion) {
    setSelected((current) => {
      const next = { ...current };
      if (next[row.productId]) delete next[row.productId];
      else next[row.productId] = row;
      return next;
    });
  }
  const chosen = Object.values(selected);
  function loadOrder(next: ReplenishmentOrder) {
    setOrder(next);
    setReceiptQty({});
    setReceiptCost(
      Object.fromEntries(
        next.lines.map((l) => [l.id, l.estimatedCostCents ? moneyInput(l.estimatedCostCents) : '']),
      ),
    );
    setReviewed(false);
    setCancelReason('');
    setExpected(next.expectedDate ?? '');
  }
  return (
    <section className="control-workspace">
      {!embedded && (
        <div className="page-heading">
          <div>
            <h1>Preparar compra</h1>
            <p>Calculá faltantes y seguí la mercadería pendiente.</p>
          </div>
          {onBack && (
            <button className="button secondary" onClick={onBack}>
              Volver
            </button>
          )}
        </div>
      )}
      {!embedded && (
        <div className="purchase-tabs" role="tablist" aria-label="Reposición">
          <button
            role="tab"
            aria-selected={view === 'suggestions'}
            className={view === 'suggestions' ? 'active' : ''}
            onClick={() => setView('suggestions')}
          >
            Sugerencias
          </button>
          <button
            role="tab"
            aria-selected={view === 'orders'}
            className={view === 'orders' ? 'active' : ''}
            onClick={() => setView('orders')}
          >
            Pedidos pendientes
          </button>
        </div>
      )}
      {notice && <p role="alert">{notice}</p>}
      <div className="filters">
        <label className="field">
          Ubicación
          <select
            value={destination}
            onChange={(e) => {
              setLocation(e.target.value);
              setOffset(0);
              setOrderOffset(0);
              setSelected({});
            }}
          >
            {locations.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {locations.error && <p role="alert">{errorMessage(locations.error)}</p>}
      {rule && (
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            void perform(async () => {
              await controlValue('replenishment', 'saveProductRule', {
                productId: rule.productId,
                expectedRevision: rule.purchaseRuleRevision,
                purchaseMultipleBase: parseQuantity(purchaseMultiple, rule.unit),
              });
              setRule(null);
            });
          }}
        >
          <h2>Unidad de compra · {rule.name}</h2>
          <label className="field">
            Cantidad por envase ({rule.unit === 'KG' ? 'kg' : 'unidades'})
            <input
              required
              inputMode="decimal"
              value={purchaseMultiple}
              onChange={(e) => setPurchaseMultiple(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy}>
            Guardar unidad de compra
          </button>
          <button type="button" className="button secondary" onClick={() => setRule(null)}>
            Cancelar
          </button>
        </form>
      )}
      {view === 'suggestions' ? (
        <>
          {productIds.length > 0 && (
            <button
              className="button secondary"
              onClick={() => {
                setProductIds([]);
                setOffset(0);
              }}
            >
              Ver todos los productos
            </button>
          )}
          <div className="filters">
            <label className="field">
              Buscar
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOffset(0);
                }}
              />
            </label>
            <label className="field">
              Días de cobertura
              <input
                type="number"
                min={1}
                max={90}
                value={coverageDays}
                onChange={(e) => {
                  setCoverage(Number(e.target.value));
                  setOffset(0);
                }}
              />
            </label>
            <label className="field">
              Mostrar
              <select
                value={onlyNeeded ? 'NEEDED' : 'ALL'}
                onChange={(e) => {
                  setOnlyNeeded(e.target.value === 'NEEDED');
                  setOffset(0);
                }}
              >
                <option value="NEEDED">Para comprar o revisar</option>
                <option value="ALL">Todos los productos</option>
              </select>
            </label>
            <details>
              <summary>Detalle del cálculo y calendario</summary>
              <label className="field">
                Días de referencia
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={referenceDays}
                  onChange={(e) => setReference(Number(e.target.value))}
                />
              </label>
              <p>
                Objetivo: el mayor entre mínimo y demanda diaria por días de apertura. Se restan
                existencias vendibles y pedidos confirmados con fecha dentro del horizonte. Días sin
                stock pueden ocultar demanda.
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  setCalendarDays(calendar.data?.openWeekdays ?? []);
                  setClosedDates(calendar.data?.closedDates.join('\n') ?? '');
                  setCalendarOpen(!calendarOpen);
                }}
              >
                Configurar apertura
              </button>
            </details>
            <button
              className="button secondary"
              disabled={busy || !suggestions.data}
              onClick={() =>
                perform(() =>
                  downloadControlExcel('replenishment', {
                    dataset: 'suggestions',
                    filters,
                    ...(chosen.length ? { selectedIds: chosen.map((r) => r.productId) } : {}),
                  }),
                )
              }
            >
              Descargar Excel{chosen.length ? ' seleccionado' : ''}
            </button>
          </div>
          {calendarOpen && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                void perform(async () => {
                  await controlValue('replenishment', 'saveCalendar', {
                    locationId: destination,
                    expectedRevision: calendar.data?.revision ?? 0,
                    openWeekdays: calendarDays,
                    closedDates: closedDates.split(/\s+/).filter(Boolean),
                  });
                  setCalendarOpen(false);
                });
              }}
            >
              <p>Elegí los días en los que abre esta ubicación.</p>
              {calendar.isPending ? (
                <p>Cargando calendario…</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="button quiet"
                    onClick={() => {
                      setCalendarDays(calendar.data?.openWeekdays ?? []);
                      setClosedDates(calendar.data?.closedDates.join('\n') ?? '');
                    }}
                  >
                    Recuperar configuración actual
                  </button>
                  {weekdays.map((day, i) => (
                    <label key={day}>
                      <input
                        type="checkbox"
                        checked={calendarDays.includes(i)}
                        onChange={() =>
                          setCalendarDays((days) =>
                            days.includes(i) ? days.filter((d) => d !== i) : [...days, i],
                          )
                        }
                      />
                      {day}
                    </label>
                  ))}
                  <label className="field">
                    Fechas cerradas (AAAA-MM-DD, una por línea)
                    <textarea
                      value={closedDates}
                      onChange={(e) => setClosedDates(e.target.value)}
                    />
                  </label>
                  <button className="button primary" disabled={busy || !calendarDays.length}>
                    Guardar apertura
                  </button>
                </>
              )}
            </form>
          )}
          {suggestions.isPending ? (
            <p>Cargando sugerencias…</p>
          ) : suggestions.error ? (
            <p role="alert">
              {errorMessage(suggestions.error)}{' '}
              <button className="button secondary" onClick={() => suggestions.refetch()}>
                Reintentar
              </button>
            </p>
          ) : (
            <>
              {!suggestions.data?.calendarConfigured && (
                <p>
                  Configurá los días de apertura para calcular demanda. Mientras tanto se usa el
                  mínimo conocido.
                </p>
              )}
              <p>
                {suggestions.data?.total ?? 0} productos · horizonte hasta{' '}
                {suggestions.data?.horizon}
              </p>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Seleccionar página"
                          checked={
                            !!suggestions.data?.items.length &&
                            suggestions.data.items.every((r) => !!selected[r.productId])
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelected((current) => {
                              const next = { ...current };
                              for (const r of suggestions.data?.items ?? []) {
                                if (checked) next[r.productId] = r;
                                else delete next[r.productId];
                              }
                              return next;
                            });
                          }}
                        />
                      </th>
                      <th>Producto</th>
                      <th>Disponible</th>
                      <th>Sugerido</th>
                      <th>Comprar</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.data?.items.map((row) => (
                      <tr key={row.productId}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Elegir ${row.name}`}
                            checked={!!selected[row.productId]}
                            onChange={() => toggle(row)}
                          />
                        </td>
                        <td>
                          {row.name}
                          <small>{row.unit === 'KG' ? ' kg' : ' unidades'}</small>
                        </td>
                        <td>
                          {row.availableBase === null
                            ? 'Revisar conteo'
                            : quantityInput(row.availableBase, row.unit)}
                        </td>
                        <td>
                          {row.suggestedBase === null
                            ? 'Sin sugerencia'
                            : quantityInput(row.suggestedBase, row.unit)}
                        </td>
                        <td>
                          <input
                            aria-label={`Comprar ${row.name}`}
                            inputMode="decimal"
                            style={{ width: '6rem' }}
                            value={
                              quantities[row.productId] ??
                              (row.suggestedBase === null
                                ? ''
                                : quantityInput(row.suggestedBase, row.unit))
                            }
                            onChange={(e) =>
                              setQuantities((q) => ({ ...q, [row.productId]: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          {row.reason}
                          <details>
                            <summary>Ver cálculo y pedidos</summary>
                            <p>
                              Objetivo: {quantityInput(row.targetBase, row.unit)} · En camino:{' '}
                              {quantityInput(row.incomingBase, row.unit)}
                            </p>
                            <button
                              className="button quiet"
                              onClick={() => {
                                setRule(row);
                                setPurchaseMultiple(
                                  quantityInput(row.purchaseMultipleBase, row.unit),
                                );
                              }}
                            >
                              Unidad de compra
                            </button>
                            <p>
                              Demanda diaria:{' '}
                              {row.dailyDemand === null
                                ? 'sin evidencia suficiente'
                                : quantityInput(Math.round(row.dailyDemand), row.unit)}{' '}
                              · {row.observedOpenDays} días abiertos observados.
                            </p>
                            {row.otherLocationBase > 0 && (
                              <p>
                                Hay {quantityInput(row.otherLocationBase, row.unit)} en otras
                                ubicaciones. Revisá un traslado antes de comprar.
                              </p>
                            )}
                            {row.undatedBase > 0 && (
                              <p>
                                Pedidos sin fecha: {quantityInput(row.undatedBase, row.unit)}.
                                Confirmá su llegada.
                              </p>
                            )}
                            {row.overdueBase > 0 && (
                              <p>
                                Pedidos retrasados: {quantityInput(row.overdueBase, row.unit)}.
                                Confirmá una nueva fecha.
                              </p>
                            )}
                            {row.transitBase > 0 && (
                              <p>
                                Traslado en tránsito: {quantityInput(row.transitBase, row.unit)}.
                                Revisá su llegada.
                              </p>
                            )}
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!!suggestions.data?.total && (
                <div className="pagination">
                  <button
                    className="button secondary"
                    disabled={!offset}
                    onClick={() => setOffset(Math.max(0, offset - 50))}
                  >
                    Anterior
                  </button>
                  <span>
                    {offset + 1}–{offset + (suggestions.data?.items.length ?? 0)}
                  </span>
                  <button
                    className="button secondary"
                    disabled={offset + 50 >= (suggestions.data?.total ?? 0)}
                    onClick={() => setOffset(offset + 50)}
                  >
                    Siguiente
                  </button>
                </div>
              )}
              {!!chosen.length && (
                <form
                  className="panel"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void perform(async () => {
                      const grouped = new Map<string, Suggestion[]>();
                      for (const row of chosen) {
                        const supplier = supplierId || row.supplierId;
                        if (!supplier) throw new Error(`Asigná proveedor a ${row.name}.`);
                        grouped.set(supplier, [...(grouped.get(supplier) ?? []), row]);
                      }
                      for (const [supplier, rows] of grouped) {
                        const input = {
                          supplierId: supplier,
                          locationId: destination,
                          expectedDate: expectedDate || null,
                          lines: rows.map((row) => ({
                            productId: row.productId,
                            quantityBase: parseQuantity(
                              quantities[row.productId] ??
                                (row.suggestedBase === null
                                  ? ''
                                  : quantityInput(row.suggestedBase, row.unit)),
                              row.unit,
                            ),
                            estimatedCostCents: row.estimatedCostCents,
                            expectedProductRevision: row.productRevision,
                          })),
                        };
                        await controlValue('replenishment', 'create', {
                          ...input,
                          operationKey: operationKey('create', input),
                        });
                      }
                      setSelected({});
                      setView('orders');
                      setNotice(
                        'Borradores preparados por proveedor. Confirmalos para registrar mercadería en camino.',
                      );
                    });
                  }}
                >
                  <h2>Preparar {chosen.length} productos</h2>
                  <label className="field">
                    Proveedor
                    <select
                      required={chosen.some((r) => !r.supplierId)}
                      value={supplierId}
                      onChange={(e) => setSupplier(e.target.value)}
                    >
                      <option value="">Agrupar por proveedor habitual</option>
                      {suppliers.data?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    Llegada prevista (opcional)
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpected(e.target.value)}
                    />
                  </label>
                  <p>
                    Los costos propuestos son estimaciones. La deuda y el stock se registran al
                    recibir.
                  </p>
                  <button className="button primary" disabled={busy}>
                    Preparar pedido
                  </button>
                </form>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="filters">
            <label className="field">
              Estado
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setOrderOffset(0);
                }}
              >
                <option value="ALL">Todos</option>
                {Object.entries(stateLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                perform(() =>
                  downloadControlExcel('replenishment', {
                    dataset: 'orders',
                    filters: orderFilters,
                  }),
                )
              }
            >
              Descargar pedidos
            </button>
          </div>
          {orders.error && <p role="alert">{errorMessage(orders.error)}</p>}
          {orders.isPending && <p>Cargando pedidos…</p>}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Proveedor</th>
                  <th>Destino</th>
                  <th>Estado</th>
                  <th>Llegada</th>
                  <th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {orders.data?.items.map((o) => (
                  <tr key={o.id}>
                    <td>{o.number}</td>
                    <td>{o.supplierName}</td>
                    <td>{o.locationName}</td>
                    <td>{stateLabels[o.status]}</td>
                    <td>{o.expectedDate ?? 'Sin fecha'}</td>
                    <td>
                      <button className="button secondary" onClick={() => loadOrder(o)}>
                        Revisar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!!orders.data?.total && (
            <div className="pagination">
              <button
                className="button secondary"
                disabled={!orderOffset}
                onClick={() => setOrderOffset(Math.max(0, orderOffset - 50))}
              >
                Anterior
              </button>
              <span>{orders.data?.total ?? 0} pedidos</span>
              <button
                className="button secondary"
                disabled={orders.data?.nextOffset === null || !orders.data}
                onClick={() => setOrderOffset(orders.data!.nextOffset!)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
      {order && (
        <section className="panel" aria-label={`Pedido ${order.number}`}>
          <div className="page-heading">
            <h2>
              Pedido {order.number} · {order.supplierName}
            </h2>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() =>
                perform(async () =>
                  loadOrder(
                    await controlValue<ReplenishmentOrder>('replenishment', 'detail', {
                      orderId: order.id,
                    }),
                  ),
                )
              }
            >
              Actualizar
            </button>
            <button
              className="button quiet"
              onClick={() => {
                setOrder(null);
                setInitialOrderId('');
              }}
            >
              Cerrar
            </button>
          </div>
          <p>
            {stateLabels[order.status]} · {order.locationName}
          </p>
          {!['RECEIVED', 'CANCELLED'].includes(order.status) && (
            <details>
              <summary>Revisar fecha de llegada</summary>
              <label className="field">
                Llegada prevista
                <input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpected(e.target.value)}
                />
              </label>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    const input = {
                      orderId: order.id,
                      expectedRevision: order.revision,
                      expectedDate: expectedDate || null,
                    };
                    loadOrder(
                      await controlValue<ReplenishmentOrder>('replenishment', 'reschedule', {
                        ...input,
                        operationKey: operationKey('reschedule', input),
                      }),
                    );
                  })
                }
              >
                Confirmar nueva fecha
              </button>
            </details>
          )}
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Pedido</th>
                  <th>Recibido</th>
                  <th>Pendiente</th>
                  {['ORDERED', 'PARTIAL'].includes(order.status) && (
                    <>
                      <th>Recibir ahora</th>
                      <th>Costo confirmado (ARS)</th>
                      <th>Lote</th>
                      <th>Vence</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{quantityInput(l.orderedBase, l.unit)}</td>
                    <td>{quantityInput(l.receivedBase, l.unit)}</td>
                    <td>{quantityInput(l.pendingBase, l.unit)}</td>
                    {['ORDERED', 'PARTIAL'].includes(order.status) && (
                      <>
                        <td>
                          <input
                            aria-label={`Recibir ${l.name}`}
                            inputMode="decimal"
                            style={{ width: '6rem' }}
                            value={receiptQty[l.id] ?? ''}
                            onChange={(e) =>
                              setReceiptQty((q) => ({ ...q, [l.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Costo de ${l.name}`}
                            inputMode="decimal"
                            value={receiptCost[l.id] ?? ''}
                            onChange={(e) =>
                              setReceiptCost((q) => ({ ...q, [l.id]: e.target.value }))
                            }
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Lote de ${l.name}`}
                            value={lots[l.id] ?? ''}
                            onChange={(e) => setLots((q) => ({ ...q, [l.id]: e.target.value }))}
                          />
                        </td>
                        <td>
                          <input
                            aria-label={`Vencimiento de ${l.name}`}
                            type="date"
                            value={expiries[l.id] ?? ''}
                            onChange={(e) => setExpiries((q) => ({ ...q, [l.id]: e.target.value }))}
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {order.status === 'DRAFT' && (
            <>
              <label className="field">
                Fecha de llegada
                <input
                  type="date"
                  value={expectedDate || order.expectedDate || ''}
                  onChange={(e) => setExpected(e.target.value)}
                />
              </label>
              <label className="field">
                <input
                  type="checkbox"
                  checked={reviewedStock}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                Revisé cantidades si cambió la existencia
              </label>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    const input = {
                      orderId: order.id,
                      expectedRevision: order.revision,
                      expectedDate: expectedDate || order.expectedDate,
                      acceptChangedStock: reviewedStock,
                    };
                    loadOrder(
                      await controlValue<ReplenishmentOrder>('replenishment', 'confirm', {
                        ...input,
                        operationKey: operationKey('confirm', input),
                      }),
                    );
                  })
                }
              >
                Confirmar pedido
              </button>
            </>
          )}
          {['ORDERED', 'PARTIAL'].includes(order.status) && (
            <>
              <label className="field">
                Fecha de recepción
                <input
                  type="date"
                  value={businessDate}
                  onChange={(e) => setBusinessDate(e.target.value)}
                />
              </label>
              <details>
                <summary>Opciones de recepción</summary>
                <label className="field">
                  <input
                    type="checkbox"
                    checked={overReceipt}
                    onChange={(e) => setOverReceipt(e.target.checked)}
                  />
                  Revisé y autorizo recibir por encima del saldo
                </label>
              </details>
              <button
                className="button primary"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    const input = {
                      orderId: order.id,
                      expectedRevision: order.revision,
                      businessDate,
                      allowOverReceipt: overReceipt,
                      lines: order.lines
                        .filter((l) => receiptQty[l.id]?.trim())
                        .map((l) => ({
                          lineId: l.id,
                          quantityBase: parseQuantity(receiptQty[l.id]!, l.unit),
                          unitCostCents: parseArs(receiptCost[l.id] ?? ''),
                          expectedProductRevision: l.currentProductRevision,
                          ...(lots[l.id] ? { lotCode: lots[l.id] } : {}),
                          ...(expiries[l.id] ? { expiresOn: expiries[l.id] } : {}),
                        })),
                    };
                    loadOrder(
                      await controlValue<ReplenishmentOrder>('replenishment', 'receive', {
                        ...input,
                        operationKey: operationKey('receive', input),
                      }),
                    );
                    setNotice('Recepción registrada. Stock, costos y cuenta actualizados.');
                  })
                }
              >
                Recibir mercadería
              </button>
            </>
          )}
          {!['RECEIVED', 'CANCELLED'].includes(order.status) && (
            <details>
              <summary>Cancelar pendiente</summary>
              <label className="field">
                Motivo
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
              </label>
              <button
                className="button secondary"
                disabled={busy || cancelReason.trim().length < 3}
                onClick={() =>
                  perform(async () => {
                    const input = {
                      orderId: order.id,
                      expectedRevision: order.revision,
                      reason: cancelReason,
                    };
                    loadOrder(
                      await controlValue<ReplenishmentOrder>('replenishment', 'cancel', {
                        ...input,
                        operationKey: operationKey('cancel', input),
                      }),
                    );
                  })
                }
              >
                Cancelar el resto
              </button>
            </details>
          )}
        </section>
      )}
    </section>
  );
}
export default ReplenishmentPanel;
