import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ExcelPreview } from '../../shared/excel';
import { errorMessage } from '../api';

export function ExportRowPicker({
  source,
  load,
  selection,
  onChange,
  initialIds = [],
}: {
  source: string;
  load: (page: { sheet: number; offset: number; limit: number }) => Promise<ExcelPreview>;
  selection: string[] | undefined;
  onChange: (keys: string[] | undefined) => void;
  initialIds?: string[];
}) {
  const [sheet, setSheet] = useState(0);
  const [offset, setOffset] = useState(0);
  const initialised = useRef(false);
  const data = useQuery({
    queryKey: ['export-preview', source, sheet, offset],
    queryFn: () => load({ sheet, offset, limit: 50 }),
    enabled: selection !== undefined,
    retry: false,
    staleTime: 0,
  });
  useEffect(() => {
    if (data.data && initialIds.length && !initialised.current) {
      initialised.current = true;
      onChange(data.data.suggestedSelection);
    }
  }, [data.data, initialIds.length, onChange]);
  const selected = new Set(selection ?? []);
  const items = data.data?.items ?? [];
  const all = items.length > 0 && items.every((item) => selected.has(item.key));
  const some = items.some((item) => selected.has(item.key));
  const toggle = (key: string, checked: boolean) => {
    const next = new Set(selection);
    if (checked) next.add(key);
    else next.delete(key);
    onChange([...next]);
  };
  return (
    <section className="export-row-picker" aria-label="Filas para exportar">
      <div className="export-row-mode" role="group" aria-label="Qué exportar">
        <button
          type="button"
          className={`button secondary${selection === undefined ? ' selected' : ''}`}
          aria-pressed={selection === undefined}
          onClick={() => onChange(undefined)}
        >
          Todos los resultados
        </button>
        <button
          type="button"
          className={`button secondary${selection !== undefined ? ' selected' : ''}`}
          aria-pressed={selection !== undefined}
          onClick={() => onChange(selection ?? [])}
        >
          Elegir filas
        </button>
      </div>
      {selection !== undefined && (
        <>
          <div className="export-selection-toolbar">
            <strong role="status">
              {selection.length.toLocaleString('es-AR')}{' '}
              {selection.length === 1 ? 'fila seleccionada' : 'filas seleccionadas'}
            </strong>
            {data.data && data.data.sheets.length > 1 && (
              <label className="field">
                Hoja
                <select
                  value={sheet}
                  onChange={(event) => {
                    setSheet(Number(event.target.value));
                    setOffset(0);
                  }}
                >
                  {data.data.sheets.map((item, index) => (
                    <option key={index} value={index}>
                      {item.name} · {item.total}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              type="button"
              className="button quiet small"
              disabled={!selection.length}
              onClick={() => onChange([])}
            >
              Limpiar selección
            </button>
          </div>
          <p className="subtle-note">
            La selección se conserva entre páginas y hojas. Hasta 5.000 filas.
          </p>
          {data.isPending && <p role="status">Cargando filas…</p>}
          {data.isError && (
            <div className="alert error" role="alert">
              {errorMessage(data.error)}
              <button
                type="button"
                className="button secondary small"
                onClick={() => void data.refetch()}
              >
                Reintentar
              </button>
            </div>
          )}
          {data.data && !data.isFetching && (
            <>
              <div className="export-preview-scroll">
                <table className="export-preview-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="Seleccionar esta página"
                          checked={all}
                          disabled={
                            !items.length ||
                            (!all &&
                              new Set([...selected, ...items.map((item) => item.key)]).size > 5000)
                          }
                          ref={(node) => {
                            if (node) node.indeterminate = some && !all;
                          }}
                          onChange={(event) => {
                            const next = new Set(selection);
                            items.forEach((item) =>
                              event.target.checked ? next.add(item.key) : next.delete(item.key),
                            );
                            onChange([...next]);
                          }}
                        />
                      </th>
                      {data.data.columns.map((name, index) => (
                        <th key={index}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr
                        key={item.key}
                        className={selected.has(item.key) ? 'export-row-selected' : ''}
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Seleccionar ${item.cells[0] ?? 'fila'}`}
                            checked={selected.has(item.key)}
                            disabled={!selected.has(item.key) && selected.size >= 5000}
                            onChange={(event) => toggle(item.key, event.target.checked)}
                          />
                        </td>
                        {item.cells.map((value, index) => (
                          <td key={index}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!items.length && <p>No hay filas con estos filtros.</p>}
              <div className="export-preview-pagination">
                <span>
                  {data.data.total
                    ? `${offset + 1}–${Math.min(offset + 50, data.data.total)} de ${data.data.total}`
                    : '0 resultados'}
                </span>
                <button
                  type="button"
                  className="button secondary small"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - 50))}
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="button secondary small"
                  disabled={offset + 50 >= data.data.total}
                  onClick={() => setOffset(offset + 50)}
                >
                  Siguiente
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
