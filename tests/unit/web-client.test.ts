import { afterEach, expect, it, vi } from 'vitest';
import { webRequest, webUpload, downloadFile } from '../../src/renderer/web-client';
afterEach(() => vi.unstubAllGlobals());
it('keeps CSRF in memory and sends cookies without retrying writes', async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, value: { user: { id: 'a' }, csrfToken: 'csrf' } })),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, value: null })));
  vi.stubGlobal('fetch', fetcher);
  await webRequest('/auth/session');
  await webRequest('/checkout/cancel', 'POST', { expectedRevision: 1 });
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
    credentials: 'same-origin',
    headers: { 'x-csrf-token': 'csrf' },
  });
});

it.each([
  ['HTML de proxy', '<html>Error 502</html>', 502],
  ['JSON cortado', '{"ok":', 200],
  ['envoltorio inexistente', '{}', 200],
  ['valor nulo', 'null', 200],
  ['éxito sin contenido', '{"ok":true}', 200],
  ['error sin detalle', '{"ok":false}', 500],
  ['éxito sobre HTTP fallido', '{"ok":true,"value":{}}', 502],
])(
  'respuesta inesperada (%s) conserva mensaje útil y nunca repite un cobro',
  async (_name, body, status) => {
    const fetcher = vi.fn().mockResolvedValue(new Response(body, { status }));
    vi.stubGlobal('fetch', fetcher);
    await expect(webRequest('/sales', 'POST', { checkoutKey: 'misma-operacion' })).rejects.toThrow(
      'respuesta del servidor',
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

it('un 401 ilegible invalida la sesión antes de informar el error de respuesta', async () => {
  const dispatchEvent = vi.fn();
  vi.stubGlobal('window', { dispatchEvent });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 })));
  await expect(webRequest('/products')).rejects.toThrow('respuesta del servidor');
  expect(dispatchEvent).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'bocha-session-expired' }),
  );
});

it('subida y descarga fallidas muestran el mismo error útil sin interpretar HTML como datos', async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve(new Response('<html>Gateway</html>', { status: 502 })),
    );
  vi.stubGlobal('fetch', fetcher);
  await expect(webUpload('/backups/upload', new File(['copia'], 'negocio.backup'))).rejects.toThrow(
    'respuesta del servidor',
  );
  await expect(downloadFile('/backups/copia/download', 'negocio.backup')).rejects.toThrow(
    'respuesta del servidor',
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('reports an uncertain network result without replaying a sale', async () => {
  const fetcher = vi.fn().mockRejectedValue(new TypeError('network'));
  vi.stubGlobal('fetch', fetcher);
  await expect(webRequest('/sales', 'POST', { checkoutKey: 'stable' })).rejects.toThrow('conexión');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
