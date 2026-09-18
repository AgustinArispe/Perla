import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { api, unwrap, errorMessage } from './api';
import { Icon } from './components/Icon';
import { ProductList } from './features/products/ProductList';
import { StockList } from './features/stock/StockList';
import { Login } from './features/auth/Login';
import { UserList } from './features/auth/UserList';
import { ChangePassword } from './features/auth/ChangePassword';
import type { User } from '../shared/auth';
import { roleLabel } from '../domain/permissions';
import { Checkout, type LeaveGuard } from './features/checkout/Checkout';
import { SalesList } from './features/history/SalesList';
import { DashboardPage } from './features/dashboard/DashboardPage';

const sections = [
  ['cash', 'Caja'],
  ['box', 'Productos'],
  ['stock', 'Stock'],
  ['history', 'Histórico'],
  ['chart', 'Resumen mensual'],
  ['settings', 'Configuración'],
  ['settings', 'Usuarios'],
] as const;

export function App() {
  const client = useQueryClient();
  const auth = useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => unwrap(await api().auth.status()),
    enabled: Boolean(window.bocha),
    retry: false,
    refetchInterval: 5000,
  });
  async function refresh() {
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth-status' });
    await client.invalidateQueries({ queryKey: ['auth-status'] });
  }
  async function logout() {
    unwrap(await api().auth.logout());
    await refresh();
  }
  if (!window.bocha)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1>El Bocha</h1>
          <p>Abrí la aplicación de escritorio para ingresar y trabajar con los datos.</p>
        </div>
      </div>
    );
  if (auth.isPending) return <div className="auth-screen">Conectando datos…</div>;
  if (auth.isError && !auth.data?.user)
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="alert error" role="alert">
            {errorMessage(auth.error)}
          </div>
          <button className="button primary" onClick={() => void auth.refetch()}>
            Reintentar conexión
          </button>
        </div>
      </div>
    );
  if (!auth.data?.user)
    return <Login initialized={auth.data?.initialized ?? true} onSignedIn={refresh} />;
  return (
    <Workspace
      key={`${auth.data.user.id}:${auth.data.user.revision}`}
      user={auth.data.user}
      onLogout={logout}
      onPasswordChanged={refresh}
    />
  );
}
function Workspace({
  user,
  onLogout,
  onPasswordChanged,
}: {
  user: User;
  onLogout: () => Promise<void>;
  onPasswordChanged: () => Promise<void>;
}) {
  const [section, setSection] = useState<
    'Productos' | 'Stock' | 'Usuarios' | 'Caja' | 'Histórico' | 'Resumen mensual'
  >(user.role === 'SELLER' ? 'Caja' : 'Productos');
  const [passwordOpen, setPasswordOpen] = useState(false),
    [sessionError, setSessionError] = useState('');
  const desktop = Boolean(window.bocha);
  const client = useQueryClient();
  const leaveGuard = useRef<LeaveGuard>(null);
  const registerLeaveGuard = useCallback((guard: LeaveGuard) => {
    leaveGuard.current = guard;
  }, []);
  async function navigate(title: typeof section) {
    try {
      await leaveGuard.current?.();
      setSessionError('');
      setSection(title);
    } catch (failure) {
      setSessionError(errorMessage(failure));
    }
  }
  async function leave(action: () => void | Promise<void>) {
    try {
      await leaveGuard.current?.();
      await action();
    } catch (failure) {
      setSessionError(errorMessage(failure));
    }
  }
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
          {sections
            .filter(([, title]) =>
              user.role === 'SELLER'
                ? title === 'Caja'
                : user.role === 'SUPERVISOR'
                  ? ['Caja', 'Productos', 'Stock', 'Histórico'].includes(title)
                  : true,
            )
            .map(([icon, title]) => (
              <button
                key={title}
                className={title === section ? 'nav-item selected' : 'nav-item'}
                disabled={
                  ![
                    'Caja',
                    'Productos',
                    'Stock',
                    'Histórico',
                    'Usuarios',
                    'Resumen mensual',
                  ].includes(title)
                }
                aria-current={title === section ? 'page' : undefined}
                onClick={() => {
                  if (
                    title === 'Productos' ||
                    title === 'Stock' ||
                    title === 'Usuarios' ||
                    title === 'Caja' ||
                    title === 'Histórico' ||
                    title === 'Resumen mensual'
                  )
                    void navigate(title);
                }}
              >
                <Icon name={icon} />
                <span>{title}</span>
                {![
                  'Caja',
                  'Productos',
                  'Stock',
                  'Histórico',
                  'Usuarios',
                  'Resumen mensual',
                ].includes(title) && (
                  <span className="pending-dot" title="Pendiente de desarrollo" />
                )}
              </button>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <strong>{user.name}</strong>
          <small>{roleLabel[user.role]}</small>
          <button
            className="button secondary small"
            onClick={() => void leave(() => setPasswordOpen(true))}
          >
            Cambiar contraseña
          </button>
          <button className="button secondary small" onClick={() => void leave(onLogout)}>
            Cerrar sesión
          </button>
          <div className="offline-badge">
            <span />
            Datos en esta PC
          </div>
          <small>Control interno · v0.1.0</small>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>EL BOCHA / {section.toUpperCase()}</span>
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
          {sessionError && (
            <div className="alert error" role="alert">
              {sessionError}
            </div>
          )}
          {status.isError && (
            <div className="alert error" role="alert">
              {errorMessage(status.error)}{' '}
              <button className="button secondary small" onClick={() => void reconnect()}>
                Reintentar conexión
              </button>
            </div>
          )}
          {section === 'Productos' ? (
            <ProductList />
          ) : section === 'Stock' ? (
            <StockList />
          ) : section === 'Usuarios' ? (
            <UserList />
          ) : section === 'Histórico' ? (
            <SalesList userId={user.id} />
          ) : section === 'Resumen mensual' ? (
            <DashboardPage />
          ) : (
            <Checkout user={user} registerLeaveGuard={registerLeaveGuard} />
          )}
          {passwordOpen && (
            <ChangePassword onClose={() => setPasswordOpen(false)} onChanged={onPasswordChanged} />
          )}
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
