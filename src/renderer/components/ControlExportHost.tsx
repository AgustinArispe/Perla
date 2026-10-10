import { useEffect, useRef, useState } from 'react';
import { Dialog } from './Dialog';
import { ExportRowPicker } from './ExportRowPicker';
import { downloadControlFile } from '../features/control/client';
import { webValue } from '../web-client';
import type { ExcelPreview } from '../../shared/excel';
import { errorMessage } from '../api';

export interface ControlExportPrompt {
  area: string;
  action: string;
  input: unknown;
  resolve: () => void;
  reject: (error: Error) => void;
}
export function ControlExportHost() {
  const [request, setRequest] = useState<ControlExportPrompt | null>(null);
  const pending = useRef<ControlExportPrompt | null>(null);
  useEffect(() => {
    const receive = (event: Event) => {
      const next = (event as CustomEvent<ControlExportPrompt>).detail;
      if (pending.current) {
        next.reject(new Error('Terminá la exportación abierta antes de iniciar otra.'));
        return;
      }
      pending.current = next;
      setRequest(next);
    };
    window.addEventListener('perla:control-export', receive);
    return () => {
      window.removeEventListener('perla:control-export', receive);
      pending.current?.resolve();
    };
  }, []);
  if (!request) return null;
  const close = () => {
    request.resolve();
    pending.current = null;
    setRequest(null);
  };
  return <ControlExportDialog request={request} onClose={close} />;
}
function ControlExportDialog({
  request,
  onClose,
}: {
  request: ControlExportPrompt;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState<string[] | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { area, action, input } = request;
  return (
    <Dialog
      title="Exportar Excel"
      onClose={onClose}
      busy={busy}
      size={selection ? 'wide' : 'regular'}
      className="export-dialog"
    >
      <form
        className="checkout-modal export-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy) return;
          if (selection && !selection.length) {
            setError('Elegí al menos una fila o exportá todos los resultados.');
            return;
          }
          setBusy(true);
          setError('');
          void downloadControlFile(area, input, action, selection)
            .then(onClose)
            .catch((e) => setError(errorMessage(e)))
            .finally(() => setBusy(false));
        }}
      >
        <div className="export-content">
          <p className="subtle-note">
            Se conservan los filtros del panel. El archivo incluye la presentación de Perla y el
            nombre del comercio.
          </p>
          <ExportRowPicker
            source={JSON.stringify({ area, action, input })}
            selection={selection}
            onChange={setSelection}
            load={(page) =>
              webValue<ExcelPreview>('/control/export-preview', 'POST', {
                area,
                action,
                input,
                page,
              })
            }
          />
          {error && (
            <p role="alert" className="alert error">
              {error}
            </p>
          )}
        </div>
        <div className="dialog-actions">
          <button type="button" className="button secondary" disabled={busy} onClick={onClose}>
            Volver
          </button>
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? 'Preparando Excel…' : 'Descargar Excel'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
