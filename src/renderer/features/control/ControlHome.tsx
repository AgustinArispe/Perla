import { useQuery } from '@tanstack/react-query';
import type { ControlHome as HomeData } from '../../../shared/control';
import { useState } from 'react';
import { controlValue } from './client';
import { errorMessage } from '../../api';
import { Icon } from '../../components/Icon';
export function ControlHome({
  onOpen,
  stockEnabled,
}: {
  onOpen: (area: string, action: string, id?: string, locationId?: string) => void;
  stockEnabled: boolean;
  owner: boolean;
}) {
  const home = useQuery({
    queryKey: ['control-home'],
    queryFn: () => controlValue<HomeData>('workspace', 'home'),
    retry: false,
    refetchInterval: 60000,
  });
  return (
    <>
      <div className="page-heading">
        <h1>Inicio</h1>
        <button
          className="button secondary"
          onClick={() => void home.refetch()}
          disabled={home.isFetching}
        >
          Actualizar
        </button>
      </div>
      <section className="control-start">
        <div>
          <h2>Lo que necesita atención</h2>
        </div>
        <div className="control-quick">
          <button className="button primary" onClick={() => onOpen('module', 'Caja')}>
            Vender
          </button>
          {stockEnabled && (
            <button
              className="button secondary"
              onClick={() => onOpen('operations', 'countSessions')}
            >
              Hacer conteo
            </button>
          )}
        </div>
      </section>
      {home.isPending && <p role="status">Buscando pendientes…</p>}
      {home.isError && (
        <div className="alert error" role="alert">
          {errorMessage(home.error)}{' '}
          <button className="button secondary" onClick={() => void home.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      <div className="control-home-list">
        {home.data?.groups
          .filter((group) => group.total > 0)
          .map((group, index) => (
            <details className="panel control-pending" key={group.key} open={index === 0}>
              <summary className="control-pending-header">
                <div>
                  <h2>{group.title}</h2>
                  {group.total > 0 && (
                    <span className="status-chip">
                      {group.total.toLocaleString('es-AR')}{' '}
                      {group.action === 'cashDifferences'
                        ? 'turnos con diferencia'
                        : group.action === 'countSessions'
                          ? 'conteos'
                          : group.area === 'commercial'
                            ? 'productos para revisar'
                            : group.area === 'replenishment'
                              ? 'necesidades por producto y ubicación'
                              : group.action === 'expiries'
                                ? 'lotes por ubicación'
                                : group.action === 'agenda'
                                  ? 'obligaciones'
                                  : 'registros'}
                    </span>
                  )}
                </div>
                <Icon name="arrow" size={18} />
              </summary>
              {group.total > 0 && group.sample.length === 0 && (
                <p>
                  Consultá el listado para elegir qué atender.
                </p>
              )}
              {group.sample.slice(0, 3).map((item) => (
                <button
                  className="control-pending-item"
                  key={item.id}
                  onClick={() => onOpen(group.area, group.action, item.id, item.locationId)}
                >
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <Icon name="arrow" size={16} />
                </button>
              ))}
              <button className="button secondary small" onClick={() => onOpen(group.area, group.action)}>
                Ver todos <Icon name="arrow" size={16} />
              </button>
            </details>
          ))}
      </div>
      {home.data && home.data.groups.every((group) => group.total === 0) && (
        <div className="panel">
          <Icon name="check" />
          <h2>Sin pendientes de control</h2>
        </div>
      )}
    </>
  );
}

export function WorkspacePreference({ owner }: { owner: boolean }) {
  const [start, setStart] = useState('Inicio');
  const [saved, setSaved] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  return (
    <details className="panel">
      <summary>Página al ingresar</summary>
      <div className="movement-filters">
        <label className="field">
          Abrir
          <select
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setSaved(false);
            }}
          >
            {[
              'Inicio',
              'Caja',
              'Productos',
              'Stock',
              'Compras',
              ...(owner ? ['Resumen mensual'] : []),
            ].map((page) => (
              <option key={page}>{page}</option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          onClick={() => {
            void controlValue('workspace', 'savePreference', { start })
              .then(() => setSaved(true))
              .catch((e) => setPreferenceError(errorMessage(e)));
          }}
        >
          Guardar preferencia
        </button>
        {saved && <span role="status">Guardado</span>}
        {preferenceError && <div role="alert">{preferenceError}</div>}
      </div>
    </details>
  );
}
