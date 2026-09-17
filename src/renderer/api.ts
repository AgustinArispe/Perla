import type { BochaApi, Result } from '../shared/contracts';

export function api(): BochaApi {
  if (!window.bocha)
    throw new Error('Abrí la aplicación de escritorio para trabajar con los datos del almacén.');
  return window.bocha;
}
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'No se pudo completar la operación. Volvé a intentar.';
}
