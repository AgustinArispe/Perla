type FocusDocument = Pick<Document, 'activeElement' | 'querySelector'>;

export function scannerMayCapture(document: FocusDocument, scanner: Element | null): boolean {
  if (document.querySelector('dialog[open], [data-cart-editing]')) return false;
  const active = document.activeElement;
  return (
    !active ||
    active === scanner ||
    !active.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]')
  );
}
