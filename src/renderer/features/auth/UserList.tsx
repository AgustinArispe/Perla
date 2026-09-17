import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserSaveSchema, type User } from '../../../shared/auth';
import { roleLabel } from '../../../domain/permissions';
import { api, unwrap, errorMessage } from '../../api';
import { Dialog } from '../../components/Dialog';
export function UserList() {
  const client = useQueryClient();
  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => unwrap(await api().users.list()),
  });
  const [editing, setEditing] = useState<User | null | undefined>();
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Usuarios</h1>
          <p>Personas y permisos del negocio</p>
        </div>
        <button className="button primary" onClick={() => setEditing(null)}>
          Crear usuario
        </button>
      </div>
      {users.isError && (
        <div className="alert error" role="alert">
          {errorMessage(users.error)}
        </div>
      )}
      <div className="catalog-card">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.data?.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                </td>
                <td>{user.username}</td>
                <td>{roleLabel[user.role]}</td>
                <td>{user.active ? 'Activo' : 'Inactivo'}</td>
                <td>
                  <button
                    className="button secondary small"
                    aria-label={`Editar ${user.name}`}
                    onClick={() => setEditing(user)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.isPending && <p className="empty-table">Cargando usuarios…</p>}
      </div>
      {editing !== undefined && (
        <UserForm
          user={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void client.invalidateQueries({ queryKey: ['users'] });
            void client.invalidateQueries({ queryKey: ['auth-status'] });
          }}
        />
      )}
    </>
  );
}
function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
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
          <select name="role" defaultValue={user?.role ?? 'SELLER'}>
            <option value="SELLER">Vendedor</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="OWNER">Jefe</option>
          </select>
        </label>
        <label className="field">
          {user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
          <input
            name="password"
            aria-label={user ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            required={!user}
            minLength={15}
            maxLength={128}
            autoComplete="new-password"
          />
          <small>Al menos 15 caracteres. Los cambios cierran las sesiones de esta cuenta.</small>
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
