import { PerlaLoading } from '../../components/PerlaLoading';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { TaxonomyItem } from '../../../shared/catalog';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

type Kind = 'category' | 'brand';

function TaxonomyPanel({ kind, items }: { kind: Kind; items: TaxonomyItem[] }) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<TaxonomyItem | null>(null);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: async (input: { item?: TaxonomyItem; name: string; active: boolean }) =>
      unwrap(
        await (kind === 'category' ? api().products.saveCategory : api().products.saveBrand)({
          ...(input.item ? { id: input.item.id, expectedRevision: input.item.revision } : {}),
          name: input.name,
          active: input.active,
        }),
      ),
    onSuccess: () => {
      setName('');
      setEditing(null);
      setError('');
      void client.invalidateQueries({ queryKey: ['product-taxonomy'] });
      void client.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const label = kind === 'category' ? 'Categoría' : 'Marca';
  return (
    <section className="taxonomy-panel">
      <div className="taxonomy-panel-heading">
        <h3>{kind === 'category' ? 'Categorías' : 'Marcas'}</h3>
        <span>{items.length}</span>
      </div>
      <form
        className="taxonomy-create"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) save.mutate({ name: name.trim(), active: true });
        }}
      >
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={`Nueva ${label.toLowerCase()}`}
          maxLength={80}
        />
        <button
          className="button primary small"
          type="submit"
          disabled={!name.trim() || save.isPending}
        >
          Agregar
        </button>
      </form>
      {error && <div className="alert error">{error}</div>}
      <div className="taxonomy-list">
        {items.map((item) =>
          editing?.id === item.id ? (
            <form
              className="taxonomy-edit"
              key={item.id}
              onSubmit={(event) => {
                event.preventDefault();
                if (name.trim()) save.mutate({ item, name: name.trim(), active: item.active });
              }}
            >
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
                maxLength={80}
              />
              <button className="button primary small" type="submit">
                Guardar
              </button>
              <button
                className="button secondary small"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setName('');
                }}
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className="taxonomy-row" key={item.id}>
              <span>{item.name}</span>
              <div>
                {!item.active && <span className="pill">Inactiva</span>}
                <button
                  className="text-button"
                  onClick={() => {
                    setEditing(item);
                    setName(item.name);
                  }}
                >
                  Editar
                </button>
                <button
                  className="text-button"
                  onClick={() => save.mutate({ item, name: item.name, active: !item.active })}
                >
                  {item.active ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export function TaxonomyManager({ onClose }: { onClose: () => void }) {
  const taxonomy = useQuery({
    queryKey: ['product-taxonomy', 'all'],
    queryFn: async () => unwrap(await api().products.taxonomy({ includeInactive: true })),
    retry: false,
  });
  return (
    <Dialog title="Categorías y marcas" onClose={onClose} wide className="taxonomy-dialog">
      <div className="dialog-body">
        {taxonomy.isPending && <PerlaLoading size="compact" label="Cargando catálogos…" />}
        {taxonomy.isError && <div className="alert error">{errorMessage(taxonomy.error)}</div>}
        {taxonomy.data && (
          <div className="taxonomy-grid">
            <TaxonomyPanel kind="category" items={taxonomy.data.categories} />
            <TaxonomyPanel kind="brand" items={taxonomy.data.brands} />
          </div>
        )}
      </div>
      <div className="dialog-footer">
        <span />
        <button className="button secondary" onClick={onClose}>
          Listo
        </button>
      </div>
    </Dialog>
  );
}

export function TaxonomyCreateDialog({
  kind,
  onClose,
  onCreated,
}: {
  kind: Kind;
  onClose: () => void;
  onCreated: (item: TaxonomyItem) => void;
}) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const save = useMutation({
    mutationFn: () =>
      (kind === 'category' ? api().products.saveCategory : api().products.saveBrand)({
        name: name.trim(),
        active: true,
      }).then(unwrap),
    onSuccess: async (item) => {
      await client.invalidateQueries({ queryKey: ['product-taxonomy'] });
      onCreated(item);
    },
  });
  return (
    <Dialog
      title={kind === 'category' ? 'Nueva categoría' : 'Nueva marca'}
      onClose={onClose}
      busy={save.isPending}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim() && !save.isPending) save.mutate();
        }}
      >
        <div className="dialog-body">
          <label className="field">
            Nombre
            <input
              data-dialog-focus
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={save.isPending}
            />
          </label>
          {save.isError && (
            <p role="alert" className="alert error">
              {errorMessage(save.error)}
            </p>
          )}
        </div>
        <div className="dialog-footer">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={save.isPending}
          >
            Volver al producto
          </button>
          <button className="button primary" disabled={save.isPending || !name.trim()}>
            {save.isPending ? 'Guardando…' : 'Guardar y seleccionar'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
