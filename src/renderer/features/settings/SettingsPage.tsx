import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeading } from '../../components/PageHeader';
import { PageHeader } from '../../components/PageHeader';
import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { OperationSchemas } from '../../../shared/operations';
import { api, errorMessage, unwrap } from '../../api';
import type { Location } from '../../../shared/locations';
import { Dialog } from '../../components/Dialog';
import { downloadFile, webValue } from '../../web-client';
import { FeaturesPanel } from './FeaturesPanel';
import { ScannerTest } from './ScannerTest';
import { BusinessUnitsPanel } from './BusinessUnitsPanel';

type Method = 'CASH' | 'DEBIT' | 'CREDIT' | 'TRANSFER' | 'OTHER';
interface Settings {
  businessName: string;
  currency: 'ARS';
  paymentMethods: Method[];
  revision: number;
}
interface Terminal {
  id: string;
  name: string;
  active: boolean;
  revision: number;
  locationId: string | null;
  locationName: string | null;
}
const methods: Record<Method, string> = {
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
};
const baseSettingsTabs = ['Negocio', 'Funciones', 'Terminales', 'Lector', 'Exportar'];

export function SettingsPage({
  onOpenPurchaseHistory,
}: {
  onOpenPurchaseHistory?: (() => void) | undefined;
}) {
  const [tab, setTab] = useState('Negocio');
  const businessUnits = useQuery({
    queryKey: ['business-units'],
    queryFn: () => api().businessUnits.status().then(unwrap),
  });
  const settingsTabs = businessUnits.data?.enabled
    ? [...baseSettingsTabs, 'BiEmpresa']
    : baseSettingsTabs;
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => webValue<Settings>('/settings'),
  });
  const terminals = useQuery({
    queryKey: ['terminals'],
    queryFn: () => webValue<Terminal[]>('/terminals'),
  });
  const locations = useQuery({
    queryKey: ['locations'],
    queryFn: async () => unwrap(await api().locations.list()),
    retry: false,
  });
  const [editing, setEditing] = useState<Terminal | null | undefined>();
  const [notice, setNotice] = useState('');
  return (
    <div className="admin-workspace settings-workspace">
      <PageHeader
        title="Configuración"
        context="Negocio, terminales y funciones disponibles."
        actions={
          <button
            className="button secondary"
            disabled={settings.isFetching || terminals.isFetching}
            onClick={() => {
              void settings.refetch();
              void terminals.refetch();
            }}
          >
            Actualizar
          </button>
        }
      />
      {notice && (
        <p className="status-message" role="status">
          {notice}
        </p>
      )}
      {settings.isError && (
        <div className="alert error" role="alert">
          {errorMessage(settings.error)}{' '}
          <button className="button secondary small" onClick={() => void settings.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {settings.isPending && (
        <div className="dashboard-panel" aria-busy="true">
          <PerlaLoading size="compact" label="Cargando configuración…" />
        </div>
      )}
      <div className="settings-tabs" role="tablist" aria-label="Configuración">
        {settingsTabs.map((item, index) => (
          <button
            key={item}
            id={`settings-tab-${item}`}
            role="tab"
            aria-controls="settings-panel"
            aria-selected={tab === item}
            tabIndex={tab === item ? 0 : -1}
            className={tab === item ? 'selected' : ''}
            onClick={() => setTab(item)}
            onKeyDown={(event) => {
              let next: number | undefined;
              if (event.key === 'ArrowRight') next = (index + 1) % settingsTabs.length;
              if (event.key === 'ArrowLeft')
                next = (index + settingsTabs.length - 1) % settingsTabs.length;
              if (event.key === 'Home') next = 0;
              if (event.key === 'End') next = settingsTabs.length - 1;
              if (next === undefined) return;
              event.preventDefault();
              const item = settingsTabs[next]!;
              setTab(item);
              document.getElementById(`settings-tab-${item}`)?.focus();
            }}
          >
            {item}
          </button>
        ))}
      </div>
      <div
        id="settings-panel"
        className="settings-layout"
        role="tabpanel"
        aria-labelledby={`settings-tab-${tab}`}
        tabIndex={0}
      >
        {settings.data && tab === 'Negocio' && (
          <BusinessForm
            key={settings.data.revision}
            settings={settings.data}
            onSaved={async () => {
              setNotice('Configuración guardada.');
              await client.invalidateQueries({ queryKey: ['settings'] });
            }}
          />
        )}
        {tab === 'Funciones' && <FeaturesPanel onOpenPurchaseHistory={onOpenPurchaseHistory} />}
        {tab === 'BiEmpresa' && businessUnits.data?.enabled && <BusinessUnitsPanel />}
        {tab === 'Terminales' && (
          <section
            className="dashboard-panel settings-terminals"
            aria-labelledby="terminal-heading"
          >
            <PageHeading className="page-heading">
              <h2 id="terminal-heading">Terminales</h2>
              <button className="button primary" onClick={() => setEditing(null)}>
                Crear terminal
              </button>
            </PageHeading>
            {terminals.isError && (
              <div className="alert error" role="alert">
                {errorMessage(terminals.error)}{' '}
                <button className="button secondary small" onClick={() => void terminals.refetch()}>
                  Reintentar
                </button>
              </div>
            )}
            <div className="dashboard-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Estado</th>
                    {locations.data && <th>Ubicación</th>}
                    <th>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {terminals.data?.map((terminal) => (
                    <tr key={terminal.id}>
                      <td>
                        <strong>{terminal.name}</strong>
                      </td>
                      <td>{terminal.active ? 'Activa' : 'Inactiva'}</td>
                      {locations.data && <td>{terminal.locationName ?? 'Ubicación principal'}</td>}
                      <td>
                        <button
                          className="button secondary small"
                          aria-label={`Editar ${terminal.name}`}
                          onClick={() => setEditing(terminal)}
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!terminals.isError && !terminals.data?.length && (
                    <tr>
                      <td colSpan={locations.data ? 4 : 3} className="empty-table">
                        {terminals.isPending
                          ? 'Cargando terminales…'
                          : 'Creá una terminal para operar la caja.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {tab === 'Exportar' && <Exports />}
        {tab === 'Lector' && <ScannerTest autoFocusInput={false} />}
      </div>
      {editing !== undefined && (
        <TerminalForm
          terminal={editing}
          locations={locations.data}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await client.invalidateQueries({ queryKey: ['terminals'] });
            await client.invalidateQueries({ queryKey: ['active-terminals'] });
          }}
        />
      )}
    </div>
  );
}

function BusinessForm({ settings, onSaved }: { settings: Settings; onSaved: () => Promise<void> }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const input = OperationSchemas['settings.save'].parse({
        expectedRevision: settings.revision,
        businessName: data.get('businessName'),
        currency: 'ARS',
        paymentMethods: data.getAll('paymentMethods'),
      });
      await webValue('/settings', 'PUT', input);
      setSaved(true);
      await onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dashboard-panel">
      <h2>Negocio</h2>
      <form className="user-form" onSubmit={(event) => void submit(event)}>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}
        >
          <label className="field">
            Nombre del negocio
            <input
              name="businessName"
              defaultValue={settings.businessName}
              maxLength={120}
              required
            />
          </label>
          <label className="field">
            Moneda
            <input value="Pesos argentinos (ARS)" readOnly />
          </label>
          <fieldset className="payment-preferences">
            <legend>Medios de pago</legend>
            {(Object.keys(methods) as Method[]).map((method) => (
              <label className="checkbox-label" key={method}>
                <input
                  type="checkbox"
                  name="paymentMethods"
                  value={method}
                  defaultChecked={settings.paymentMethods.includes(method)}
                />
                {methods[method]}
              </label>
            ))}
          </fieldset>
        </fieldset>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <p className="status-message" role="status">
            Configuración guardada.
          </p>
        )}
        <div>
          <button className="button primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </form>
    </section>
  );
}

function TerminalForm({
  terminal,
  locations,
  onClose,
  onSaved,
}: {
  terminal: Terminal | null;
  locations?: Location[] | undefined;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const input = OperationSchemas['terminals.save'].parse({
        ...(terminal ? { id: terminal.id, expectedRevision: terminal.revision } : {}),
        name: data.get('name'),
        active: data.get('active') === 'on',
      });
      const saved = await webValue<Terminal>('/terminals', 'POST', input);
      const locationId = String(data.get('locationId') ?? '');
      if (locationId)
        unwrap(
          await api().locations.assignTerminal({
            terminalId: saved.id,
            locationId,
          }),
        );
      await onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={terminal ? 'Editar terminal' : 'Crear terminal'} busy={busy} onClose={onClose}>
      <form className="user-form" onSubmit={(event) => void submit(event)}>
        <label className="field">
          Nombre
          <input
            name="name"
            defaultValue={terminal?.name}
            required
            maxLength={100}
            autoFocus
            disabled={busy}
          />
        </label>
        {locations && locations.length > 0 && (
          <label className="field">
            Ubicación
            <select
              name="locationId"
              defaultValue={terminal?.locationId ?? locations.find((item) => item.isDefault)?.id}
              disabled={busy}
            >
              {locations
                .filter((item) => item.active || item.id === terminal?.locationId)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        <label className="checkbox-label">
          <input
            name="active"
            type="checkbox"
            defaultChecked={terminal?.active ?? true}
            disabled={busy}
          />
          Terminal activa
        </label>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Volver
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar terminal'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function Exports() {
  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    setSaved(false);
    try {
      const kind = String(data.get('kind')) as
        'products' | 'sales' | 'stock' | 'sale-items' | 'shifts' | 'purchases';
      const input = OperationSchemas[`exports.${kind}`].parse({
        fromDate: data.get('fromDate'),
        toDate: data.get('toDate'),
        limit: 10000,
        offset: (Number(data.get('page')) - 1) * 10000,
      });
      await downloadFile(
        `/exports/${kind}?${new URLSearchParams(Object.entries(input).map(([key, value]) => [key, String(value)]))}`,
        `${kind}-${input.fromDate}-${input.toDate}-parte-${data.get('page')}.csv`,
      );
      setSaved(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="dashboard-panel">
      <h2>Exportar datos</h2>
      <form className="user-form" onSubmit={(event) => void submit(event)}>
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 16 }}
        >
          <label className="field">
            Datos
            <select name="kind">
              <option value="products">Productos</option>
              <option value="sales">Ventas</option>
              <option value="sale-items">Detalle de ventas</option>
              <option value="stock">Movimientos de stock</option>
              <option value="shifts">Turnos de caja</option>
              <option value="purchases">Compras</option>
            </select>
          </label>
          <div className="form-grid">
            <label className="field">
              Desde
              <input type="date" name="fromDate" defaultValue={today.slice(0, 8) + '01'} required />
            </label>
            <label className="field">
              Hasta
              <input type="date" name="toDate" defaultValue={today} required />
            </label>
          </div>
          <label className="field">
            Parte del archivo
            <input type="number" name="page" min={1} max={101} step={1} defaultValue={1} required />
            <small>
              Cada parte contiene hasta 10.000 registros. Para continuar, descargá la siguiente
              parte.
            </small>
          </label>
        </fieldset>
        <p className="subtle-note">
          Período de hasta 366 días. Los productos se filtran por fecha de actualización.
        </p>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        {saved && (
          <p className="status-message" role="status">
            Archivo descargado.
          </p>
        )}
        <div>
          <button className="button primary" disabled={busy}>
            {busy ? 'Descargando…' : 'Descargar CSV'}
          </button>
        </div>
      </form>
    </section>
  );
}
