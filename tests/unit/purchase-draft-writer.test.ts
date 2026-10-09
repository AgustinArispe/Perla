import { randomUUID } from 'node:crypto';
import { expect, it } from 'vitest';
import { PurchaseDraftWriter } from '../../src/renderer/features/purchases/draft-writer';
import type { PurchaseDraftRecord } from '../../src/shared/purchases';

const body = () => ({
  receiptKey: randomUUID(),
  supplierId: null,
  businessDate: '2026-10-02',
  lines: [],
});

it('serializa el autoguardado y recupera una confirmación sin respuesta', async () => {
  let stored: PurchaseDraftRecord | null = null;
  const writer = new PurchaseDraftWriter({
    saveDraft: async (input) => {
      stored = { body: input.body, revision: input.expectedRevision + 1, updatedAt: 'now' };
      return { ok: false, error: { code: 'INTERNAL', message: 'Sin respuesta', retryable: true } };
    },
    getDraft: async () => ({ ok: true, value: stored }),
  });
  writer.update(body());
  await writer.flush();
  expect(writer.revision).toBe(1);
  expect(writer.unsaved).toBe(false);
  writer.dispose();
});

it('conserva cambios pendientes cuando el servidor no los recibió', async () => {
  const writer = new PurchaseDraftWriter({
    saveDraft: async () => ({
      ok: false,
      error: { code: 'INTERNAL', message: 'Sin conexión', retryable: true },
    }),
    getDraft: async () => ({ ok: true, value: null }),
  });
  writer.update(body());
  await expect(writer.flush()).rejects.toThrow('Sin conexión');
  expect(writer.unsaved).toBe(true);
  writer.dispose();
});
