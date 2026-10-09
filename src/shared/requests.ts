import { z } from 'zod';
import { ControlRequestSchema } from './control';
import { LocationInventorySchema } from './locations';
import {
  BootstrapSchema,
  LoginSchema,
  UserSaveSchema,
  ChangePasswordSchema,
  UnlockUserSchema,
} from './auth';
import { CheckoutSchema, SaleQuoteSchema, VoidSchema, SalesSearchSchema } from './sales';
import { DomainError } from './errors';
import { ComparisonRequestSchema, MonthlyRequestSchema } from './reports';
import { NotificationMarkReadSchema } from './notifications';
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
  TaxonomySaveSchema,
  SetActiveSchema,
  SaveDraftSchema,
  ProductLabelListSchema,
  ProductLabelCreateSchema,
  ProductLabelPrintSchema,
} from './catalog';
import { ReceiptCreateSchema, ReceiptListSchema, ReceiptMarkPrintedSchema } from './receipts';
import {
  PurchaseDraftSaveSchema,
  PurchaseReceiveSchema,
  PurchaseSearchSchema,
  PurchaseVoidSchema,
  SupplierSaveSchema,
  SupplierSearchSchema,
  SupplierSetActiveSchema,
} from './purchases';
import { CostReferenceSchema } from './costs';
import { ReturnConfirmSchema } from './returns';
import { LotReconcileSchema, LotSetBlockedSchema } from './lots';
import { PriceConfirmSchema, PricePreviewSchema } from './pricing';
import { PromotionSaveSchema } from './promotions';
import { SupplierPaymentInputSchema } from './supplier-accounts';
import {
  CustomerCollectionInputSchema,
  CustomerCreditSchema,
  CustomerSaveSchema,
  CustomerSearchSchema,
  CustomerSetActiveSchema,
} from './customers';
import {
  LocationSaveSchema,
  TerminalLocationSchema,
  TransferCancelSchema,
  TransferDispatchSchema,
  TransferListSchema,
  TransferReceiveSchema,
} from './locations';
import { LocationSummaryRequestSchema } from './location-reports';

export const RequestSchemas = {
  'control.execute': ControlRequestSchema,
  'dashboard.monthly': MonthlyRequestSchema,
  'dashboard.compare': ComparisonRequestSchema,
  'notifications.list': z.null(),
  'notifications.markRead': NotificationMarkReadSchema,
  'auth.status': z.null(),
  'auth.bootstrap': BootstrapSchema,
  'auth.login': LoginSchema,
  'auth.logout': z.null(),
  'auth.changePassword': ChangePasswordSchema,
  'auth.unlockUser': UnlockUserSchema,
  'users.list': z.null(),
  'users.save': UserSaveSchema,
  'checkout.cancelDraft': z.strictObject({
    expectedRevision: z.number().int().min(0),
  }),
  'sales.quote': SaleQuoteSchema,
  'sales.complete': CheckoutSchema,
  'sales.findByCheckoutKey': z.strictObject({ checkoutKey: z.uuid() }),
  'sales.detail': z.strictObject({ saleId: z.uuid() }),
  'sales.list': SalesSearchSchema,
  'sales.previewVoid': z.strictObject({ saleId: z.uuid() }),
  'sales.void': VoidSchema,
  'sales.previewReturn': z.strictObject({ saleId: z.uuid() }),
  'sales.return': ReturnConfirmSchema,
  'sales.returns': z.strictObject({ saleId: z.uuid() }),
  'system.health': z.null(),
  'system.reconnect': z.null(),
  'products.search': ProductSearchSchema,
  'products.get': z.strictObject({ productId: z.uuid() }),
  'products.save': ProductSaveSchema,
  'products.setActive': SetActiveSchema,
  'products.taxonomy': z.strictObject({
    includeInactive: z.boolean().default(false),
  }),
  'products.saveCategory': TaxonomySaveSchema,
  'products.saveBrand': TaxonomySaveSchema,
  'products.findByBarcode': z.strictObject({
    barcode: z.string().trim().min(1).max(64),
  }),
  'products.proposeInternalBarcode': z.null(),
  'products.labels': ProductLabelListSchema,
  'products.createLabel': ProductLabelCreateSchema,
  'products.markLabelPrinted': ProductLabelPrintSchema,
  'products.previewImport': z.null(),
  'products.applyImport': ApplyImportSchema,
  'pricing.preview': PricePreviewSchema,
  'pricing.confirm': PriceConfirmSchema,
  'promotions.list': z.null(),
  'promotions.get': z.strictObject({ promotionId: z.uuid() }),
  'promotions.save': PromotionSaveSchema,
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
  'lots.status': z.strictObject({ productId: z.uuid() }),
  'lots.enable': z.strictObject({ productId: z.uuid() }),
  'lots.reconcile': LotReconcileSchema,
  'lots.setBlocked': LotSetBlockedSchema,
  'receipts.create': ReceiptCreateSchema,
  'receipts.list': ReceiptListSchema,
  'receipts.markPrinted': ReceiptMarkPrintedSchema,
  'suppliers.search': SupplierSearchSchema,
  'suppliers.get': z.strictObject({ supplierId: z.uuid() }),
  'suppliers.save': SupplierSaveSchema,
  'suppliers.setActive': SupplierSetActiveSchema,
  'supplierAccounts.detail': z.strictObject({ supplierId: z.uuid() }),
  'supplierAccounts.pay': SupplierPaymentInputSchema,
  'customers.search': CustomerSearchSchema,
  'customers.get': z.strictObject({ customerId: z.uuid() }),
  'customers.save': CustomerSaveSchema,
  'customers.setCredit': CustomerCreditSchema,
  'customers.setActive': CustomerSetActiveSchema,
  'customerAccounts.detail': z.strictObject({ customerId: z.uuid() }),
  'customerAccounts.collect': CustomerCollectionInputSchema,
  'purchases.getDraft': z.null(),
  'purchases.saveDraft': PurchaseDraftSaveSchema,
  'purchases.cancelDraft': z.strictObject({
    expectedRevision: z.number().int().min(0),
  }),
  'purchases.receive': PurchaseReceiveSchema,
  'purchases.findByReceiptKey': z.strictObject({ receiptKey: z.uuid() }),
  'purchases.detail': z.strictObject({ purchaseId: z.uuid() }),
  'purchases.list': PurchaseSearchSchema,
  'purchases.previewVoid': z.strictObject({ purchaseId: z.uuid() }),
  'purchases.void': PurchaseVoidSchema,
  'purchases.lastCost': z.strictObject({ productId: z.uuid() }),
  'costs.get': z.strictObject({ productId: z.uuid() }),
  'costs.setReference': CostReferenceSchema,
  'locations.inventory': LocationInventorySchema,
  'locations.list': z.strictObject({}),
  'locations.save': LocationSaveSchema,
  'locations.assignTerminal': TerminalLocationSchema,
  'locations.summary': LocationSummaryRequestSchema,
  'transfers.list': TransferListSchema,
  'transfers.detail': z.strictObject({ transferId: z.uuid() }),
  'transfers.dispatch': TransferDispatchSchema,
  'transfers.receive': TransferReceiveSchema,
  'transfers.cancel': TransferCancelSchema,
} as const;
export type Operation = keyof typeof RequestSchemas;
export function validateRequest(input: unknown): {
  operation: Operation;
  payload: unknown;
} {
  const envelope = z.strictObject({ operation: z.string(), payload: z.unknown() }).parse(input);
  if (!Object.hasOwn(RequestSchemas, envelope.operation))
    throw new DomainError('VALIDATION', 'La operación no está disponible.');
  const operation = envelope.operation as Operation;
  return {
    operation,
    payload: RequestSchemas[operation].parse(envelope.payload),
  };
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
