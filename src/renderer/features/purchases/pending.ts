import { PurchaseDraftBodySchema, type PurchaseDraftBody } from '../../../shared/purchases';

const KEY = 'perla.purchase.pending.v1';

type PendingPurchase = { body: PurchaseDraftBody; savedAt: string };

export function readPendingPurchase(
  storage: Pick<Storage, 'getItem'> = localStorage,
): PendingPurchase | null {
  try {
    const value = JSON.parse(storage.getItem(KEY) ?? 'null') as unknown;
    if (!value || typeof value !== 'object') return null;
    const record = value as { body?: unknown; savedAt?: unknown };
    if (typeof record.savedAt !== 'string') return null;
    return { body: PurchaseDraftBodySchema.parse(record.body), savedAt: record.savedAt };
  } catch {
    return null;
  }
}

export function writePendingPurchase(
  body: PurchaseDraftBody,
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  try {
    storage.setItem(KEY, JSON.stringify({ body, savedAt: new Date().toISOString() }));
  } catch {
    // El servidor sigue siendo la copia principal si el navegador no tiene espacio.
  }
}

export function clearPendingPurchase(storage: Pick<Storage, 'removeItem'> = localStorage): void {
  try {
    storage.removeItem(KEY);
  } catch {
    // Un almacenamiento bloqueado no debe impedir confirmar una compra.
  }
}
