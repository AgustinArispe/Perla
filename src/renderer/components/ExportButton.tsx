import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { api, unwrap } from '../api';
import { useState } from 'react';
import { Dialog } from './Dialog';
import { RANKING_LIMITS } from '../../domain/ranking';
import { Icon } from './Icon';
import { ExportRowPicker } from './ExportRowPicker';
import type { ExcelPreview } from '../../shared/excel';
import type { AuthStatus } from '../../shared/auth';
import { downloadExcel, webValue } from '../web-client';
import { controlValue } from '../features/control/client';
import { errorMessage } from '../api';
import {
  excelTitle,
  excelFilterKeys,
  excelMultipleKeys,
  type ExcelDataset,
  type ExcelFilters,
} from '../../shared/excel';
const labels: Record<string, string> = {
  ALL: 'Todos',
  ACTIVE: 'Activos',
  INACTIVE: 'Inactivos',
  COMPLETED: 'Completadas',
  VOIDED: 'Anuladas',
  RECEIVED: 'Recibidas',
  OPEN: 'Abiertos',
  CLOSED: 'Cerrados',
  IN_TRANSIT: 'En tránsito',
  CANCELLED: 'Cancelados',
  SHORTAGES: 'Para reponer',
  UNKNOWN: 'Sin conteo',
  OUT: 'Sin stock',
  LOW: 'Bajo mínimo',
  NEGATIVE: 'Stock negativo',
  OK: 'Disponible',
  DISABLED: 'Sin control',
  CURRENT: 'Vigentes',
  SCHEDULED: 'Programadas',
  OTHER: 'Otras',
  revenue: 'Facturación neta',
  categories: 'Categorías por importe',
  units: 'Unidades',
  kilos: 'Kilos',
  OWNER: 'Jefe',
  ADMIN: 'Administrador',
  SUPERVISOR: 'Supervisor',
  SELLER: 'Vendedor',
  TODAY: 'Hoy',
  WEEK: 'Esta semana',
  MONTH: 'Este mes',
  CUSTOM: 'Rango de fechas',
};
export function ExportButton({
  dataset,
  filters = {},
  label = 'Exportar Excel',
  selectedIds,
}: {
  dataset: ExcelDataset;
  filters?: ExcelFilters;
  label?: string;
  selectedIds?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const client = useQueryClient();
  if (client.getQueryData<AuthStatus>(['auth-status'])?.user?.role === 'SELLER') return null;
  return (
    <span className="export-control">
      <button
        type="button"
        className="button secondary export-open"
        aria-label={`Exportar ${excelTitle(dataset, filters).toLowerCase()} a Excel`}
        disabled={downloading}
        onClick={async () => {
          if (dataset !== 'products' || !selectedIds?.length) {
            setOpen(true);
            return;
          }
          setDownloading(true);
          setDownloadError('');
          try {
            await downloadExcel({ dataset, filters: {}, selectedIds });
          } catch (error) {
            setDownloadError(errorMessage(error));
          } finally {
            setDownloading(false);
          }
        }}
      >
        <Icon name="download" size={17} />
        {downloading
          ? 'Preparando Excel…'
          : selectedIds?.length
            ? `Exportar selección (${selectedIds.length})`
            : label}
      </button>
      {downloadError && (
        <span className="alert error" role="alert">
          {downloadError}
        </span>
      )}
      {open && (
        <ExportDialog
          dataset={dataset}
          initial={filters}
          selectedIds={selectedIds ?? []}
          onClose={() => setOpen(false)}
        />
      )}
    </span>
  );
}
export function ExportDialog({
  dataset,
  initial,
  onClose,
  selectedIds = [],
}: {
  dataset: ExcelDataset;
  initial: ExcelFilters;
  onClose: () => void;
  selectedIds?: string[];
}) {
  const [filters, setFilters] = useState<ExcelFilters>(() => {
    const next: Record<string, unknown> = Object.fromEntries(
      Object.entries(initial).filter(([, v]) => v !== undefined && v !== ''),
    );
    for (const [single, multiple] of Object.entries(excelMultipleKeys)) {
      if (next[single] && next[single] !== 'ALL') next[multiple] = [next[single]];
      delete next[single];
    }
    if (dataset === 'customers') {
      if (initial.activeOnly !== false) next.statuses = ['ACTIVE'];
      delete next.activeOnly;
    }
    return next as ExcelFilters;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [viewName, setViewName] = useState('');
  const [saved, setSaved] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [selection, setSelection] = useState<string[] | undefined>(
    selectedIds.length ? [] : undefined,
  );
  const supportsViews = [
    'products',
    'stock',
    'purchases',
    'suppliers',
    'inventory',
    'transfers',
    'customers',
    'promotions',
    'sales',
    'shifts',
    'users',
    'audit',
  ].includes(dataset);
  async function saveFilters() {
    setBusy(true);
    setError('');
    try {
      await controlValue('workspace', 'saveView', {
        module: dataset,
        name: viewName,
        filters,
        dates: 'FIXED',
      });
      setSaved(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const keys = excelFilterKeys[dataset];
  const taxonomy = useQuery({
    queryKey: ['product-taxonomy'],
    queryFn: async () => unwrap(await api().products.taxonomy({})),
    enabled: keys.includes('categoryId'),
    retry: false,
  });
  const locations = useQuery({
    queryKey: ['locations'],
    queryFn: async () => unwrap(await api().locations.list()),
    enabled: keys.includes('locationId'),
    retry: false,
  });
  const terminals = useQuery({
    queryKey: ['terminals', 'active'],
    queryFn: () => webValue<{ id: string; name: string }[]>('/terminals/active'),
    enabled: keys.includes('terminalId'),
    retry: false,
  });
  const options =
    dataset === 'users' ||
    dataset === 'products' ||
    dataset === 'suppliers' ||
    dataset === 'customers'
      ? ['ALL', 'ACTIVE', 'INACTIVE']
      : dataset === 'sales'
        ? ['ALL', 'COMPLETED', 'VOIDED']
        : dataset === 'purchases'
          ? ['ALL', 'RECEIVED', 'VOIDED']
          : dataset === 'shifts'
            ? ['ALL', 'OPEN', 'CLOSED']
            : ['ALL', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'];
  const statusKey =
    dataset === 'customers'
      ? 'status'
      : keys.includes('status')
        ? 'status'
        : keys.includes('filter')
          ? 'filter'
          : keys.includes('view')
            ? 'view'
            : null;
  const statusOptions =
    statusKey === 'filter'
      ? ['ALL', 'SHORTAGES', 'UNKNOWN', 'OUT', 'LOW', 'NEGATIVE', 'OK', 'DISABLED']
      : statusKey === 'view'
        ? ['ALL', 'CURRENT', 'SCHEDULED', 'OTHER']
        : options;
  const update = (key: keyof ExcelFilters, value: unknown) => {
    setSelection(undefined);
    setFilters((current) => {
      const next = { ...current, [key]: value };
      if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0))
        delete next[key];
      return next;
    });
  };
  async function run() {
    if (busy) return;
    if (selection && !selection.length) {
      setError('Elegí al menos una fila o exportá todos los resultados.');
      return;
    }
    if (dataset === 'inventory' && !filters.locationIds?.length) {
      setAdjusting(true);
      setError('Elegí al menos una ubicación.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await downloadExcel({ dataset, filters, ...(selection ? { selection } : {}) });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <Dialog
      title={`Exportar ${excelTitle(dataset, filters).toLowerCase()}`}
      onClose={onClose}
      busy={busy}
      size={selection ? 'wide' : 'regular'}
      className="export-dialog"
    >
      <form
        className="checkout-modal export-form"
        onInvalidCapture={(event) => {
          setAdjusting(true);
          const target = event.target;
          if (target instanceof HTMLElement) setTimeout(() => target.focus(), 0);
        }}
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <div className="export-content">
          <div className="export-scope" aria-label="Alcance de la exportación">
            <strong>{excelTitle(dataset, filters)}</strong>
            <dl className="export-scope-values">
              {Object.entries(filters)
                .filter(
                  ([, value]) =>
                    value !== undefined &&
                    value !== '' &&
                    value !== false &&
                    (!Array.isArray(value) || value.length > 0),
                )
                .map(([key, value]) => {
                  const names: Record<string, string> = {
                    query: 'Búsqueda',
                    categoryIds: 'Categorías',
                    brandIds: 'Marcas',
                    locationIds: 'Ubicaciones',
                    statuses: 'Estados',
                    filters: 'Stock',
                    views: 'Vigencia',
                    fromDate: 'Desde',
                    toDate: 'Hasta',
                    from: 'Desde',
                    to: 'Hasta',
                    month: 'Mes',
                    preset: 'Período',
                    terminalIds: 'Cajas',
                    roles: 'Roles',
                    rank: 'Orden',
                    topCount: 'Máximo de resultados',
                    operation: 'Operación',
                    includeInactive: 'Inactivos',
                  };
                  const entities =
                    key === 'categoryIds'
                      ? taxonomy.data?.categories
                      : key === 'brandIds'
                        ? taxonomy.data?.brands
                        : key === 'locationIds'
                          ? locations.data
                          : key === 'terminalIds'
                            ? terminals.data
                            : undefined;
                  const describe = (item: unknown) =>
                    entities?.find((entity) => entity.id === item)?.name ??
                    labels[String(item)] ??
                    (entities ? 'Opción seleccionada' : String(item));
                  return (
                    <div key={key}>
                      <dt>{names[key] ?? key}</dt>
                      <dd>
                        {Array.isArray(value)
                          ? value.map(describe).join(', ')
                          : value === true
                            ? 'Incluidos'
                            : describe(value)}
                      </dd>
                    </div>
                  );
                })}
            </dl>
            {Object.keys(filters).length === 0 && <p>Todos los resultados.</p>}
            <p className="subtle-note">
              {selection
                ? 'Se exportan solo las filas elegidas. Cambiar filtros reinicia la selección.'
                : 'Incluye todos los resultados de los filtros, no solo esta página.'}
            </p>
            <button
              type="button"
              className="button secondary"
              aria-expanded={adjusting}
              aria-controls="export-adjustment"
              disabled={busy}
              onClick={() => setAdjusting(!adjusting)}
            >
              {adjusting ? 'Cerrar ajuste de filtros' : 'Ajustar filtros'}
            </button>
          </div>
          <ExportRowPicker
            key={JSON.stringify(filters)}
            source={JSON.stringify({ dataset, filters, selectedIds })}
            selection={selection}
            onChange={setSelection}
            initialIds={selectedIds}
            load={(page) =>
              webValue<ExcelPreview>('/exports/preview', 'POST', {
                request: { dataset, filters },
                page,
                initialIds: selectedIds,
              })
            }
          />
          <fieldset
            id="export-adjustment"
            hidden={!adjusting}
            disabled={busy}
            className="plain-fields"
          >
            {keys.includes('query') && (
              <label className="field">
                Buscar
                <input
                  value={filters.query ?? ''}
                  onChange={(e) => update('query', e.target.value)}
                  placeholder="Todos los resultados"
                />
              </label>
            )}
            {keys.includes('categoryId') && (
              <div className="form-grid">
                <ExportMultiSelect
                  title="Categorías"
                  options={taxonomy.data?.categories ?? []}
                  selected={filters.categoryIds ?? []}
                  onChange={(value) => update('categoryIds', value)}
                />
                <ExportMultiSelect
                  title="Marcas"
                  options={taxonomy.data?.brands ?? []}
                  selected={filters.brandIds ?? []}
                  onChange={(value) => update('brandIds', value)}
                />
              </div>
            )}
            {keys.includes('locationId') && (
              <ExportMultiSelect
                title="Ubicaciones"
                options={locations.data ?? []}
                selected={filters.locationIds ?? []}
                onChange={(value) => update('locationIds', value)}
              />
            )}
            {keys.includes('fromDate') && (
              <div className="form-grid">
                <label className="field">
                  Desde
                  <input
                    type="date"
                    value={filters.fromDate ?? ''}
                    onChange={(e) => update('fromDate', e.target.value)}
                    max={filters.toDate}
                  />
                </label>
                <label className="field">
                  Hasta
                  <input
                    type="date"
                    value={filters.toDate ?? ''}
                    onChange={(e) => update('toDate', e.target.value)}
                    min={filters.fromDate}
                  />
                </label>
              </div>
            )}
            {keys.includes('month') && (
              <label className="field">
                Mes
                <input
                  type="month"
                  required
                  value={filters.month ?? ''}
                  onChange={(e) => update('month', e.target.value)}
                />
              </label>
            )}
            {keys.includes('topCount') && (
              <label className="field">
                Cantidad de resultados
                <select
                  value={filters.topCount ?? ''}
                  onChange={(event) =>
                    update('topCount', event.target.value ? Number(event.target.value) : undefined)
                  }
                >
                  <option value="">Ranking completo</option>
                  {RANKING_LIMITS.map((value) => (
                    <option key={value} value={value}>
                      Top {value}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {statusKey && (
              <ExportMultiSelect
                title="Estados"
                options={statusOptions
                  .filter((value) => value !== 'ALL')
                  .map((id) => ({ id, name: labels[id] ?? id }))}
                selected={(filters[excelMultipleKeys[statusKey]] ?? []) as string[]}
                onChange={(value) => update(excelMultipleKeys[statusKey], value)}
              />
            )}
            {keys.includes('includeInactive') && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.includeInactive ?? false}
                  onChange={(e) => update('includeInactive', e.target.checked)}
                />
                Incluir productos inactivos
              </label>
            )}
            {keys.includes('terminalId') && (
              <ExportMultiSelect
                title="Cajas"
                options={terminals.data ?? []}
                selected={filters.terminalIds ?? []}
                onChange={(value) => update('terminalIds', value)}
              />
            )}
            {keys.includes('operation') && (
              <label className="field">
                Operación
                <input
                  value={filters.operation ?? ''}
                  onChange={(e) => update('operation', e.target.value)}
                  placeholder="Todas"
                />
              </label>
            )}
            {keys.includes('preset') && (
              <>
                <label className="field">
                  Período
                  <select
                    value={filters.preset ?? 'MONTH'}
                    onChange={(e) => update('preset', e.target.value as ExcelFilters['preset'])}
                  >
                    <option value="TODAY">Hoy</option>
                    <option value="WEEK">Semana</option>
                    <option value="MONTH">Mes</option>
                    <option value="CUSTOM">Rango</option>
                  </select>
                </label>
                {filters.preset === 'CUSTOM' && (
                  <div className="form-grid">
                    <label className="field">
                      Desde
                      <input
                        required
                        type="date"
                        value={filters.from ?? ''}
                        max={filters.to}
                        onChange={(e) => update('from', e.target.value)}
                      />
                    </label>
                    <label className="field">
                      Hasta
                      <input
                        required
                        type="date"
                        value={filters.to ?? ''}
                        min={filters.from}
                        onChange={(e) => update('to', e.target.value)}
                      />
                    </label>
                  </div>
                )}
              </>
            )}
            {keys.includes('role') && (
              <ExportMultiSelect
                title="Roles"
                options={[
                  { id: 'OWNER', name: 'Jefe' },
                  { id: 'ADMIN', name: 'Administrador' },
                  { id: 'SUPERVISOR', name: 'Supervisor' },
                  { id: 'SELLER', name: 'Vendedor' },
                ]}
                selected={filters.roles ?? []}
                onChange={(value) => update('roles', value)}
              />
            )}
            {keys.includes('rank') && (
              <label className="field">
                Ordenar por
                <select
                  value={filters.rank ?? 'revenue'}
                  onChange={(e) => update('rank', e.target.value)}
                >
                  {['revenue', 'units', 'kilos'].map((value) => (
                    <option key={value} value={value}>
                      {labels[value]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </fieldset>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          {supportsViews && (
            <details>
              <summary>Guardar estos filtros</summary>
              <label className="field">
                Nombre
                <input
                  value={viewName}
                  maxLength={60}
                  onChange={(e) => {
                    setViewName(e.target.value);
                    setSaved(false);
                  }}
                />
              </label>
              <button
                type="button"
                className="button secondary"
                disabled={busy || !viewName.trim() || saved}
                onClick={() => void saveFilters()}
              >
                {saved ? 'Vista guardada' : 'Guardar vista'}
              </button>
            </details>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Volver
          </button>
          <button className="button primary" disabled={busy} data-dialog-focus>
            {busy ? 'Preparando Excel…' : 'Descargar Excel'}
          </button>
        </div>
      </form>
    </Dialog>,
    document.body,
  );
}

function ExportMultiSelect({
  title,
  options,
  selected,
  onChange,
}: {
  title: string;
  options: { id: string; name: string }[];
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const [search, setSearch] = useState('');
  const visible = options.filter((item) =>
    item.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const summary =
    selected.length === 0
      ? 'Todas las opciones'
      : selected.length === 1
        ? (options.find((item) => item.id === selected[0])?.name ?? '1 opción')
        : `${selected.length} opciones`;
  return (
    <details className="export-multi">
      <summary>
        <span>{title}</span>
        <span className="export-multi-value">{summary}</span>
      </summary>
      <div className="export-multi-body">
        {options.length > 6 && (
          <input
            aria-label={`Buscar ${title.toLowerCase()}`}
            placeholder="Buscar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        <div role="group" aria-label={title} className="export-multi-options">
          {visible.map((item) => (
            <label key={item.id}>
              <input
                type="checkbox"
                checked={selected.includes(item.id)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, item.id]
                      : selected.filter((id) => id !== item.id),
                  )
                }
              />
              {item.name}
            </label>
          ))}
          {visible.length === 0 && <span className="subtle-note">Sin opciones</span>}
        </div>
        {selected.length > 0 && (
          <button type="button" className="button ghost" onClick={() => onChange([])}>
            Quitar selección
          </button>
        )}
      </div>
    </details>
  );
}
