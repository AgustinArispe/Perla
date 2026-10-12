import { PageHeading } from '../../components/PageHeader';
import { SavedViews } from '../../components/SavedViews';
import { useRememberedState, scalarViewFilters } from '../../components/useRememberedState';
import { ExportButton } from '../../components/ExportButton';
import { normalizeSearch } from '../../../domain/values';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserSaveSchema, type Role, type User } from '../../../shared/auth';
import { roleLabel } from '../../../domain/permissions';
import { api, unwrap, errorMessage } from '../../api';
import { Dialog } from '../../components/Dialog';
export function UserList({ currentRole }: { currentRole: Role }) {
  const client = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => unwrap(await api().users.list()),
  });
  const [editing, setEditing] = useState<User | null | undefined>();
  const [search, setSearch] = useRememberedState('users', 'query', '');
  const [status, setStatus] = useRememberedState('users', 'status', 'ALL');
  const [role, setRole] = useRememberedState<Role | ''>('users', 'role', '');
  const visibleUsers = users.data?.filter(
    (u) =>
      normalizeSearch(`${u.name} ${u.username}`).includes(normalizeSearch(search)) &&
      (!role || u.role === role) &&
      (status === 'ALL' || u.active === (status === 'ACTIVE')),
  );
  const [actionError, setActionError] = useState('');
  const [accessUser, setAccessUser] = useState<User | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [accessNotice, setAccessNotice] = useState('');
  async function unlock(username: string) {
    if (unlocking) return;
    setUnlocking(true);
    setActionError('');
    setAccessNotice('');
    try {
      unwrap(await api().users.unlockUser({ username }));
      await client.invalidateQueries({ queryKey: ['users'] });
      setAccessNotice(
        'Se restableció el acceso por intentos fallidos. El estado de la cuenta se conserva.',
      );
    } catch (failure) {
      setActionError(errorMessage(failure));
    } finally {
      setUnlocking(false);
    }
  }
  return (
    <div className="admin-workspace users-workspace">
      <PageHeading className="page-heading">
        <div>
          <h1>Usuarios</h1>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          Crear usuario
        </button>
      </PageHeading>
      {users.isError && (
        <div className="alert error" role="alert">
          {errorMessage(users.error)}
          <button
            className="button secondary small"
            onClick={() => void users.refetch()}
            disabled={users.isFetching}
          >
            Reintentar
          </button>
        </div>
      )}
      {actionError && (
        <div className="alert error" role="alert">
          {actionError}
        </div>
      )}
      <div className="catalog-card users-card">
        <div className="catalog-toolbar">
          <label className="search-field">
            <input
              type="search"
              aria-label="Buscar usuarios"
              placeholder="Buscar nombre o usuario"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className="filter-label">
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Activos</option>
              <option value="INACTIVE">Inactivos</option>
            </select>
          </label>
          <label className="filter-label">
            Rol
            <select value={role} onChange={(e) => setRole(e.target.value as Role | '')}>
              <option value="">Todos</option>
              <option value="OWNER">Jefe</option>
              <option value="ADMIN">Administrador</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="SELLER">Vendedor</option>
            </select>
          </label>
          <SavedViews
            module="users"
            filters={{ query: search, status, ...(role ? { role } : {}) }}
            onApply={(filters) => {
              const value = scalarViewFilters(filters);
              setSearch(value.query ?? '');
              setStatus(value.status ?? 'ALL');
              setRole(value.role ?? '');
            }}
          />
          <ExportButton
            dataset="users"
            filters={{ query: search, status, ...(role ? { role } : {}) }}
          />
        </div>
        <div className="table-scroll" aria-busy={users.isFetching}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers?.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                  </td>
                  <td>{user.username}</td>
                  <td>
                    <span className="pill">{roleLabel[user.role]}</span>
                  </td>
                  <td>
                    <span className={`pill ${user.active ? 'good' : ''}`}>
                      {user.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      {(currentRole === 'ADMIN' || user.role !== 'ADMIN') && (
                        <button
                          className="button secondary small"
                          aria-label={`Editar ${user.name}`}
                          onClick={() => setEditing(user)}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        className="button secondary small"
                        aria-label={`Destrabar acceso de ${user.name}`}
                        onClick={() => {
                          setAccessUser(user);
                          setActionError('');
                          setAccessNotice('');
                        }}
                      >
                        Acceso
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.isPending && (
          <p className="empty-table" role="status">
            Cargando usuarios…
          </p>
        )}
        {!users.isPending && !users.isError && visibleUsers?.length === 0 && (
          <div className="empty-table" role="status">
            <p>No hay usuarios con estos filtros.</p>
            <button
              className="button secondary small"
              onClick={() => {
                setSearch('');
                setStatus('ALL');
                setRole('');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>
      {accessUser && (
        <Dialog
          title={`Acceso · ${accessUser.name}`}
          busy={unlocking}
          onClose={() => setAccessUser(null)}
        >
          <div className="dialog-body">
            <p>
              Cuenta {accessUser.active ? 'activa' : 'inactiva'}. Este estado es independiente del
              bloqueo por intentos fallidos.
            </p>
            <p>
              La lista no informa si el acceso está bloqueado. Restablecer acceso elimina el bloqueo
              por intentos fallidos; no activa una cuenta inactiva.
            </p>
            {actionError && (
              <p className="alert error" role="alert">
                {actionError}
              </p>
            )}
            {accessNotice && <p role="status">{accessNotice}</p>}
          </div>
          <div className="dialog-footer">
            <button
              className="button secondary"
              disabled={unlocking}
              onClick={() => setAccessUser(null)}
            >
              Cerrar
            </button>
            <button
              className="button primary"
              disabled={unlocking}
              onClick={() => void unlock(accessUser.username)}
            >
              {unlocking ? 'Restableciendo…' : 'Restablecer acceso'}
            </button>
          </div>
        </Dialog>
      )}
      {editing !== undefined && (
        <UserForm
          user={editing}
          canAssignAdmin={currentRole === 'ADMIN'}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void client.invalidateQueries({ queryKey: ['users'] });
            void client.invalidateQueries({ queryKey: ['auth-status'] });
          }}
        />
      )}
    </div>
  );
}
function UserForm({
  user,
  canAssignAdmin,
  onClose,
  onSaved,
}: {
  user: User | null;
  canAssignAdmin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [role, setRole] = useState<Role>(user?.role ?? 'SELLER');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const password = String(data.get('password') ?? '');
      const input = UserSaveSchema.parse({
        ...(user ? { id: user.id, expectedRevision: user.revision } : {}),
        username: data.get('username'),
        name: data.get('name'),
        role: data.get('role'),
        active: data.get('active') === 'on',
        ...(password ? { password } : {}),
      });
      unwrap(await api().users.save(input));
      onSaved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title={user ? 'Editar usuario' : 'Crear usuario'} busy={busy} onClose={onClose}>
      <form className="user-form" onSubmit={(event) => void submit(event)}>
        <label className="field">
          Nombre
          <input
            name="name"
            defaultValue={user?.name}
            required
            minLength={2}
            maxLength={100}
            autoFocus
          />
        </label>
        <label className="field">
          Usuario
          <input
            name="username"
            defaultValue={user?.username}
            required
            minLength={3}
            maxLength={40}
            autoComplete="off"
          />
        </label>
        <label className="field">
          Rol
          <select
            name="role"
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            <option value="SELLER">Vendedor</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="OWNER">Jefe</option>
            {canAssignAdmin && <option value="ADMIN">Administrador del sistema</option>}
          </select>
        </label>
        <p className="commerce-role-help">
          {role === 'OWNER'
            ? 'Jefe: puede vender, supervisar y administrar el negocio sin cambiar de perfil.'
            : role === 'SUPERVISOR'
              ? 'Supervisor: opera y controla dentro de sus permisos.'
              : role === 'SELLER'
                ? 'Vendedor: atiende ventas y las tareas habilitadas para su perfil.'
                : 'Administrador del sistema: gestiona la configuración y los accesos autorizados.'}
        </p>
        <label className="field">
          {user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          <input
            name="password"
            aria-label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            required={!user}
            minLength={role === 'ADMIN' ? 16 : 8}
            maxLength={128}
            autoComplete="new-password"
          />
          <small>
            {role === 'ADMIN'
              ? 'Administrador: 16 caracteres, mayúscula, minúscula, número y símbolo.'
              : 'Al menos 8 caracteres, con mayúscula y símbolo.'}{' '}
            Las contraseñas no se pueden ver; solo restablecer.
          </small>
        </label>
        <label className="checkbox-label">
          <input name="active" type="checkbox" defaultChecked={user?.active ?? true} />
          Cuenta activa
        </label>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="dialog-actions">
          <button className="button secondary" type="button" disabled={busy} onClick={onClose}>
            Volver
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar usuario'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
