import { expect, it } from 'vitest';
import { scannerMayCapture } from '../../src/renderer/features/checkout/scanner-focus';

function element(editable: boolean): Element {
  return { closest: () => (editable ? {} : null) } as unknown as Element;
}
it('does not capture scanner focus or shortcuts while any dialog is open', () => {
  const scanner = element(true);
  const document = { activeElement: scanner, querySelector: () => ({}) } as unknown as Document;
  expect(scannerMayCapture(document, scanner)).toBe(false);
});
it('preserves form edits and permits scanner input and non-editing surfaces', () => {
  const scanner = element(true);
  const document = {
    activeElement: element(true),
    querySelector: () => null,
  } as unknown as Document;
  expect(scannerMayCapture(document, scanner)).toBe(false);
  Object.assign(document, { activeElement: scanner });
  expect(scannerMayCapture(document, scanner)).toBe(true);
  Object.assign(document, { activeElement: element(false) });
  expect(scannerMayCapture(document, scanner)).toBe(true);
});
