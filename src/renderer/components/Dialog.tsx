import { useId, useLayoutEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Dialog({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const reference = useRef<HTMLDialogElement>(null);
  const id = useId();
  useLayoutEffect(() => {
    const dialog = reference.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={reference}
      className={`dialog ${wide ? 'dialog-wide' : ''}`}
      aria-labelledby={id}
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
