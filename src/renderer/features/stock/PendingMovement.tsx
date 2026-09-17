import { useEffect, useState } from 'react';
import { api, errorMessage, unwrap } from '../../api';
import { loadPending, clearPending } from './pending';
import type { PendingStock } from './pending';

export function PendingMovement({
  onResolved,
  onBlocked,
}: {
  onResolved: () => void;
  onBlocked: (blocked: boolean) => void;
}) {
  const [pending, setPending] = useState<PendingStock | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function refresh() {
      try {
        const current = loadPending();
        setPending(current);
        setError('');
        onBlocked(Boolean(current));
      } catch (failure) {
        setError(errorMessage(failure));
        onBlocked(true);
      }
    }
    refresh();
    window.addEventListener('bocha-stock-pending', refresh);
    return () => window.removeEventListener('bocha-stock-pending', refresh);
  }, [onBlocked]);
  async function resolve(mode: 'check' | 'retry' | 'discard') {
    if (!pending || busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = unwrap(await api().stock.operation(pending.input.operationKey));
      if (saved) {
        clearPending(pending.input.operationKey);
        onResolved();
        return;
      }
      if (mode === 'check') {
        setError('Todavía no está guardado. Podés reintentar el mismo registro o descartarlo.');
        return;
      }
      if (mode === 'discard') {
        clearPending(pending.input.operationKey);
        onResolved();
        return;
      }
      const result =
        pending.action === 'record'
          ? await api().stock.record(pending.input)
          : await api().stock[pending.action](pending.input);
      unwrap(result);
      clearPending(pending.input.operationKey);
      onResolved();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  if (!pending && !error) return null;
  return (
    <div className="alert info pending-movement" role="status">
      <div>
        <strong>Registro pendiente de confirmar{pending ? ` · ${pending.name}` : ''}</strong>
        <p>Consultá el resultado antes de registrar otra operación.</p>
        {error && <p role="alert">{error}</p>}
      </div>
      {pending && (
        <div className="pending-actions">
          <button
            className="button secondary small"
            disabled={busy}
            onClick={() => void resolve('check')}
          >
            Consultar resultado
          </button>
          <button
            className="button primary small"
            disabled={busy}
            onClick={() => void resolve('retry')}
          >
            Reintentar registro
          </button>
          <button className="text-button" disabled={busy} onClick={() => void resolve('discard')}>
            Descartar pendiente
          </button>
        </div>
      )}
    </div>
  );
}
