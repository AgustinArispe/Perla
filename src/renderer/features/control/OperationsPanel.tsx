import { useRememberedState } from '../../components/useRememberedState';
import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  CashDifference,
  ControlMetadata,
  ControlPage,
  CountLine,
  CountSession,
  ExpiryRow,
} from '../../../shared/operational-control';
import { parseQuantity, formatMoney } from '../../../domain/values';
import { webValue } from '../../web-client';
import { api, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';
import { downloadControlExcel } from './client';
import type { WebSession } from '../../../shared/web';

const request = <T,>(action: string, input: unknown = {}) =>
  webValue<T>('/control', 'POST', { area: 'operations', action, input });
const amount = (value: number, unit: 'UNIT' | 'KG') =>
  unit === 'KG' ? `${value / 1000} kg` : `${value} un.`;

export function OperationsPanel({
  onBack,
  embedded = false,
  initialTab = 'counts',
  initialLotId,
  initialLocationId,
  initialShiftId,
}: {
  onBack?: () => void;
  embedded?: boolean;
  initialTab?: 'counts' | 'expiry' | 'cash';
  initialLotId?: string;
  initialLocationId?: string;
  initialShiftId?: string;
}) {
  const [tab, setTab] = useState(initialTab),
    [session, setSession] = useState<CountSession | null>(null),
    [location, setLocation] = useRememberedState('operations', 'location', initialLocationId ?? ''),
    [category, setCategory] = useRememberedState('operations', 'category', ''),
    [search, setSearch] = useRememberedState('operations', 'search', ''),
    [selected, setSelected] = useState<string[]>([]),
    [reason, setReason] = useState(''),
    [confirm, setConfirm] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [page, setPage] = useRememberedState('operations', `page:${initialTab}`, 1),
    [expiryBucket, setExpiryBucket] = useState(initialLotId ? 'ALL' : 'WEEK'),
    [lotFilter, setLotFilter] = useState(initialLotId ?? ''),
    [shiftFilter, setShiftFilter] = useState(initialShiftId ?? ''),
    [cashStatus, setCashStatus] = useState(initialShiftId ? 'ALL' : 'PENDING'),
    [lot, setLot] = useState<ExpiryRow | null>(null),
    [review, setReview] = useState<CashDifference | null>(null),
    [note, setNote] = useState('');
  const applyKey = useRef(crypto.randomUUID()),
    scanRef = useRef<HTMLInputElement>(null);
  const metadata = useQuery({
    queryKey: ['control', 'metadata'],
    queryFn: () => request<ControlMetadata>('metadata'),
  });
  const auth = useQuery({
    queryKey: ['web-session'],
    queryFn: () => webValue<WebSession>('/auth/session'),
  });
  const canReview = auth.data?.user?.role === 'OWNER' || auth.data?.user?.role === 'ADMIN';
  const drafts = useQuery({
    queryKey: ['control', 'countSessions', page],
    queryFn: () =>
      request<ControlPage<{ id: string; locationName: string; updatedAt: string }>>(
        'countSessions',
        { page, limit: 25 },
      ),
    enabled: tab === 'counts' && !session,
  });
  const expiryFilters = {
    bucket: expiryBucket,
    ...(location ? { locationId: location } : {}),
    ...(lotFilter ? { lotId: lotFilter } : {}),
  };
  const expiries = useQuery({
    queryKey: ['control', 'expiries', expiryFilters, page],
    queryFn: () => request<ControlPage<ExpiryRow>>('expiries', { ...expiryFilters, page }),
    enabled: tab === 'expiry',
  });
  const cashFilters = { status: cashStatus, ...(shiftFilter ? { shiftId: shiftFilter } : {}) };
  const cash = useQuery({
    queryKey: ['control', 'cashDifferences', cashFilters, page],
    queryFn: () =>
      request<
        ControlPage<CashDifference> & {
          summary?: { shortagesCents: number; surplusesCents: number };
        }
      >('cashDifferences', { ...cashFilters, page }),
    enabled: tab === 'cash',
  });
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar.');
    } finally {
      setBusy(false);
    }
  }
  const filtered =
    session?.lines.filter(
      (l) =>
        !search ||
        [l.name, l.sku, l.barcode ?? ''].some((v) =>
          v.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
        ),
    ) ?? [];
  const ready =
    session?.lines.filter((l) => selected.includes(l.productId) && l.status === 'COUNTED') ?? [];
  const changed = ready.filter((l) => l.differenceBase !== 0);
  const total =
    tab === 'expiry'
      ? expiries.data?.total
      : tab === 'cash'
        ? cash.data?.total
        : drafts.data?.total;
  return (
    <div className="control-page operations-workspace">
      {!embedded && (
        <div className="page-heading">
          <div>
            <h1>Controles operativos</h1>
            <p>Conteos, vencimientos y revisión de cierres.</p>
          </div>
          {onBack && (
            <button className="button secondary" onClick={onBack}>
              Volver
            </button>
          )}
        </div>
      )}
      {!embedded && (
        <div className="filter-tabs" role="tablist" aria-label="Controles">
          {(
            [
              ['counts', 'Hacer conteo'],
              ['expiry', 'Vencimientos'],
              ['cash', 'Con diferencias'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`button ${tab === key ? 'primary' : 'secondary'}`}
              onClick={() => {
                setTab(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {(error || metadata.isError || drafts.isError || expiries.isError || cash.isError) && (
        <p className="alert error" role="alert">
          {error || (metadata.error ?? drafts.error ?? expiries.error ?? cash.error)?.message}
        </p>
      )}
      <section className="surface" style={{ padding: 20, marginTop: 16 }}>
        {tab === 'counts' && !session && (
          <>
            <div className="filters">
              <label className="field">
                Ubicación
                <select
                  value={location || metadata.data?.locations[0]?.id || ''}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  {metadata.data?.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Categoría
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="">Todas</option>
                  {metadata.data?.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button primary"
                disabled={busy || !metadata.data?.locations.length}
                onClick={() =>
                  void run(async () => {
                    setSession(
                      await request<CountSession>('countStart', {
                        locationId: location || metadata.data!.locations[0]!.id,
                        ...(category ? { categoryId: category } : {}),
                      }),
                    );
                    setPage(1);
                  })
                }
              >
                Iniciar conteo
              </button>
            </div>
            <h2>Borradores recuperables</h2>
            {drafts.isPending && <p role="status">Cargando conteos pendientes…</p>}
            {drafts.data?.items.map((s) => (
              <article
                key={s.id}
                style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: 12 }}
              >
                <span>
                  {s.locationName} · {new Date(s.updatedAt).toLocaleString('es-AR')}
                </span>
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      setSession(await request('countGet', { sessionId: s.id }));
                      setPage(1);
                    })
                  }
                >
                  Retomar
                </button>
              </article>
            ))}
            {drafts.data?.total === 0 && <p>No hay conteos pendientes.</p>}
          </>
        )}
        {tab === 'counts' && session && (
          <>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div>
                <h2>{session.locationName}</h2>
                <p>
                  {session.lines.filter((l) => l.countedBase !== null).length} de{' '}
                  {session.lines.length} artículos contados · Guardado{' '}
                  {new Date(session.updatedAt).toLocaleTimeString('es-AR')}
                </p>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setSession(null);
                  setSelected([]);
                  void drafts.refetch();
                }}
              >
                Guardar y salir
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  void run(() =>
                    downloadControlExcel('operations', {
                      dataset: 'counts',
                      filters: { sessionId: session.id },
                    }),
                  )
                }
              >
                Exportar Excel
              </button>
            </div>
            <label className="field">
              Escanear o buscar
              <input
                ref={scanRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const match = session.lines.find(
                      (l) =>
                        l.barcode === search ||
                        l.sku.toLocaleLowerCase() === search.toLocaleLowerCase(),
                    );
                    if (match) {
                      setSearch(match.sku);
                      setPage(1);
                      setTimeout(
                        () => document.getElementById(`count-${match.productId}`)?.focus(),
                        0,
                      );
                    } else setError('No se encontró ese código en el alcance del conteo.');
                  }
                }}
                placeholder="Código, nombre o SKU"
              />
            </label>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Elegir</th>
                    <th>Artículo</th>
                    <th>Registrado</th>
                    <th>Contado</th>
                    <th>Diferencia</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice((page - 1) * 25, page * 25).map((line) => (
                    <CountRow
                      key={`${line.productId}:${session.revision}`}
                      line={line}
                      selected={selected.includes(line.productId)}
                      busy={busy}
                      onSelect={(checked) =>
                        setSelected((ids) =>
                          checked
                            ? [...ids, line.productId]
                            : ids.filter((id) => id !== line.productId),
                        )
                      }
                      onSave={(countedBase, lots) =>
                        void run(async () => {
                          setSession(
                            await request('countLine', {
                              sessionId: session.id,
                              expectedRevision: session.revision,
                              productId: line.productId,
                              countedBase,
                              ...(lots ? { lots } : {}),
                            }),
                          );
                          setSearch('');
                          scanRef.current?.focus();
                        })
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                className="button secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </button>
              {filtered.length > 0 && <span>Página {page}</span>}
              <button
                className="button secondary"
                disabled={page * 25 >= filtered.length}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </button>
              <button
                className="button primary"
                disabled={busy || ready.length === 0}
                onClick={() => setConfirm(true)}
              >
                Revisar {ready.length} artículos
              </button>
            </div>
          </>
        )}
        {tab === 'expiry' && (
          <>
            {expiries.isPending && <p role="status">Consultando vencimientos…</p>}
            {lotFilter && (
              <button
                className="button secondary"
                onClick={() => {
                  setLotFilter('');
                  setPage(1);
                }}
              >
                Ver todos los lotes
              </button>
            )}
            <div className="filters">
              <label className="field">
                Período
                <select
                  value={expiryBucket}
                  onChange={(e) => {
                    setExpiryBucket(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="EXPIRED">Vencidos</option>
                  <option value="WEEK">Esta semana</option>
                  <option value="MONTH">Este mes</option>
                  <option value="ALL">Todos</option>
                </select>
              </label>
              <label className="field">
                Ubicación
                <select
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas</option>
                  {metadata.data?.locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button secondary"
                onClick={() =>
                  void run(() =>
                    downloadControlExcel('operations', {
                      dataset: 'expiries',
                      filters: expiryFilters,
                    }),
                  )
                }
              >
                Exportar Excel
              </button>
            </div>
            {expiries.data?.items.map((row) => (
              <article
                key={`${row.lotId}:${row.locationId}`}
                style={{
                  padding: 16,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>
                    {row.productName} · Lote {row.code}
                  </strong>
                  <p>
                    {row.locationName} · {amount(row.quantityBase, row.unit)} · Vence{' '}
                    {row.expiresOn} ·{' '}
                    {row.status === 'BLOCKED'
                      ? 'Bloqueado'
                      : row.expiresOn < new Date().toLocaleDateString('sv-SE')
                        ? 'Vencido'
                        : 'Próximo / activo'}
                  </p>
                </div>
                <button className="button secondary" onClick={() => setLot(row)}>
                  Abrir lote
                </button>
              </article>
            ))}
            {expiries.data?.total === 0 && <p>No hay lotes en este período.</p>}
          </>
        )}
        {tab === 'cash' && (
          <>
            {cash.isPending && <p role="status">Consultando diferencias…</p>}
            {shiftFilter && (
              <button
                className="button secondary"
                onClick={() => {
                  setShiftFilter('');
                  setPage(1);
                }}
              >
                Ver todos los cierres
              </button>
            )}
            <div className="filters">
              <label className="field">
                Estado
                <select
                  value={cashStatus}
                  onChange={(e) => {
                    setCashStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="PENDING">Pendientes</option>
                  <option value="REVIEWED">Revisados</option>
                  <option value="ALL">Todos</option>
                </select>
              </label>
              <button
                className="button secondary"
                onClick={() =>
                  void run(() =>
                    downloadControlExcel('operations', {
                      dataset: 'cashDifferences',
                      filters: cashFilters,
                    }),
                  )
                }
              >
                Exportar Excel
              </button>
            </div>
            {cash.data?.summary && (
              <p>
                Faltantes {formatMoney(cash.data.summary.shortagesCents)} · Sobrantes{' '}
                {formatMoney(cash.data.summary.surplusesCents)}
              </p>
            )}
            {cash.data?.items.map((row) => (
              <article
                key={row.shiftId}
                style={{
                  padding: 16,
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 12,
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <strong>
                    {row.terminalName} · {row.actorName}
                  </strong>
                  <p>
                    {new Date(row.closedAt).toLocaleString('es-AR')} · Esperado{' '}
                    {formatMoney(row.expectedCents)} · Contado {formatMoney(row.countedCents)}
                  </p>
                  <p>
                    {row.differenceCents < 0 ? 'Faltante' : 'Sobrante'}{' '}
                    {formatMoney(Math.abs(row.differenceCents))}
                  </p>
                  {row.reviewNote && <p>Revisado: {row.reviewNote}</p>}
                </div>
                {canReview && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setReview(row);
                      setNote(row.reviewNote ?? '');
                    }}
                  >
                    Revisar cierre
                  </button>
                )}
              </article>
            ))}
            {cash.data?.total === 0 && <p>No hay cierres con diferencias en este estado.</p>}
          </>
        )}
        {!session && !!total && (
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              className="button secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </button>
            <span>
              Página {page} · {total ?? 0} resultados
            </span>
            <button
              className="button secondary"
              disabled={page * 25 >= (total ?? 0)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
      {confirm && session && (
        <Dialog title="Confirmar diferencias" onClose={() => setConfirm(false)} busy={busy}>
          <div className="dialog-body">
            {changed.map((l) => (
              <p key={l.productId}>
                {l.name}:{' '}
                {l.observedBase === null ? 'Sin conteo registrado' : amount(l.observedBase, l.unit)}{' '}
                → {amount(l.countedBase!, l.unit)} ({l.differenceBase! > 0 ? '+' : ''}
                {amount(l.differenceBase!, l.unit)})
              </p>
            ))}
            <label className="field">
              Motivo del ajuste
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Por qué se ajusta"
              />
            </label>
            {error && <p className="alert error">{error}</p>}
          </div>
          <div className="dialog-footer">
            <button
              className="button primary"
              disabled={busy || reason.trim().length < 3}
              onClick={() =>
                void run(async () => {
                  try {
                    setSession(
                      await request('countApply', {
                        sessionId: session.id,
                        expectedRevision: session.revision,
                        productIds: ready.map((l) => l.productId),
                        reason,
                        operationKey: applyKey.current,
                      }),
                    );
                    applyKey.current = crypto.randomUUID();
                    setSelected([]);
                    setConfirm(false);
                  } catch (e) {
                    setSession(await request('countGet', { sessionId: session.id }));
                    throw e;
                  }
                })
              }
            >
              Aplicar ajustes
            </button>
          </div>
        </Dialog>
      )}
      {lot && (
        <Dialog title={`Lote ${lot.code}`} onClose={() => setLot(null)} busy={busy}>
          <div className="dialog-body">
            <h2>{lot.productName}</h2>
            <p>Ubicación: {lot.locationName}</p>
            <p>Cantidad: {amount(lot.quantityBase, lot.unit)}</p>
            <p>Vencimiento: {lot.expiresOn}</p>
            <p>Bloquear el lote impide venderlo en todas sus ubicaciones.</p>
            {error && <p className="alert error">{error}</p>}
          </div>
          <div className="dialog-footer">
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  unwrap(
                    await api().lots.setBlocked({
                      lotId: lot.lotId,
                      blocked: lot.status !== 'BLOCKED',
                    }),
                  );
                  setLot(null);
                  await expiries.refetch();
                })
              }
            >
              {lot.status === 'BLOCKED' ? 'Desbloquear lote' : 'Bloquear lote'}
            </button>
          </div>
        </Dialog>
      )}
      {review && (
        <Dialog title="Revisar cierre" onClose={() => setReview(null)} busy={busy}>
          <div className="dialog-body">
            <p>
              {review.terminalName} · {review.actorName} · Diferencia{' '}
              {formatMoney(review.differenceCents)}
            </p>
            <label className="field">
              Nota de revisión
              <textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {error && <p className="alert error">{error}</p>}
          </div>
          <div className="dialog-footer">
            <button
              className="button primary"
              disabled={busy || note.trim().length < 3}
              onClick={() =>
                void run(async () => {
                  await request('cashReview', {
                    shiftId: review.shiftId,
                    expectedRevision: review.reviewRevision,
                    note,
                  });
                  setReview(null);
                  await cash.refetch();
                })
              }
            >
              Marcar revisado
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function CountRow({
  line,
  selected,
  busy,
  onSelect,
  onSave,
}: {
  line: CountLine;
  selected: boolean;
  busy: boolean;
  onSelect: (v: boolean) => void;
  onSave: (
    v: number | null,
    lots?: { lotId: string; countedBase: number; expectedRevision: number }[],
  ) => void;
}) {
  const [rowError, setRowError] = useState('');
  const [value, setValue] = useState(
      line.countedBase === null
        ? ''
        : String(line.unit === 'KG' ? line.countedBase / 1000 : line.countedBase),
    ),
    [lots, setLots] = useState<Record<string, string>>(
      Object.fromEntries(
        line.lots.map((l) => [
          l.lotId,
          l.countedBase === undefined || l.countedBase === null
            ? ''
            : String(line.unit === 'KG' ? l.countedBase / 1000 : l.countedBase),
        ]),
      ),
    );
  const savedValue =
    line.countedBase === null
      ? ''
      : String(line.unit === 'KG' ? line.countedBase / 1000 : line.countedBase);
  const dirty =
    value !== savedValue ||
    line.lots.some(
      (lot) =>
        (lots[lot.lotId] ?? '') !==
        (lot.countedBase == null
          ? ''
          : String(line.unit === 'KG' ? lot.countedBase / 1000 : lot.countedBase)),
    );
  function save() {
    const convert = (v: string) => parseQuantity(v, line.unit);
    try {
      if (
        value !== '' &&
        (!Number.isFinite(Number(value)) || Number(value) < 0 || !Number.isInteger(convert(value)))
      ) {
        setRowError('Ingresá una cantidad válida para la unidad del artículo.');
        return;
      }
      if (
        value !== '' &&
        line.lots.some(
          (l) =>
            lots[l.lotId] === '' ||
            !Number.isFinite(Number(lots[l.lotId])) ||
            Number(lots[l.lotId]) < 0,
        )
      ) {
        setRowError('Ingresá la cantidad física de cada lote.');
        return;
      }
      setRowError('');
      onSave(
        value === '' ? null : convert(value),
        value !== '' && line.lots.length
          ? line.lots.map((l) => ({
              lotId: l.lotId,
              countedBase: convert(lots[l.lotId] ?? '0'),
              expectedRevision: l.revision,
            }))
          : undefined,
      );
    } catch {
      setRowError(`Ingresá una cantidad válida en ${line.unit === 'KG' ? 'kg' : 'unidades'}.`);
    }
  }
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          aria-label={`Elegir ${line.name}`}
          checked={selected}
          disabled={line.status !== 'COUNTED' || busy || dirty}
          onChange={(e) => onSelect(e.target.checked)}
        />
      </td>
      <td>
        <strong>{line.name}</strong>
        <small>
          {line.sku} · {line.unit === 'KG' ? 'kg' : 'unidades'}
        </small>
      </td>
      <td className="numeric">
        {line.observedBase === null
          ? 'Sin conteo registrado'
          : amount(line.observedBase, line.unit)}
      </td>
      <td>
        <input
          id={`count-${line.productId}`}
          aria-label={`Cantidad física de ${line.name}`}
          type="number"
          min="0"
          step={line.unit === 'KG' ? '0.001' : '1'}
          value={value}
          disabled={busy || line.status === 'APPLIED'}
          onChange={(e) => {
            setValue(e.target.value);
            if (selected) onSelect(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          placeholder="Sin contar"
          style={{ width: 120 }}
        />
        {dirty && <small className="count-unsaved">Cantidad sin guardar</small>}
        {line.lots.length > 0 && (
          <details>
            <summary>Conteo por lote</summary>
            {line.lots.map((l) => (
              <label key={l.lotId}>
                {l.code}
                <input
                  type="number"
                  min="0"
                  step={line.unit === 'KG' ? '0.001' : '1'}
                  value={lots[l.lotId] ?? ''}
                  onChange={(e) => {
                    setLots({ ...lots, [l.lotId]: e.target.value });
                    if (selected) onSelect(false);
                  }}
                />
              </label>
            ))}
          </details>
        )}
        <button
          className="button quiet small"
          disabled={busy || line.status === 'APPLIED'}
          onClick={save}
        >
          Guardar
        </button>
      </td>
      <td>
        {rowError && (
          <small role="alert" className="alert error">
            {rowError}
          </small>
        )}
        {line.differenceBase === null
          ? '—'
          : `${line.differenceBase > 0 ? '+' : ''}${amount(line.differenceBase, line.unit)}`}
      </td>
      <td>
        {
          {
            UNCOUNTED: 'Sin contar',
            COUNTED: 'Contado',
            REVIEW: 'Revisar y volver a contar',
            APPLIED: 'Aplicado',
          }[line.status]
        }
      </td>
    </tr>
  );
}
