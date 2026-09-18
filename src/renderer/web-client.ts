import type { BochaApi, Result, SystemStatus } from '../shared/contracts';
import type { WebSession, WebLogin } from '../shared/web';
let csrfToken: string | null = null;
function headers(method: string, binary = false): Record<string, string> {
  return {
    ...(method !== 'GET'
      ? { 'content-type': binary ? 'application/octet-stream' : 'application/json' }
      : {}),
    ...(method !== 'GET' && csrfToken ? { 'x-csrf-token': csrfToken } : {}),
  };
}
export async function webRequest<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<Result<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      credentials: 'same-origin',
      headers: headers(method),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error('Se perdió la conexión. Revisá el resultado antes de reintentar.');
  }
  const result = (await response.json()) as Result<T>;
  if (result.ok && (path === '/auth/session' || path === '/auth/login'))
    csrfToken = (result.value as WebSession | WebLogin).csrfToken;
  if (response.status === 401 && typeof window !== 'undefined')
    window.dispatchEvent(new Event('bocha-session-expired'));
  if (result.ok && ['/auth/logout', '/auth/password', '/backups/restore'].includes(path))
    csrfToken = null;
  return result;
}
export async function webValue<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const result = await webRequest<T>(path, method, body);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
export async function webUpload<T>(path: string, file: File): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: headers('POST', true),
    body: file,
  });
  const result = (await response.json()) as Result<T>;
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
export async function downloadFile(path: string, filename: string): Promise<void> {
  const response = await fetch(`/api/v1${path}`, { credentials: 'same-origin' });
  if (!response.ok) {
    const result = (await response.json()) as { error: { message: string } };
    throw new Error(result.error.message);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function queryString(input: object): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(input))
    if (value !== undefined && value !== null) query.set(key, String(value));
  return query.toString();
}
const get = <T>(path: string, input?: object) =>
  webRequest<T>(path + (input ? '?' + queryString(input) : ''));
const post = <T>(path: string, input: unknown = {}) => webRequest<T>(path, 'POST', input);
function selectCsv(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.oncancel = () => resolve(null);
    input.click();
  });
}
const health = () => get<SystemStatus>('/health');
export const webApi: BochaApi = {
  auth: {
    status: () => get('/auth/session'),
    bootstrap: async () => ({
      ok: false,
      error: {
        code: 'FORBIDDEN',
        message: 'La cuenta inicial debe configurarla el administrador.',
        retryable: false,
      },
    }),
    login: async (input) => {
      const r = await post<WebLogin>('/auth/login', input);
      return r.ok ? { ok: true, value: r.value.user } : r;
    },
    logout: () => post('/auth/logout'),
    changePassword: (input) => post('/auth/password', input),
  },
  system: { health, reconnect: health },
  dashboard: { monthly: (month) => get('/dashboard/monthly', { month }) },
  users: { list: () => get('/users'), save: (input) => post('/users', input) },
  products: {
    get: (id) => get('/products/' + encodeURIComponent(id)),
    search: (input) => get('/products', input),
    save: (input) => post('/products', input),
    setActive: (input) => post('/products/active', input),
    findByBarcode: (code) => get('/barcodes/' + encodeURIComponent(code)),
    previewImport: async () => {
      const file = await selectCsv();
      if (!file) return { ok: true, value: null };
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera los 10 MB.');
      return post('/products/import/preview', {
        content: await file.text(),
        sourceName: file.name,
      });
    },
    applyImport: (input) => post('/products/import/apply', input),
  },
  checkout: {
    getDraft: () => get('/checkout/draft'),
    saveDraft: (input) => webRequest('/checkout/draft', 'PUT', input),
    cancelDraft: (expectedRevision) => post('/checkout/cancel', { expectedRevision }),
  },
  sales: {
    complete: (input) => post('/sales', input),
    findByCheckoutKey: (key) => get('/sales/by-key/' + encodeURIComponent(key)),
    detail: (id) => get('/sales/' + encodeURIComponent(id)),
    list: (input) => get('/sales', input),
    previewVoid: (id) => get('/sales/' + encodeURIComponent(id) + '/void-preview'),
    void: (input) => post('/sales/void', input),
  },
  stock: {
    operation: (key) => get('/stock/operations/' + encodeURIComponent(key)),
    get: (id) => get('/stock/' + encodeURIComponent(id)),
    search: (input) => get('/stock', input),
    opening: (input) => post('/stock/opening', input),
    count: (input) => post('/stock/count', input),
    record: (input) => post('/stock/movement', input),
    listLow: (input) => get('/stock/low', input),
    movements: (input) => {
      const { productId, ...query } = input;
      return get('/stock/' + encodeURIComponent(productId) + '/movements', query);
    },
  },
};
