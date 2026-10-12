import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, errorMessage, unwrap } from '../../api';

type Reading = {
  code: string;
  enter: boolean;
  product: string | null;
  error: string | null;
  at: Date;
};

export function ScannerTest({
  compact = false,
  autoFocusInput = true,
  onVerified,
}: {
  compact?: boolean;
  autoFocusInput?: boolean;
  onVerified?: (at: Date) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const enterPressed = useRef(false);
  const [code, setCode] = useState('');
  const [reading, setReading] = useState<Reading | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (autoFocusInput) input.current?.focus();
  }, [autoFocusInput]);

  async function check(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const captured = code.trim();
    if (!captured || checking) return;
    const enter = enterPressed.current;
    const at = new Date();
    enterPressed.current = false;
    setCode('');
    setChecking(true);
    setReading({ code: captured, enter, product: null, error: null, at });
    if (enter) onVerified?.(at);
    try {
      const product = unwrap(await api().products.findByBarcode(captured));
      setReading({ code: captured, enter, product: product.name, error: null, at });
    } catch (failure) {
      setReading({
        code: captured,
        enter,
        product: null,
        error: errorMessage(failure),
        at,
      });
    } finally {
      setChecking(false);
      input.current?.focus();
    }
  }

  return (
    <section
      className={`${compact ? '' : 'dashboard-panel'} scanner-test${compact ? ' scanner-test-compact' : ''}`}
      aria-label="Prueba del lector"
    >
      <div className="scanner-test-heading">
        <div>
          {!compact && <h2>Probar lector</h2>}
          <p>Escaneá cualquier código. No se agrega al carrito.</p>
        </div>
        <span
          className={`scanner-test-indicator${reading?.enter ? ' verified' : ''}`}
          role="status"
        >
          {reading?.enter ? 'OK · Lector respondió' : code ? 'Código entrando…' : 'Sin verificar'}
        </span>
      </div>
      <form onSubmit={(event) => void check(event)}>
        <label htmlFor="scanner-test-code">Código de barras</label>
        <div className="scanner-test-input-row">
          <input
            ref={input}
            id="scanner-test-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') enterPressed.current = true;
            }}
            autoComplete="off"
            spellCheck={false}
            maxLength={128}
            placeholder="Escaneá un código y presioná Enter"
          />
          <button className="button secondary" type="submit" disabled={!code.trim() || checking}>
            {checking ? 'Comprobando…' : 'Comprobar'}
          </button>
        </div>
      </form>
      {reading && (
        <div className="scanner-test-result" role="status">
          <div>
            <strong>{reading.enter ? 'Lectura comprobada' : 'Código recibido'}</strong>
            <span>
              {reading.at.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ·{' '}
              {reading.enter ? 'Enter recibido' : 'Comprobación manual'}
            </span>
          </div>
          <div>
            <span className="scanner-test-code">{reading.code}</span>
            <span>{reading.product ?? reading.error}</span>
          </div>
        </div>
      )}
      <p className="scanner-test-note">
        {reading?.enter
          ? 'El código llegó completo. Ya podés usar la pistola en Caja.'
          : 'Si el código aparece pero no se comprueba solo, configurá la pistola para enviar Enter al terminar.'}
      </p>
    </section>
  );
}
