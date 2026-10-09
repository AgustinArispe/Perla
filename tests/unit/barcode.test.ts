import { describe, expect, it } from 'vitest';
import { createInternalEan13, isValidEan13 } from '../../src/domain/barcode';

describe('códigos internos', () => {
  it('genera un EAN-13 interno con prefijo 200 y dígito verificador válido', () => {
    expect(createInternalEan13(42)).toBe('2000000000428');
    expect(isValidEan13('2000000000428')).toBe(true);
  });

  it('rechaza un EAN-13 cuyo dígito verificador fue alterado', () => {
    expect(isValidEan13('2000000000429')).toBe(false);
  });
});
