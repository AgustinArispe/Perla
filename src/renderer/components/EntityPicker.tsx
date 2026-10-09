import { useEffect, useId, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from './Icon';
import { errorMessage } from '../api';

export function EntityPicker<T extends { id: string; name: string }>({
  label,
  value,
  onChange,
  load,
  queryKey,
  detail,
  disabled = false,
}: {
  label: string;
  value: T | null;
  onChange: (value: T | null) => void;
  load: (query: string) => Promise<T[]>;
  queryKey: string;
  detail?: (item: T) => string;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const focusAfterChoice = useRef(false);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const result = useQuery({
    queryKey: [queryKey, 'picker', query],
    queryFn: () => load(query),
    enabled: open,
    retry: false,
  });
  const items = result.data ?? [];
  const activeIndex = Math.min(index, Math.max(0, items.length - 1));
  useEffect(() => {
    if (open) input.current?.focus();
    else if (focusAfterChoice.current) {
      focusAfterChoice.current = false;
      (value ? changeButton.current : input.current)?.focus();
    }
  }, [open, value]);
  useEffect(() => {
    if (open) document.getElementById(`${id}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [open, id, activeIndex, result.data]);
  function choose(item: T) {
    focusAfterChoice.current = true;
    onChange(item);
    setOpen(false);
    setQuery('');
    setIndex(0);
  }
  return (
    <div
      className="entity-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span className="entity-picker-label">{label}</span>
      {value && !open ? (
        <div className="entity-selection">
          <span>
            <strong>{value.name}</strong>
            {detail && <small>{detail(value)}</small>}
          </span>
          <button
            ref={changeButton}
            type="button"
            className="button quiet small"
            disabled={disabled}
            onClick={() => setOpen(true)}
          >
            Cambiar
          </button>
          <button
            type="button"
            className="icon-button"
            aria-label={`Quitar ${label.toLowerCase()}`}
            disabled={disabled}
            onClick={() => {
              onChange(null);
              setOpen(true);
            }}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ) : (
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            ref={input}
            role="combobox"
            aria-autocomplete="list"
            aria-label={label}
            aria-expanded={open}
            aria-controls={id}
            aria-activedescendant={
              open && !result.isFetching && items[activeIndex] ? `${id}-${activeIndex}` : undefined
            }
            placeholder={`Buscar ${label.toLowerCase()}`}
            value={query}
            disabled={disabled}
            autoComplete="off"
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setOpen(true);
                setIndex((n) =>
                  Math.max(0, Math.min(items.length - 1, n + (e.key === 'ArrowDown' ? 1 : -1))),
                );
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                if (open && !result.isFetching && items[activeIndex]) choose(items[activeIndex]!);
              }
              if (e.key === 'Escape' && open) {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
              }
            }}
          />
        </label>
      )}
      {open && (
        <div className="entity-results" id={id} role="listbox" aria-label={label}>
          {result.isFetching ? (
            <p role="status">Buscando…</p>
          ) : result.isError ? (
            <p role="alert">
              {errorMessage(result.error)}{' '}
              <button type="button" onClick={() => void result.refetch()}>
                Reintentar
              </button>
            </p>
          ) : items.length ? (
            items.map((item, n) => (
              <button
                type="button"
                key={item.id}
                id={`${id}-${n}`}
                role="option"
                tabIndex={-1}
                aria-selected={n === activeIndex}
                className={n === activeIndex ? 'selected' : ''}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setIndex(n)}
                onClick={() => choose(item)}
              >
                <strong>{item.name}</strong>
                {detail && <small>{detail(item)}</small>}
              </button>
            ))
          ) : (
            <p>Sin resultados.</p>
          )}
          <button type="button" className="picker-close" onClick={() => setOpen(false)}>
            Cerrar búsqueda
          </button>
        </div>
      )}
    </div>
  );
}
