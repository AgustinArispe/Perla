import { useState } from 'react';
import type { FormEvent } from 'react';
import { api, errorMessage, unwrap } from '../../api';
export function Login({
  initialized: accountInitialized,
  onSignedIn,
}: {
  initialized: boolean;
  onSignedIn: () => Promise<void>;
}) {
  const initialized = window.bocha ? accountInitialized : true;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const credentials = {
        username: String(data.get('username')),
        password: String(data.get('password')),
      };
      unwrap(
        initialized
          ? await api().auth.login(credentials)
          : await api().auth.bootstrap({ ...credentials, name: String(data.get('name')) }),
      );
      await onSignedIn();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">B.</span>
          <div>
            <strong>El Bocha</strong>
            <span>Control del almacén</span>
          </div>
        </div>
        <h1>{initialized ? 'Ingresar' : 'Configurar primer jefe'}</h1>
        <form onSubmit={(event) => void submit(event)}>
          {!initialized && (
            <label className="field">
              Nombre
              <input
                name="name"
                required
                minLength={2}
                maxLength={100}
                autoComplete="name"
                autoFocus
              />
            </label>
          )}
          <label className="field">
            Usuario
            <input
              name="username"
              required
              minLength={3}
              maxLength={40}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={initialized}
            />
          </label>
          <label className="field">
            Contraseña
            <input
              name="password"
              aria-label="Contraseña"
              type="password"
              required
              minLength={initialized ? 1 : 15}
              maxLength={128}
              autoComplete={initialized ? 'current-password' : 'new-password'}
            />
            {!initialized && <small>Al menos 15 caracteres. Puede ser una frase.</small>}
          </label>
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <button className="button primary" disabled={busy}>
            {busy ? 'Ingresando…' : initialized ? 'Ingresar' : 'Crear cuenta de jefe'}
          </button>
        </form>
      </div>
    </div>
  );
}
