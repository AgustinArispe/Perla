import { afterEach, expect, it, vi } from 'vitest';
import { webRequest } from '../../src/renderer/web-client';
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
it('reports an uncertain network result without replaying a sale', async () => {
  const fetcher = vi.fn().mockRejectedValue(new TypeError('network'));
  vi.stubGlobal('fetch', fetcher);
  await expect(webRequest('/sales', 'POST', { checkoutKey: 'stable' })).rejects.toThrow('conexión');
  expect(fetcher).toHaveBeenCalledTimes(1);
});
