import { useState } from 'react';
import type { FormEvent } from 'react';
import { Dialog } from '../../components/Dialog';
import { api, errorMessage, unwrap } from '../../api';
import type { Role } from '../../../shared/auth';
export function ChangePassword({
  onClose,
  onChanged,
  role,
}: {
  onClose: () => void;
  onChanged: () => Promise<void>;
  role: Role;
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
      unwrap(
        await api().auth.changePassword({
          currentPassword: String(data.get('current')),
          newPassword: String(data.get('next')),
        }),
      );
      await onChanged();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Cambiar contraseña" busy={busy} onClose={onClose}>
      <form className="user-form" onSubmit={(event) => void submit(event)}>
        <label className="field">
          Contraseña actual
          <input
            name="current"
            type="password"
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>
        <label className="field">
          Nueva contraseña
          <input
            name="next"
            aria-label="Nueva contraseña"
            type="password"
            minLength={role === 'ADMIN' ? 16 : 8}
            maxLength={128}
            autoComplete="new-password"
            required
          />
          <small>
            {role === 'ADMIN'
              ? 'Administrador: 16 caracteres, mayúscula, minúscula, número y símbolo.'
              : 'Al menos 8 caracteres, con mayúscula y símbolo.'}{' '}
            Al guardar tendrás que volver a ingresar.
          </small>
        </label>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <button className="button primary" disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </Dialog>
  );
}
