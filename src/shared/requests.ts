import { z } from 'zod';
import { BootstrapSchema, LoginSchema, UserSaveSchema, ChangePasswordSchema } from './auth';
import { CheckoutSchema, VoidSchema, SalesSearchSchema } from './sales';
import { DomainError } from './errors';
import {
  StockCountSchema,
  StockRecordSchema,
  StockSearchSchema,
  StockMovementsSchema,
} from './stock';
import {
  ApplyImportSchema,
  ProductSearchSchema,
  ProductSaveSchema,
  SetActiveSchema,
  SaveDraftSchema,
} from './catalog';

export const RequestSchemas = {
  'auth.status': z.null(),
  'auth.bootstrap': BootstrapSchema,
  'auth.login': LoginSchema,
  'auth.logout': z.null(),
  'auth.changePassword': ChangePasswordSchema,
  'users.list': z.null(),
  'users.save': UserSaveSchema,
  'checkout.cancelDraft': z.strictObject({ expectedRevision: z.number().int().min(0) }),
  'sales.complete': CheckoutSchema,
  'sales.findByCheckoutKey': z.strictObject({ checkoutKey: z.uuid() }),
  'sales.detail': z.strictObject({ saleId: z.uuid() }),
  'sales.list': SalesSearchSchema,
  'sales.previewVoid': z.strictObject({ saleId: z.uuid() }),
  'sales.void': VoidSchema,
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
  'stock.get': z.strictObject({ productId: z.uuid() }),
  'stock.operation': z.strictObject({ operationKey: z.uuid() }),
  'stock.search': StockSearchSchema,
  'stock.opening': StockCountSchema,
  'stock.count': StockCountSchema,
  'stock.record': StockRecordSchema,
  'stock.listLow': z.strictObject({
    limit: z.number().int().min(1).max(100),
    cursor: z.string().max(1200).optional(),
  }),
  'stock.movements': StockMovementsSchema,
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
