const INTERNAL_PREFIX = '200';

export function ean13CheckDigit(payload: string): string {
  if (!/^\d{12}$/.test(payload))
    throw new Error('El EAN-13 requiere 12 dígitos antes del verificador.');
  let total = 0;
  for (let index = 0; index < payload.length; index += 1)
    total += Number(payload[index]) * (index % 2 === 0 ? 1 : 3);
  return String((10 - (total % 10)) % 10);
}

export function createInternalEan13(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > 999_999_999)
    throw new Error('La secuencia de código interno no es válida.');
  const payload = INTERNAL_PREFIX + String(sequence).padStart(9, '0');
  return payload + ean13CheckDigit(payload);
}

export function isValidEan13(value: string): boolean {
  return /^\d{13}$/.test(value) && ean13CheckDigit(value.slice(0, 12)) === value[12];
}
