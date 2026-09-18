export function parseWeight(raw: string, unit: 'GRAM' | 'KG'): number {
  const text = raw.trim();
  if (!(unit === 'GRAM' ? /^\d+$/ : /^\d+(?:[.,]\d{1,3})?$/).test(text))
    throw new Error(
      unit === 'GRAM' ? 'Ingresá gramos enteros.' : 'Ingresá kilos con hasta tres decimales.',
    );
  const [whole = '', fraction = ''] = text.replace('.', ',').split(',');
  const grams =
    unit === 'GRAM' ? BigInt(whole) : BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (grams < 1n || grams > 99999n) throw new Error('El peso debe estar entre 1 y 99.999 gramos.');
  return Number(grams);
}
