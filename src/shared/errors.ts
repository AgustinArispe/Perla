import { z } from 'zod';
import type { AppErrorSchema, Result } from './contracts';

export type AppError = z.infer<typeof AppErrorSchema>;
export class DomainError extends Error {
  constructor(
    public readonly code: AppError['code'],
    message: string,
    public readonly retryable = false,
  ) {
    super(message);
  }
}
export function normalizeError(error: unknown): AppError {
  if (error instanceof DomainError)
    return { code: error.code, message: error.message, retryable: error.retryable };
  if (error instanceof z.ZodError)
    return {
      code: 'VALIDATION',
      message: error.issues.map((issue) => issue.message).join(' '),
      retryable: false,
    };
  const code = (error as { code?: string } | null)?.code;
  if (code === 'SQLITE_FULL')
    return {
      code: 'DISK_FULL',
      message:
        'No hay espacio para guardar. Liberá espacio y volvé a intentar; la operación no se confirmó.',
      retryable: true,
    };
  if (code?.startsWith('SQLITE_BUSY') || code?.startsWith('SQLITE_LOCKED'))
    return {
      code: 'DB_BUSY',
      message: 'Los datos están ocupados. Esperá un momento y volvé a intentar.',
      retryable: true,
    };
  if (code?.startsWith('SQLITE_CONSTRAINT'))
    return {
      code: 'VALIDATION',
      message: 'El SKU o código de barras ya existe, o los datos no son válidos.',
      retryable: false,
    };
  if (code === 'SQLITE_CORRUPT' || code === 'SQLITE_NOTADB')
    return {
      code: 'BACKUP_INVALID',
      message:
        'La base de datos no se puede leer. Conservá el archivo y contactá al mantenimiento.',
      retryable: false,
    };
  if (code === 'SQLITE_READONLY' || code === 'EACCES' || code === 'EPERM')
    return {
      code: 'INTERNAL',
      message: 'No se puede escribir en la carpeta de datos. Revisá sus permisos.',
      retryable: true,
    };
  return {
    code: 'INTERNAL',
    message:
      'No se pudo completar la operación. Los datos pendientes se conservan; volvé a intentar.',
    retryable: true,
  };
}
export function failure<T>(error: unknown): Result<T> {
  return { ok: false, error: normalizeError(error) };
}
