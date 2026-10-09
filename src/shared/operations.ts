import { z } from 'zod';
import { FeatureChangeInputSchema } from './features';
const id = z.uuid(),
  money = z.number().int().min(0).max(9999999999),
  empty = z.strictObject({});
const page = {
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(2000).optional(),
};
const range = { fromDate: z.iso.date(), toDate: z.iso.date() };
const exportSchema = z
  .strictObject({
    ...range,
    limit: z.number().int().min(1).max(10000).default(10000),
    offset: z.number().int().min(0).max(1000000).default(0),
  })
  .refine(
    (v) =>
      v.fromDate <= v.toDate && Date.parse(v.toDate) - Date.parse(v.fromDate) <= 366 * 86400000,
    { message: 'El rango debe ser de hasta 366 días.' },
  );
export const OperationSchemas = {
  'settings.get': empty,
  'settings.features.get': empty,
  'settings.features.save': FeatureChangeInputSchema,
  'settings.save': z
    .strictObject({
      expectedRevision: z.number().int().positive(),
      businessName: z.string().trim().min(1).max(120),
      currency: z.literal('ARS'),
      paymentMethods: z
        .array(z.enum(['CASH', 'DEBIT', 'CREDIT', 'TRANSFER', 'OTHER']))
        .min(1)
        .max(5),
    })
    .refine((v) => new Set(v.paymentMethods).size === v.paymentMethods.length),
  'terminals.active': empty,
  'terminals.list': empty,
  'terminals.save': z
    .strictObject({
      id: id.optional(),
      expectedRevision: z.number().int().positive().optional(),
      name: z.string().trim().min(1).max(100),
      active: z.boolean(),
    })
    .refine((v) => Boolean(v.id) === Boolean(v.expectedRevision)),
  'cash.current': z.strictObject({ terminalId: id }),
  'cash.open': z.strictObject({ terminalId: id, openingCashCents: money, operationKey: id }),
  'cash.close': z.strictObject({ shiftId: id, countedCashCents: money, operationKey: id }),
  'cash.movement': z.strictObject({
    shiftId: id,
    kind: z.enum(['IN', 'OUT']),
    amountCents: money.min(1),
    reason: z.string().trim().min(3).max(240),
    operationKey: id,
  }),
  'shifts.details': z.strictObject({ shiftId: id }),
  'shifts.list': z.strictObject({
    ...page,
    fromDate: z.iso.date().optional(),
    toDate: z.iso.date().optional(),
    terminalId: id.optional(),
    status: z.enum(['OPEN', 'CLOSED', 'ALL']).default('ALL'),
  }),
  'audit.list': z.strictObject({
    ...page,
    fromDate: z.iso.date().optional(),
    toDate: z.iso.date().optional(),
    actorUserId: id.optional(),
    operation: z.string().min(1).max(100).optional(),
  }),
  'exports.products': exportSchema,
  'exports.sales': exportSchema,
  'exports.stock': exportSchema,
  'exports.sale-items': exportSchema,
  'exports.shifts': exportSchema,
  'exports.purchases': exportSchema,
} satisfies Record<string, z.ZodType>;
export type OperationName = keyof typeof OperationSchemas;
