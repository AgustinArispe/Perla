import { PageHeading, WorkspaceTabs } from './components/PageHeader';
import { PerlaLoading } from './components/PerlaLoading';
import './features/settings/business-units.css';
import { authorizedNavigation, navigationGroups } from './navigation';
import { StructuredActivityPanel } from './features/control/StructuredActivityPanel';
import { controlValue } from './features/control/client';
import { ControlHome, WorkspacePreference } from './features/control/ControlHome';
import { ReplenishmentPanel } from './features/control/ReplenishmentPanel';
import { CommercialPanel } from './features/control/CommercialPanel';
import { OperationsPanel } from './features/control/OperationsPanel';
import { AgendaPanel } from './features/control/AgendaPanel';
import { WeeklyPanel } from './features/control/WeeklyPanel';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { api, unwrap, errorMessage } from './api';
import { Icon } from './components/Icon';
import { SidebarGroup } from './components/SidebarGroup';
import { SidebarEntry } from './components/SidebarEntry';
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
import { RegisterGate } from './features/register/RegisterGate';
import { ShiftHistory } from './features/register/ShiftHistory';
import { AuditPage } from './features/audit/AuditPage';
import { SettingsPage } from './features/settings/SettingsPage';
import { BackupsPage } from './features/backups/BackupsPage';
import { useEffect } from 'react';
import { HelpPage } from './features/help/HelpPage';
import { ReceiptQueue } from './features/receipts/ReceiptQueue';
import { DeliveryNotesPage } from './features/delivery-notes/DeliveryNotesPage';
import { PreparedOrdersPage } from './features/prepared-orders/PreparedOrdersPage';
import { PerlaMark } from './components/PerlaBrand';
import { ControlExportHost } from './components/ControlExportHost';
import type { FeatureStatus } from '../shared/features';
import { webValue } from './web-client';
import { SupplierList } from './features/purchases/SupplierList';
import { PurchaseWorkspace } from './features/purchases/PurchaseWorkspace';
import { PromotionPage } from './features/promotions/PromotionPage';
import { NotificationBell } from './features/notifications/NotificationBell';
import type { BusinessNotification } from '../shared/notifications';
import { CustomerPage } from './features/customers/CustomerPage';
import { LocationsPage } from './features/locations/LocationsPage';

const sections = [
  ['chart', 'Inicio'],
  ['stock', 'Reposición'],
  ['tag', 'Revisión'],
  ['stock', 'Controles'],
  ['clock', 'Agenda'],
  ['chart', 'Resumen semanal'],
  ['cash', 'Caja'],
  ['box', 'Productos'],
  ['stock', 'Stock'],
  ['stock', 'Compras'],
  ['users', 'Proveedores'],
  ['arrow', 'Ubicaciones'],
  ['users', 'Clientes'],
  ['tag', 'Promociones'],
  ['history', 'Histórico'],
  ['cash', 'Comprobantes'],
  ['arrow', 'Remitos'],
  ['stock', 'Órdenes'],
  ['chart', 'Resumen mensual'],
  ['settings', 'Configuración'],
  ['users', 'Usuarios'],
  ['clock', 'Turnos'],
  ['activity', 'Actividad'],
  ['upload', 'Backups'],
  ['help', 'Ayuda'],
] as const;

type Section = (typeof sections)[number][1];

export function App() {
  const client = useQueryClient();
  const auth = useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => unwrap(await api().auth.status()),
    enabled: true,
    retry: false,
    refetchInterval: 30000,
  });
  useEffect(() => {
    const expired = () => void client.invalidateQueries({ queryKey: ['auth-status'] });
    window.addEventListener('bocha-session-expired', expired);
    return () => window.removeEventListener('bocha-session-expired', expired);
  }, [client]);
  async function refresh() {
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'auth-status',
    });
    await client.invalidateQueries({ queryKey: ['auth-status'] });
  }
  async function logout() {
    unwrap(await api().auth.logout());
    await refresh();
  }
  if (auth.isPending) return <PerlaLoading size="screen" label="Conectando con tu negocio…" />;
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
    <WorkspaceEntry
      key={`${auth.data.user.id}:${auth.data.user.revision}`}
      user={auth.data.user}
      onLogout={logout}
      onPasswordChanged={refresh}
    />
  );
}
function WorkspaceEntry(props: {
  user: User;
  onLogout: () => Promise<void>;
  onPasswordChanged: () => Promise<void>;
}) {
  const preference = useQuery({
    queryKey: ['workspace-preference', props.user.id],
    queryFn: () => controlValue<{ start?: { start_module: string } }>('workspace', 'preference'),
    enabled: props.user.role !== 'SELLER',
    retry: false,
  });
  if (props.user.role !== 'SELLER' && preference.isPending) return <PerlaLoading size="screen" />;
  const start = preference.data?.start?.start_module;
  const initialSection: Section =
    props.user.role === 'SELLER'
      ? 'Caja'
      : sections.some(([, title]) => title === start)
        ? (start as Section)
        : 'Inicio';
  return <Workspace {...props} initialSection={initialSection} />;
}
function Workspace({
  user,
  onLogout,
  onPasswordChanged,
  initialSection,
}: {
  initialSection: Section;
  user: User;
  onLogout: () => Promise<void>;
  onPasswordChanged: () => Promise<void>;
}) {
  const [section, setSection] = useState<Section>(initialSection);
  const [controlTarget, setControlTarget] = useState<{
    action: string;
    id?: string;
    locationId?: string;
  }>({ action: '' });
  const [activityDetailed, setActivityDetailed] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false),
    [sessionError, setSessionError] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [activeArea, setActiveArea] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const [stockShortages, setStockShortages] = useState(false);
  const [resultsDay, setResultsDay] = useState<string | undefined>();
  const [purchaseInitialView, setPurchaseInitialView] = useState<'receive' | 'history'>('receive');
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setNarrow(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const menuCollapsed = narrow ? !mobileMenuOpen : collapsed;
  useEffect(() => {
    if (!narrow || !mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebarRef.current?.querySelector<HTMLButtonElement>('.nav-item')?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        sidebarRef.current?.querySelector<HTMLButtonElement>('.sidebar-toggle')?.focus();
      }
      if (event.key === 'Tab') {
        const buttons = Array.from(
          sidebarRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
        );
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', close);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', close);
    };
  }, [narrow, mobileMenuOpen]);
  function toggleSidebar() {
    if (narrow) {
      setMobileMenuOpen((open) => !open);
      return;
    }
    setCollapsed((value) => !value);
  }
  const desktop = Boolean(window.bocha);
  const client = useQueryClient();
  const leaveGuard = useRef<LeaveGuard>(null);
  const registerLeaveGuard = useCallback((guard: LeaveGuard) => {
    leaveGuard.current = guard;
  }, []);
  const scrollPositions = useRef<Partial<Record<Section, number>>>({});
  async function navigate(title: typeof section): Promise<boolean> {
    try {
      await leaveGuard.current?.();
      setSessionError('');
      scrollPositions.current[section] = window.scrollY;
      setSection(title);
      setActiveArea('');
      requestAnimationFrame(() =>
        window.scrollTo({ top: scrollPositions.current[title] ?? 0, behavior: 'instant' }),
      );
      if (title !== 'Stock') setStockShortages(false);
      if (narrow) {
        setMobileMenuOpen(false);
        sidebarRef.current?.querySelector<HTMLButtonElement>('.sidebar-toggle')?.focus();
      }
      return true;
    } catch (failure) {
      setSessionError(errorMessage(failure));
      return false;
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
    enabled: true,
    retry: false,
    refetchInterval: 30000,
  });
  const features = useQuery({
    queryKey: ['business-features'],
    queryFn: () => webValue<FeatureStatus>('/settings/features'),
    retry: false,
  });
  const businessUnits = useQuery({
    queryKey: ['business-units', user.id],
    queryFn: () => api().businessUnits.status().then(unwrap),
    refetchInterval: 30000,
  });
  const deliveryNoteHistory = useQuery({
    queryKey: ['delivery-note-history-exists'],
    queryFn: () => api().deliveryNotes.list({ limit: 1 }).then(unwrap),
    enabled: user.role === 'OWNER' || user.role === 'ADMIN',
    refetchInterval: 30000,
  });
  const preparedOrderHistory = useQuery({
    queryKey: ['prepared-order-history'],
    queryFn: () => api().preparedOrders.list({ limit: 1 }).then(unwrap),
    refetchInterval: 30000,
  });
  async function reconnect() {
    const result = await api().system.reconnect();
    if (result.ok) await client.invalidateQueries();
    else void status.refetch();
  }
  async function openNotification(destination: BusinessNotification['destination']) {
    if (destination === 'STOCK' || destination === 'LOTS') {
      setStockShortages(destination === 'STOCK');
      if (destination === 'LOTS') await openArea('Controles', 'Vencimientos');
      else await openArea('Stock', 'Existencias');
    } else if (destination === 'SHIFTS') await navigate('Turnos');
    else await navigate('Resumen mensual');
  }
  const visibleSections = sections
    .filter(
      ([, title]) =>
        !desktop || !['Configuración', 'Backups', 'Turnos', 'Actividad'].includes(title),
    )
    .filter(([, title]) =>
      user.role === 'SELLER'
        ? ['Caja', 'Órdenes', 'Ayuda'].includes(title)
        : user.role === 'SUPERVISOR'
          ? [
              'Caja',
              'Inicio',
              'Reposición',
              'Controles',
              'Productos',
              'Stock',
              'Compras',
              'Proveedores',
              'Clientes',
              'Ubicaciones',
              'Remitos',
              'Órdenes',
              'Histórico',
              'Comprobantes',
              'Turnos',
              'Actividad',
              'Ayuda',
            ].includes(title)
          : true,
    )
    .filter(([, title]) => {
      if (!features.data) return true;
      if (title === 'Órdenes')
        return features.data.enabled.PREPARED_ORDERS || Boolean(preparedOrderHistory.data?.total);
      if (title === 'Reposición') return features.data.enabled.REPLENISHMENT;
      if (title === 'Controles')
        return (
          features.data.enabled.STOCK_CONTROL ||
          features.data.enabled.LOTS ||
          (!desktop && user.role !== 'SELLER')
        );
      if (title === 'Revisión')
        return features.data.enabled.COSTS_MARGIN || features.data.enabled.STOCK_CONTROL;
      if (title === 'Agenda')
        return features.data.enabled.CUSTOMERS || features.data.enabled.SUPPLIER_ACCOUNTS;
      if (title === 'Resumen semanal') return features.data.enabled.MONTHLY_DASHBOARD;
      if (title === 'Stock') return features.data.enabled.STOCK_CONTROL;
      if (title === 'Proveedores') return features.data.enabled.SUPPLIERS_PURCHASES;
      if (title === 'Compras')
        return (
          features.data.enabled.SUPPLIERS_PURCHASES ||
          (section === 'Compras' && purchaseInitialView === 'history')
        );
      if (title === 'Clientes') return features.data.enabled.CUSTOMERS;
      if (title === 'Ubicaciones') return features.data.enabled.LOCATIONS_TRANSFERS;
      if (title === 'Comprobantes') return features.data.enabled.RECEIPTS;
      if (title === 'Remitos')
        return (
          Boolean(deliveryNoteHistory.data?.total) ||
          features.data.enabled.DELIVERY_NOTES_SALES ||
          features.data.enabled.DELIVERY_NOTES_PURCHASES ||
          features.data.enabled.DELIVERY_NOTES_INTERNAL
        );
      if (title === 'Promociones') return features.data.enabled.PROMOTIONS;
      if (title === 'Resumen mensual') return features.data.enabled.MONTHLY_DASHBOARD;
      return true;
    });
  const permitted = new Set<string>(visibleSections.map(([, title]) => title));
  const visibleNavigation = authorizedNavigation(permitted)
    .map((entry) => ({
      ...entry,
      areas: entry.areas.filter(
        ([target, label]) =>
          permitted.has(target) &&
          (label !== 'Vencimientos' || !features.data || features.data.enabled.LOTS) &&
          (label !== 'Conteos' || !features.data || features.data.enabled.STOCK_CONTROL) &&
          (label !== 'Recibir' || !features.data || features.data.enabled.SUPPLIERS_PURCHASES) &&
          (label !== 'Diferencias de caja' || (!desktop && user.role !== 'SELLER')),
      ),
    }))
    .filter((entry) => entry.areas.length > 0);
  const effectiveArea =
    activeArea ||
    (section === 'Compras'
      ? purchaseInitialView === 'history'
        ? 'Historial'
        : 'Recibir'
      : section === 'Controles'
        ? controlTarget.action === 'expiries'
          ? 'Vencimientos'
          : controlTarget.action === 'cashDifferences'
            ? 'Diferencias de caja'
            : 'Conteos'
        : undefined);
  const currentNavigation = visibleNavigation.find((entry) =>
    entry.areas.some(
      ([target, label]) => target === section && (!effectiveArea || label === effectiveArea),
    ),
  );
  const currentArea = currentNavigation?.areas.find(
    ([target, label]) => target === section && (!effectiveArea || label === effectiveArea),
  );
  async function openArea(target: Section, label: string) {
    if (!(await navigate(target))) return;
    setActiveArea(label);
    if (target === 'Compras') setPurchaseInitialView(label === 'Historial' ? 'history' : 'receive');
    if (target === 'Controles')
      setControlTarget({
        action:
          label === 'Vencimientos'
            ? 'expiries'
            : label === 'Diferencias de caja'
              ? 'cashDifferences'
              : 'countSessions',
      });
  }
  const currentSection = visibleSections.some(([, title]) => title === section) ? section : 'Caja';
  const moduleTabs =
    currentNavigation && currentNavigation.areas.length > 1 ? (
      <div
        className="segmented-control workspace-tabs"
        aria-label={`Áreas de ${currentNavigation.title}`}
      >
        {currentNavigation.areas.map(([target, label]) => (
          <button
            key={label}
            className={target === currentSection && currentArea?.[1] === label ? 'active' : ''}
            onClick={() => void openArea(target, label)}
          >
            {label}
          </button>
        ))}
      </div>
    ) : null;
  return (
    <div
      className={`app-shell${menuCollapsed ? ' sidebar-collapsed' : ''}`}
      data-module={currentSection}
      data-business-unit={
        businessUnits.data?.enabled
          ? businessUnits.data.current.secondary
            ? 'secondary'
            : 'primary'
          : undefined
      }
    >
      {narrow && mobileMenuOpen && (
        <button
          className="mobile-menu-scrim"
          aria-label="Cerrar menú"
          tabIndex={-1}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className="sidebar" ref={sidebarRef}>
        <div className="sidebar-header">
          <div className="brand">
            <PerlaMark className="brand-mark" />
            <div className="brand-text">
              <strong>Perla</strong>
              <span title="Perla Negra · Pescados y mariscos">Perla Negra</span>
            </div>
          </div>
          <button
            type="button"
            className="icon-button sidebar-toggle"
            aria-label={menuCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={menuCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            aria-expanded={!menuCollapsed}
            aria-controls="module-navigation"
            onClick={toggleSidebar}
          >
            <Icon name={menuCollapsed ? 'expand' : 'collapse'} size={20} />
          </button>
        </div>
        <nav aria-label="Módulos" id="module-navigation">
          {permitted.has('Inicio') && (
            <div className="sidebar-home">
              <SidebarEntry
                entry={{ title: 'Inicio', icon: 'chart', areas: [['Inicio', 'Inicio']] }}
                active={currentSection === 'Inicio'}
                activeArea="Inicio"
                compact={menuCollapsed && !narrow}
                onNavigate={(target, label) => openArea(target as Section, label)}
              />
            </div>
          )}
          {navigationGroups.map((group) => {
            const entries = visibleNavigation.filter((entry) => entry.group === group);
            if (!entries.length) return null;
            return (
              <SidebarGroup
                key={group}
                title={group}
                compact={menuCollapsed && !narrow}
                onCompactOpen={() => setCollapsed(false)}
                activeTitle={
                  currentNavigation?.group === group
                    ? currentArea && currentArea[1] !== currentNavigation.title
                      ? `${currentNavigation.title} · ${currentArea[1]}`
                      : currentNavigation.title
                    : undefined
                }
              >
                {entries.map((entry) => (
                  <SidebarEntry
                    key={entry.title}
                    entry={entry}
                    active={currentNavigation?.title === entry.title}
                    activeArea={currentArea?.[1]}
                    compact={menuCollapsed && !narrow}
                    onNavigate={(target, label) => openArea(target as Section, label)}
                  />
                ))}
              </SidebarGroup>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={section === 'Ayuda' ? 'nav-item selected nav-help' : 'nav-item nav-help'}
            aria-label="Ayuda"
            title="Ayuda"
            aria-current={section === 'Ayuda' ? 'page' : undefined}
            onClick={() => void navigate('Ayuda')}
          >
            <span className="nav-icon" aria-hidden="true">
              <Icon name="help" />
            </span>
            <span>Ayuda</span>
          </button>
          <div className="sidebar-user" title={`${user.name} · ${roleLabel[user.role]}`}>
            <span className="user-avatar" aria-hidden="true">
              {user.name.trim().charAt(0).toUpperCase()}
            </span>
            <div className="user-details">
              <strong>{user.name}</strong>
              <small>{roleLabel[user.role]}</small>
            </div>
          </div>
          <button
            className="button secondary small"
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen((open) => !open)}
          >
            Mi cuenta
          </button>
          {accountOpen && (
            <div className="account-menu">
              {user.role !== 'SELLER' && (
                <button
                  className="button secondary small"
                  onClick={() => setPreferenceOpen((open) => !open)}
                >
                  Página al ingresar
                </button>
              )}
              <button
                className="button secondary small"
                onClick={() => void leave(() => setPasswordOpen(true))}
              >
                Cambiar contraseña
              </button>
              <button className="button secondary small" onClick={() => void leave(onLogout)}>
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </aside>
      <div className="workspace" inert={narrow && mobileMenuOpen}>
        <header className="topbar">
          {businessUnits.data?.enabled && (
            <span className="business-unit-badge" aria-label="Unidad operativa activa">
              {businessUnits.data.current.name} · Stock compartido
            </span>
          )}
          <span className="module-title">
            {narrow ? (
              <PerlaMark className="topbar-brand-mark" />
            ) : (
              <Icon
                name={sections.find(([, title]) => title === currentSection)?.[0] ?? 'cash'}
                size={18}
              />
            )}
            {currentNavigation?.title ?? currentSection}
          </span>
          <div className="topbar-actions">
            {user.role !== 'SELLER' && features.data?.enabled.NOTIFICATIONS && (
              <NotificationBell onNavigate={openNotification} />
            )}
            <div className={`connection ${status.isError ? 'connection-error' : ''}`}>
              <i />
              {status.isError
                ? 'Conexión no disponible'
                : status.isPending
                  ? 'Conectando datos…'
                  : desktop
                    ? 'Base de datos conectada'
                    : 'Conectado'}
            </div>
          </div>
        </header>
        <main className="page-content">
          <WorkspaceTabs.Provider value={moduleTabs}>
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
            {preferenceOpen && (
              <WorkspacePreference owner={user.role === 'OWNER' || user.role === 'ADMIN'} />
            )}
            {(currentNavigation?.title === 'Stock' ||
              currentNavigation?.title === 'Reposición' ||
              (currentNavigation?.title === 'Turnos' && currentSection === 'Controles')) && (
              <PageHeading className="page-heading">
                <h1>{currentNavigation.title}</h1>
              </PageHeading>
            )}
            <div
              className={
                [
                  'Inicio',
                  'Reposición',
                  'Revisión',
                  'Controles',
                  'Agenda',
                  'Resumen semanal',
                  'Actividad',
                ].includes(currentSection)
                  ? 'control-surface'
                  : undefined
              }
            >
              {currentSection === 'Inicio' ? (
                <ControlHome
                  stockEnabled={Boolean(features.data?.enabled.STOCK_CONTROL)}
                  owner={user.role === 'OWNER' || user.role === 'ADMIN'}
                  onOpen={(area, action, id, locationId) => {
                    setControlTarget({
                      action,
                      ...(id ? { id } : {}),
                      ...(locationId ? { locationId } : {}),
                    });
                    if (area === 'module')
                      void navigate(
                        action === 'Resumen mensual'
                          ? 'Resumen mensual'
                          : action === 'Órdenes'
                            ? 'Órdenes'
                            : 'Caja',
                      );
                    else if (area === 'operations')
                      void (action === 'agenda'
                        ? navigate('Agenda')
                        : navigate('Controles').then((opened) => {
                            if (opened)
                              setActiveArea(
                                action === 'expiries'
                                  ? 'Vencimientos'
                                  : action === 'cashDifferences'
                                    ? 'Diferencias de caja'
                                    : 'Conteos',
                              );
                          }));
                    else if (area === 'commercial') void navigate('Revisión');
                    else if (area === 'replenishment') {
                      setStockShortages(true);
                      void navigate(features.data?.enabled.REPLENISHMENT ? 'Reposición' : 'Stock');
                    }
                  }}
                />
              ) : currentSection === 'Reposición' ? (
                <ReplenishmentPanel
                  embedded
                  onBack={() => void navigate('Inicio')}
                  key={activeArea}
                  initial={{
                    productId: controlTarget.id,
                    locationId: controlTarget.locationId,
                    ...(activeArea === 'Pedidos' ? { view: 'orders' } : {}),
                  }}
                />
              ) : currentSection === 'Revisión' ? (
                <CommercialPanel
                  onBack={() => void navigate('Inicio')}
                  initial={{
                    view:
                      controlTarget.action === 'rotation'
                        ? 'rotation'
                        : features.data?.enabled.COSTS_MARGIN
                          ? 'prices'
                          : 'rotation',
                    productId: controlTarget.id,
                  }}
                />
              ) : currentSection === 'Controles' ? (
                <OperationsPanel
                  embedded
                  key={controlTarget.action + controlTarget.id}
                  onBack={() => void navigate('Inicio')}
                  initialTab={
                    controlTarget.action === 'expiries'
                      ? 'expiry'
                      : controlTarget.action === 'cashDifferences'
                        ? 'cash'
                        : 'counts'
                  }
                  {...(controlTarget.action === 'expiries' && controlTarget.id
                    ? { initialLotId: controlTarget.id }
                    : {})}
                  {...(controlTarget.action === 'cashDifferences' && controlTarget.id
                    ? { initialShiftId: controlTarget.id }
                    : {})}
                  {...(controlTarget.locationId
                    ? { initialLocationId: controlTarget.locationId }
                    : {})}
                />
              ) : currentSection === 'Agenda' ? (
                <AgendaPanel onBack={() => void navigate('Inicio')} />
              ) : currentSection === 'Resumen semanal' ? (
                <WeeklyPanel onBack={() => void navigate('Inicio')} />
              ) : currentSection === 'Ayuda' ? (
                <HelpPage role={user.role} />
              ) : currentSection === 'Productos' ? (
                <ProductList canChangePrices={user.role === 'OWNER' || user.role === 'ADMIN'} />
              ) : currentSection === 'Stock' ? (
                <StockList
                  embedded
                  key={stockShortages ? 'shortages' : 'all'}
                  initialFilter={stockShortages ? 'SHORTAGES' : 'ALL'}
                  lotsEnabled={Boolean(features.data?.enabled.LOTS)}
                />
              ) : currentSection === 'Compras' ? (
                <PurchaseWorkspace
                  embedded
                  key={purchaseInitialView}
                  initialView={purchaseInitialView}
                  historyOnly={!features.data?.enabled.SUPPLIERS_PURCHASES}
                  lotsEnabled={Boolean(features.data?.enabled.LOTS)}
                  accountsEnabled={Boolean(features.data?.enabled.SUPPLIER_ACCOUNTS)}
                />
              ) : currentSection === 'Proveedores' ? (
                <>
                  <PageHeading className="page-heading">
                    <h1>Proveedores</h1>
                  </PageHeading>
                  <SupplierList
                    accountsEnabled={Boolean(features.data?.enabled.SUPPLIER_ACCOUNTS)}
                  />
                </>
              ) : currentSection === 'Usuarios' ? (
                <UserList currentRole={user.role} />
              ) : currentSection === 'Clientes' ? (
                <CustomerPage
                  canManageCredit={
                    Boolean(features.data?.enabled.CUSTOMER_CREDIT) &&
                    (user.role === 'OWNER' || user.role === 'ADMIN')
                  }
                />
              ) : currentSection === 'Ubicaciones' ? (
                <LocationsPage canConfigure={user.role === 'OWNER' || user.role === 'ADMIN'} />
              ) : currentSection === 'Promociones' ? (
                <PromotionPage />
              ) : currentSection === 'Histórico' ? (
                <SalesList
                  userId={user.id}
                  {...(resultsDay
                    ? {
                        initialDate: resultsDay,
                        onBackToResults: () => {
                          setResultsDay(undefined);
                          void openArea('Resumen mensual', 'Mensual');
                        },
                      }
                    : {})}
                  profitabilityEnabled={Boolean(features.data?.enabled.COSTS_MARGIN)}
                  returnsEnabled={Boolean(features.data?.enabled.RETURNS)}
                />
              ) : currentSection === 'Órdenes' && features.data ? (
                <PreparedOrdersPage enabled={features.data.enabled.PREPARED_ORDERS} user={user} />
              ) : currentSection === 'Remitos' && features.data ? (
                <DeliveryNotesPage enabled={features.data.enabled} />
              ) : currentSection === 'Comprobantes' ? (
                <ReceiptQueue />
              ) : currentSection === 'Resumen mensual' ? (
                <DashboardPage
                  onOpenDay={(date) => {
                    setResultsDay(date);
                    void openArea('Histórico', 'Historial');
                  }}
                  profitabilityEnabled={Boolean(features.data?.enabled.COSTS_MARGIN)}
                  locationsEnabled={Boolean(features.data?.enabled.LOCATIONS_TRANSFERS)}
                  onOpenStock={() => {
                    setStockShortages(true);
                    void navigate('Stock');
                  }}
                />
              ) : currentSection === 'Configuración' ? (
                <SettingsPage
                  onOpenPurchaseHistory={() => {
                    setPurchaseInitialView('history');
                    void openArea('Compras', 'Historial');
                  }}
                />
              ) : currentSection === 'Backups' ? (
                <BackupsPage onRestored={onPasswordChanged} />
              ) : currentSection === 'Turnos' ? (
                <ShiftHistory />
              ) : currentSection === 'Actividad' ? (
                <>
                  <div className="segmented-control">
                    <button
                      className={!activityDetailed ? 'active' : ''}
                      onClick={() => setActivityDetailed(false)}
                    >
                      Registro general
                    </button>
                    <button
                      className={activityDetailed ? 'active' : ''}
                      onClick={() => setActivityDetailed(true)}
                    >
                      Cambios detallados
                    </button>
                  </div>
                  {activityDetailed ? <StructuredActivityPanel /> : <AuditPage />}
                </>
              ) : desktop ? (
                <Checkout
                  user={user}
                  preparedOrdersEnabled={Boolean(features.data?.enabled.PREPARED_ORDERS)}
                  receiptsEnabled={Boolean(features.data?.enabled.RECEIPTS)}
                  registerLeaveGuard={registerLeaveGuard}
                  customersEnabled={Boolean(features.data?.enabled.CUSTOMERS)}
                  customerCreditEnabled={Boolean(features.data?.enabled.CUSTOMER_CREDIT)}
                />
              ) : (
                <RegisterGate
                  beforeClose={async () => {
                    await leaveGuard.current?.();
                  }}
                >
                  <Checkout
                    user={user}
                    preparedOrdersEnabled={Boolean(features.data?.enabled.PREPARED_ORDERS)}
                    receiptsEnabled={Boolean(features.data?.enabled.RECEIPTS)}
                    registerLeaveGuard={registerLeaveGuard}
                    customersEnabled={Boolean(features.data?.enabled.CUSTOMERS)}
                    customerCreditEnabled={Boolean(features.data?.enabled.CUSTOMER_CREDIT)}
                  />
                </RegisterGate>
              )}
            </div>
            {passwordOpen && (
              <ChangePassword
                role={user.role}
                onClose={() => setPasswordOpen(false)}
                onChanged={onPasswordChanged}
              />
            )}
          </WorkspaceTabs.Provider>
        </main>
        <footer className="app-footer">
          <span>Perla · Gestión para tu comercio</span>
          <span>
            {desktop && status.data
              ? `SQLite ${status.data.sqliteVersion} · Datos locales`
              : 'Control interno'}
          </span>
        </footer>
        <ControlExportHost />
      </div>
    </div>
  );
}
