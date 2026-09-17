import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, errorMessage } from './api';
import { Icon } from './components/Icon';
import { ProductList } from './features/products/ProductList';

const sections = [
  ['cash', 'Caja'],
  ['box', 'Productos'],
  ['stock', 'Stock'],
  ['history', 'Histórico'],
  ['chart', 'Resumen mensual'],
  ['settings', 'Configuración'],
] as const;

export function App() {
  const desktop = Boolean(window.bocha);
  const client = useQueryClient();
  const status = useQuery({
    queryKey: ['system-status'],
    queryFn: async () => unwrap(await api().system.health()),
    enabled: desktop,
    retry: false,
    refetchInterval: 5000,
  });
  async function reconnect() {
    const result = await api().system.reconnect();
    if (result.ok) await client.invalidateQueries();
    else void status.refetch();
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">B.</span>
          <div>
            <strong>El Bocha</strong>
            <span>Almacén</span>
          </div>
        </div>
        <span className="nav-label">MI NEGOCIO</span>
        <nav aria-label="Módulos">
          {sections.map(([icon, title]) => (
            <button
              key={title}
              className={title === 'Productos' ? 'nav-item selected' : 'nav-item'}
              disabled={title !== 'Productos'}
              aria-current={title === 'Productos' ? 'page' : undefined}
            >
              <Icon name={icon} />
              <span>{title}</span>
              {title !== 'Productos' && (
                <span className="pending-dot" title="Pendiente de desarrollo" />
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-badge">
            <span />
            Datos en esta PC
          </div>
          <small>Control interno · v0.1.0</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>EL BOCHA / PRODUCTOS</span>
          <div className={`connection ${status.isError ? 'connection-error' : ''}`}>
            <i />
            {!desktop
              ? 'Vista previa en navegador'
              : status.isError
                ? 'Conexión no disponible'
                : status.isPending
                  ? 'Conectando datos…'
                  : 'Base de datos conectada'}
          </div>
        </header>
        <main className="page-content">
          {status.isError && (
            <div className="alert error" role="alert">
              {errorMessage(status.error)}{' '}
              <button className="button secondary small" onClick={() => void reconnect()}>
                Reintentar conexión
              </button>
            </div>
          )}
          <ProductList />
        </main>
        <footer className="app-footer">
          <span>El Bocha · Control del almacén</span>
          <span>
            {desktop && status.data
              ? `SQLite ${status.data.sqliteVersion} · Datos locales`
              : 'Aplicación de escritorio'}
          </span>
        </footer>
      </div>
    </div>
  );
}
