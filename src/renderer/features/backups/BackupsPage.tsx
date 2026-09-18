import { useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { errorMessage } from '../../api';
import { Dialog } from '../../components/Dialog';
import { downloadFile, webUpload, webValue } from '../../web-client';

interface BackupInfo {
  id: string;
  createdAt: string;
  kind: 'MANUAL' | 'DAILY' | 'PRE_RESTORE';
  appVersion: string;
  schemaVersion: number;
  bytes: number;
}
interface Preview {
  info: BackupInfo;
  previewToken: string;
}
const kinds = { MANUAL: 'Manual', DAILY: 'Diaria', PRE_RESTORE: 'Antes de restaurar' };
const date = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'short',
  timeStyle: 'short',
});

export function BackupsPage({ onRestored }: { onRestored: () => Promise<void> }) {
  const client = useQueryClient();
  const backups = useQuery({
    queryKey: ['backups'],
    queryFn: () => webValue<BackupInfo[]>('/backups'),
  });
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [preview, setPreview] = useState<Preview | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Copias de seguridad</h1>
          <p>Copias del negocio guardadas en el servidor</p>
        </div>
        <button
          className="button primary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await webValue('/backups', 'POST', {});
              await client.invalidateQueries({ queryKey: ['backups'] });
              setNotice('Copia creada.');
            })
          }
        >
          {busy ? 'Procesando…' : 'Crear copia'}
        </button>
      </div>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && <p role="status">{notice}</p>}
      <section className="dashboard-panel">
        <h2>Subir una copia</h2>
        <label className="field">
          Archivo de copia
          <input
            ref={fileInput}
            type="file"
            accept=".bocha,application/octet-stream"
            disabled={busy}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (!file) return;
              void run(async () => {
                await webUpload<BackupInfo>('/backups/upload', file);
                await client.invalidateQueries({ queryKey: ['backups'] });
                setNotice('Copia subida y validada.');
              }).finally(() => {
                if (fileInput.current) fileInput.current.value = '';
              });
            }}
          />
        </label>
      </section>
      <section className="dashboard-panel">
        <h2>Copias disponibles</h2>
        {backups.isError && (
          <div className="alert error" role="alert">
            {errorMessage(backups.error)}{' '}
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => void backups.refetch()}
            >
              Reintentar
            </button>
          </div>
        )}
        <div className="dashboard-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Tamaño</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {backups.data?.map((info) => (
                <tr key={info.id}>
                  <td>
                    <strong>{date.format(new Date(info.createdAt))}</strong>
                  </td>
                  <td>{kinds[info.kind]}</td>
                  <td>
                    {new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(
                      info.bytes / 1024,
                    )}{' '}
                    KB
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      <button
                        className="button secondary small"
                        disabled={busy}
                        aria-label={`Descargar copia del ${date.format(new Date(info.createdAt))}`}
                        onClick={() =>
                          void run(async () => {
                            await downloadFile(
                              `/backups/${info.id}/download`,
                              `el-bocha-${info.id}.bocha`,
                            );
                          })
                        }
                      >
                        Descargar
                      </button>
                      <button
                        className="button secondary small"
                        disabled={busy}
                        aria-label={`Revisar copia del ${date.format(new Date(info.createdAt))}`}
                        onClick={() =>
                          void run(async () => {
                            setPreview(
                              await webValue<Preview>(`/backups/${info.id}/preview`, 'POST', {}),
                            );
                          })
                        }
                      >
                        Revisar para restaurar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!backups.isError && !backups.data?.length && (
                <tr>
                  <td colSpan={4} className="empty-table">
                    {backups.isPending
                      ? 'Cargando copias…'
                      : 'Creá una copia para resguardar los datos del negocio.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {preview && (
        <RestoreForm preview={preview} onClose={() => setPreview(null)} onRestored={onRestored} />
      )}
    </>
  );
}

function RestoreForm({
  preview,
  onClose,
  onRestored,
}: {
  preview: Preview;
  onClose: () => void;
  onRestored: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [password, setPassword] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const currentPassword = password;
    setPassword('');
    try {
      await webValue('/backups/restore', 'POST', {
        previewToken: preview.previewToken,
        currentPassword,
      });
      await onRestored();
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog title="Restaurar copia" busy={busy} onClose={onClose}>
      <form className="user-form" onSubmit={(event) => void submit(event)}>
        <p>
          Copia del <strong>{date.format(new Date(preview.info.createdAt))}</strong> ·{' '}
          {kinds[preview.info.kind]}
        </p>
        <div className="alert warning">
          La restauración reemplaza los datos actuales y cierra todas las sesiones. Se guarda una
          copia previa. Resolvé las ventas en borrador antes de continuar.
        </div>
        <label className="field">
          Tu contraseña actual
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            maxLength={128}
            disabled={busy}
            autoFocus
          />
        </label>
        {error && (
          <div className="alert error" role="alert">
            {error}
            <p>Si la revisión venció, cerrá y revisá la copia nuevamente.</p>
          </div>
        )}
        <div className="dialog-actions">
          <button type="button" className="button secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className="button danger" disabled={busy || !password}>
            {busy ? 'Restaurando…' : 'Restaurar y cerrar sesiones'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
