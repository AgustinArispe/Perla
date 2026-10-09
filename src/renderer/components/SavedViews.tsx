import type { ExcelDataset, ExcelFilters } from '../../shared/excel';
import { ExportDialog } from './ExportButton';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedView, SavedViewModule } from '../../shared/control';
import { controlValue } from '../features/control/client';
import { errorMessage } from '../api';
import { Dialog } from './Dialog';
import { Icon } from './Icon';
export function SavedViews<T extends object>({
  module,
  filters,
  onApply,
}: {
  module: SavedViewModule;
  filters: T;
  onApply: (filters: T) => void;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [exportView, setExportView] = useState<{
    dataset: ExcelDataset;
    filters: ExcelFilters;
  } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dates, setDates] = useState<'FIXED' | 'WEEK' | 'MONTH'>('FIXED');
  const views = useQuery({
    queryKey: ['saved-views', module],
    queryFn: () => controlValue<SavedView<T>[]>('workspace', 'views', { module }),
    enabled: open,
    retry: false,
  });
  async function save() {
    setBusy(true);
    setError('');
    try {
      await controlValue('workspace', 'saveView', { module, name, filters, dates });
      setName('');
      await client.invalidateQueries({ queryKey: ['saved-views', module] });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function apply(view: SavedView<T>) {
    setBusy(true);
    setError('');
    try {
      const applied = await controlValue<SavedView<T>>('workspace', 'applyView', { id: view.id });
      if (
        module !== 'commercial' &&
        module !== 'agenda' &&
        Object.values(applied.filters).some(Array.isArray)
      )
        setExportView({ dataset: module, filters: applied.filters as ExcelFilters });
      else onApply(applied.filters);
      setOpen(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(view: SavedView<T>) {
    setBusy(true);
    setError('');
    try {
      await controlValue('workspace', 'deleteView', {
        id: view.id,
        expectedRevision: view.revision,
      });
      await views.refetch();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button secondary" type="button" onClick={() => setOpen(true)}>
        <Icon name="history" size={17} />
        Mis vistas
      </button>
      {exportView && (
        <ExportDialog
          dataset={exportView.dataset}
          initial={exportView.filters}
          onClose={() => setExportView(null)}
        />
      )}
      {open && (
        <Dialog title="Mis vistas" onClose={() => setOpen(false)} busy={busy}>
          <div className="dialog-body saved-views">
            <p className="subtle-note">
              Guardá esta búsqueda para volver a usarla. Las vistas con selección múltiple abren su
              alcance en Excel.
            </p>
            {(error || views.isError) && (
              <div className="alert error" role="alert">
                {error || errorMessage(views.error)}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
            >
              <label className="field">
                Nombre de esta búsqueda
                <input
                  value={name}
                  maxLength={60}
                  required
                  placeholder="Ej. Stock para reponer"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              {('fromDate' in filters || 'toDate' in filters) && (
                <label className="field">
                  Fechas
                  <select value={dates} onChange={(e) => setDates(e.target.value as typeof dates)}>
                    <option value="FIXED">Conservar estas fechas</option>
                    <option value="WEEK">Esta semana</option>
                    <option value="MONTH">Este mes</option>
                  </select>
                </label>
              )}
              <button className="button primary" disabled={busy || !name.trim()}>
                Guardar vista
              </button>
            </form>
            <div className="saved-view-list">
              {views.isPending && <p role="status">Cargando vistas…</p>}
              {views.data?.length === 0 && (
                <p className="subtle-note">Todavía no guardaste vistas.</p>
              )}
              {views.data?.map((view) => (
                <div key={view.id}>
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => void apply(view)}
                  >
                    {view.name}
                    {module !== 'commercial' &&
                    module !== 'agenda' &&
                    Object.values(view.filters).some(Array.isArray)
                      ? ' · Excel'
                      : ''}
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={`Eliminar vista ${view.name}`}
                    onClick={() => void remove(view)}
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}
