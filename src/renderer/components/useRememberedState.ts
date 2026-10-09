import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthStatus } from '../../shared/auth';
import type { ExcelFilters } from '../../shared/excel';

/** List context is private to the signed-in user and the current browser session. */
export function useRememberedState<T>(
  module: string,
  field: string,
  initial: T,
): [T, Dispatch<SetStateAction<T>>] {
  const client = useQueryClient();
  const userId = client.getQueryData<AuthStatus>(['auth-status'])?.user?.id;
  const key = userId ? `perla:list:${userId}:${module}:${field}` : null;
  const [value, setValue] = useState<T>(() => {
    if (!key) return initial;
    try {
      const stored = sessionStorage.getItem(key);
      if (stored === null) return initial;
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(initial))
        return Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every((v) => v === null || typeof v === 'string')
          ? (parsed.map((v) => (v === null ? undefined : v)) as T)
          : initial;
      return typeof parsed === typeof initial ? (parsed as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    if (key)
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* Browsing stays usable when storage is unavailable. */
      }
  }, [key, value]);
  return [value, setValue];
}

/** A scalar screen must reject a multiple-selection view instead of silently narrowing it. */
export function scalarViewFilters(filters: ExcelFilters): ExcelFilters {
  if (Object.values(filters).some((value) => Array.isArray(value)))
    throw new Error(
      'Esta lista admite filtros individuales. Elegí una vista sin selección múltiple.',
    );
  return filters;
}
