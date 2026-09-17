import { z } from 'zod';
import { DomainError } from './errors';
import {
  ApplyImportSchema,
  ProductSearchSchema,
  ProductSaveSchema,
  SetActiveSchema,
  SaveDraftSchema,
} from './catalog';

export const RequestSchemas = {
  'system.health': z.null(),
  'system.reconnect': z.null(),
  'products.search': ProductSearchSchema,
  'products.save': ProductSaveSchema,
  'products.setActive': SetActiveSchema,
  'products.findByBarcode': z.strictObject({ barcode: z.string().trim().min(1).max(64) }),
  'products.previewImport': z.null(),
  'products.applyImport': ApplyImportSchema,
  'checkout.getDraft': z.null(),
  'checkout.saveDraft': SaveDraftSchema,
} as const;
export type Operation = keyof typeof RequestSchemas;
export function validateRequest(input: unknown): { operation: Operation; payload: unknown } {
  const envelope = z.strictObject({ operation: z.string(), payload: z.unknown() }).parse(input);
  if (!Object.hasOwn(RequestSchemas, envelope.operation))
    throw new DomainError('VALIDATION', 'La operación no está disponible.');
  const operation = envelope.operation as Operation;
  return { operation, payload: RequestSchemas[operation].parse(envelope.payload) };
}

export function isTrustedSender(
  url: string | undefined,
  mainFrame: boolean,
  rendererUrl: string,
  developmentUrl?: string,
): boolean {
  if (!mainFrame || !url) return false;
  try {
    return developmentUrl
      ? new URL(url).origin === new URL(developmentUrl).origin
      : url === rendererUrl;
  } catch {
    return false;
  }
}
