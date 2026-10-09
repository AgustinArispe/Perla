import { useId, useLayoutEffect, useRef } from 'react';
import type { ReactNode, KeyboardEventHandler } from 'react';
import { Icon } from './Icon';

export function Dialog({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
  size,
  className = '',
  onKeyDown,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
  size?: 'compact' | 'regular' | 'wide';
  className?: string;
  onKeyDown?: KeyboardEventHandler<HTMLDialogElement>;
}) {
  const reference = useRef<HTMLDialogElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const dialog = reference.current!;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    const initialFocus =
      dialog.querySelector<HTMLElement>('[data-dialog-focus]') ??
      dialog.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled)',
      );
    initialFocus?.focus();
    return () => {
      dialog.close();
      if (origin?.isConnected) origin.focus();
    };
  }, []);
  return (
    <dialog
      ref={reference}
      className={`dialog dialog-${size ?? (wide ? 'wide' : 'regular')} ${className}`.trim()}
      aria-labelledby={id}
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="dialog-header">
        <h2 id={id}>{title}</h2>
        <button
          className="icon-button"
          type="button"
          aria-label="Cerrar"
          onClick={onClose}
          disabled={busy}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
