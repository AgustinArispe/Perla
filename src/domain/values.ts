export const MAX_MONEY = 9_999_999_999;
export const MAX_QUANTITY = 1_000_000_000;

export function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es-AR').trim();
}

// Explicit Argentine format: period groups thousands, comma separates decimals.
// BigInt intermediates avoid imprecise floating-point price conversions.
export function parseArs(value: string): number {
  const text = value.trim();
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(text)) {
    throw new Error('Ingresá un importe como 12000,50 o 12.000,50.');
  }
  const [whole = '', fraction = ''] = text.replaceAll('.', '').split(',');
  const cents = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents > BigInt(MAX_MONEY)) throw new Error('El importe supera el máximo permitido.');
  return Number(cents);
}

export function parseQuantity(value: string, unit: 'UNIT' | 'KG'): number {
  const text = value.trim();
  if (!(unit === 'KG' ? /^\d+(?:,\d{1,3})?$/ : /^\d+$/).test(text)) {
    throw new Error(
      unit === 'KG'
        ? 'Ingresá kilos con hasta 3 decimales: 1,250.'
        : 'Ingresá una cantidad entera de unidades.',
    );
  }
  const [whole = '', fraction = ''] = text.split(',');
  const base =
    unit === 'UNIT' ? BigInt(whole) : BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, '0'));
  if (base > BigInt(MAX_QUANTITY)) throw new Error('La cantidad supera el máximo permitido.');
  return Number(base);
}

const currency = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
});
export function formatMoney(cents: number): string {
  return currency.format(cents / 100);
}
export function moneyInput(cents: number): string {
  return `${Math.floor(cents / 100)},${String(cents % 100).padStart(2, '0')}`;
}
export function quantityInput(base: number, unit: 'UNIT' | 'KG'): string {
  return unit === 'UNIT'
    ? String(base)
    : `${Math.floor(base / 1000)},${String(base % 1000).padStart(3, '0')}`;
}
