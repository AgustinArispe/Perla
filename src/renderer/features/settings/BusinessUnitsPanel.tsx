import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, errorMessage } from '../../api';
import type { BusinessUnit } from '../../../shared/business-units';

export function BusinessUnitsPanel() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['business-units'],
    queryFn: () => api().businessUnits.status().then(unwrap),
  });
  const [editing, setEditing] = useState<BusinessUnit | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    if (!editing || busy) return;
    setBusy(true);
    setError('');
    try {
      unwrap(
        await api().businessUnits.rename({
          id: editing.id,
          expectedRevision: editing.revision,
          name,
        }),
      );
      setEditing(null);
      await client.invalidateQueries({ queryKey: ['business-units'] });
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dashboard-panel business-units-panel">
      <h2>BiEmpresa · unidades operativas</h2>
      <p>
        Un catálogo, un inventario compartido y dos unidades identificadas. Los usuarios venden en
        su unidad asignada. Los reportes generales consolidan todas las operaciones.
      </p>
      <p>
        No incluye facturación fiscal, propiedad de stock por empresa ni liquidaciones entre razones
        sociales.
      </p>
      {(error || query.isError) && (
        <p role="alert">
          {error || errorMessage(query.error)}{' '}
          <button className="button quiet" onClick={() => void query.refetch()}>
            Actualizar unidades
          </button>
        </p>
      )}
      {query.data?.units.map((unit) => (
        <article className="business-unit-card" key={unit.id}>
          <span className="pill">
            {unit.secondary ? 'Segunda unidad · dorado' : 'Unidad principal · azul'}
          </span>
          {editing?.id === unit.id ? (
            <div className="business-unit-editor">
              <label>
                Nombre de la unidad
                <input
                  value={name}
                  maxLength={100}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <button className="button primary" disabled={busy} onClick={() => void save()}>
                Guardar nombre
              </button>
              <button className="button secondary" disabled={busy} onClick={() => setEditing(null)}>
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <h3>{unit.name}</h3>
              <button
                className="button secondary"
                onClick={() => {
                  setEditing(unit);
                  setName(unit.name);
                  setError('');
                }}
              >
                Cambiar nombre de {unit.name}
              </button>
            </>
          )}
        </article>
      ))}
      <p>
        Asigná cada cuenta desde Administración → Usuarios. Cambiar la unidad de un usuario cierra
        sus sesiones; no cambia las ventas anteriores. Al desactivar BiEmpresa, las ventas nuevas
        usan la unidad principal y el historial conserva su origen.
      </p>
    </section>
  );
}
