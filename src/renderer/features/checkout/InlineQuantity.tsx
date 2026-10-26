import { useCallback, useEffect, useRef, useState } from 'react';

export function InlineQuantity({
  name,
  quantity,
  disabled,
  onChange,
  onDone,
  onEditingChange,
}: {
  name: string;
  quantity: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onDone: () => void;
  onEditingChange: (editing: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const finished = useRef(false);
  const editingChange = useRef(onEditingChange);
  useEffect(() => {
    editingChange.current = onEditingChange;
  }, [onEditingChange]);
  useEffect(() => () => editingChange.current(false), []);
  const focusInput = useCallback((input: HTMLInputElement | null) => {
    if (input) {
      input.focus();
      input.select();
    }
  }, []);
  function finish(save: boolean) {
    if (finished.current) return;
    if (save) {
      try {
        if (!/^\d+$/.test(value.trim()) || Number(value) < 1)
          throw new Error('Usá una cantidad entera mayor a cero.');
        onChange(Number(value));
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'Revisá la cantidad.');
        return;
      }
    }
    finished.current = true;
    setEditing(false);
    onEditingChange(false);
    onDone();
  }
  if (!editing)
    return (
      <button
        className="quantity-button"
        disabled={disabled}
        aria-label={`Cambiar cantidad de ${name}`}
        onClick={() => {
          finished.current = false;
          setValue(String(quantity));
          setError('');
          setEditing(true);
          onEditingChange(true);
        }}
      >
        {quantity}
      </button>
    );
  return (
    <div
      className="cart-inline-quantity"
      data-cart-editing
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
    >
      <input
        aria-label={`Cantidad de ${name}`}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        ref={focusInput}
        onChange={(event) => {
          setValue(event.target.value);
          setError('');
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            finish(event.key === 'Enter');
          }
        }}
      />
      <button
        className="button quiet small"
        disabled={disabled}
        aria-label={`Guardar cantidad de ${name}`}
        onClick={() => finish(true)}
      >
        ✓
      </button>
      <button
        className="button quiet small"
        disabled={disabled}
        aria-label={`Cancelar cantidad de ${name}`}
        onClick={() => finish(false)}
      >
        ×
      </button>
      {error && <small role="alert">{error}</small>}
    </div>
  );
}
