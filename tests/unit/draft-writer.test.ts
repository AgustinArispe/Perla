import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { DraftWriter } from '../../src/renderer/features/checkout/draft-writer';
import type { DraftRecord } from '../../src/shared/catalog';
it('flush serializa cambios y recupera una escritura confirmada sin acuse', async () => {
  let stored: DraftRecord | null = null,
    calls = 0;
  const body = { checkoutKey: randomUUID(), lines: [], discount: { type: 'NONE' as const } };
  const writer = new DraftWriter({
    saveDraft: async (input) => {
      calls++;
      stored = { body: input.body, revision: input.expectedRevision + 1, updatedAt: 'now' };
      return {
        ok: false,
        error: { code: 'INTERNAL', message: 'Sin confirmación', retryable: true },
      };
    },
    getDraft: async () => ({ ok: true, value: stored }),
  });
  writer.update(body);
  await writer.flush();
  expect(writer.revision).toBe(1);
  expect(writer.unsaved).toBe(false);
  writer.update({ ...body, discount: { type: 'FIXED', amountCents: 0 } });
  await writer.flush();
  expect(writer.revision).toBe(2);
  expect(calls).toBe(2);
  writer.dispose();
});
it('no descarta contenido si falla guardado y resultado no existe', async () => {
  const writer = new DraftWriter({
    saveDraft: async () => ({
      ok: false,
      error: { code: 'DISK_FULL', message: 'Sin espacio', retryable: true },
    }),
    getDraft: async () => ({ ok: true, value: null }),
  });
  writer.update({ checkoutKey: randomUUID(), lines: [], discount: { type: 'NONE' } });
  await expect(writer.flush()).rejects.toThrow('Sin espacio');
  expect(writer.unsaved).toBe(true);
  writer.dispose();
});
it('permite guardar después de un flush sin cambios', async () => {
  const writer = new DraftWriter({
    saveDraft: async (input) => ({
      ok: true,
      value: { body: input.body, revision: input.expectedRevision + 1, updatedAt: 'now' },
    }),
    getDraft: async () => ({ ok: true, value: null }),
  });
  await writer.flush();
  writer.update({ checkoutKey: randomUUID(), lines: [], discount: { type: 'NONE' } });
  await writer.flush();
  expect(writer.revision).toBe(1);
  expect(writer.unsaved).toBe(false);
  writer.dispose();
});
