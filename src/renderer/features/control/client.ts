import { webValue, webRequest } from '../../web-client';
export function controlValue<T>(area: string, action: string, input: unknown = {}) {
  return webValue<T>('/control', 'POST', { area, action, input });
}
export async function downloadControlExcel(area: string, input: unknown = {}, action = 'export') {
  return new Promise<void>((resolve, reject) => {
    window.dispatchEvent(
      new CustomEvent('perla:control-export', { detail: { area, input, action, resolve, reject } }),
    );
  });
}
export async function downloadControlFile(
  area: string,
  input: unknown,
  action: string,
  selection?: string[],
) {
  const request = await webRequest<{ base64: string; filename: string }>(
    '/control/export',
    'POST',
    { area, action, input, ...(selection ? { selection } : {}) },
  );
  if (!request.ok) throw new Error(request.error.message);
  const bytes = Uint8Array.from(atob(request.value.base64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = request.value.filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
