import { z } from 'zod';
export const excelTitles = {
  users: 'Usuarios',
  products: 'Productos',
  stock: 'Stock',
  customers: 'Clientes',
  suppliers: 'Proveedores',
  promotions: 'Promociones',
  sales: 'Ventas',
  purchases: 'Compras',
  shifts: 'Turnos',
  audit: 'Actividad',
  inventory: 'Existencias por ubicación',
  transfers: 'Traslados',
  dashboard: 'Resumen mensual',
  payments: 'Medios de pago',
  ranking: 'Productos más vendidos',
  lowStock: 'Reposición',
  profitability: 'Margen bruto',
  locations: 'Ubicaciones',
  comparison: 'Comparación',
  customerAccount: 'Cuenta del cliente',
  supplierAccount: 'Cuenta del proveedor',
  movements: 'Movimientos de stock',
  saleDetail: 'Detalle de venta',
  purchaseDetail: 'Detalle de compra',
} as const;
export type ExcelDataset = keyof typeof excelTitles;
export const excelFilterKeys: Record<ExcelDataset, string[]> = {
  users: ['query', 'status', 'role'],
  products: ['query', 'status', 'categoryId', 'brandId'],
  stock: ['query', 'filter', 'categoryId', 'brandId', 'includeInactive'],
  customers: ['query', 'activeOnly'],
  suppliers: ['query', 'status'],
  promotions: ['query', 'view'],
  sales: ['fromDate', 'toDate', 'status'],
  purchases: ['fromDate', 'toDate', 'status'],
  shifts: ['fromDate', 'toDate', 'status', 'terminalId'],
  audit: ['fromDate', 'toDate', 'operation'],
  inventory: ['locationId', 'query'],
  transfers: ['status'],
  dashboard: ['month'],
  payments: ['month'],
  ranking: ['month', 'rank'],
  lowStock: ['month'],
  profitability: ['month'],
  locations: ['month'],
  comparison: ['preset', 'from', 'to'],
  customerAccount: ['customerId'],
  supplierAccount: ['supplierId'],
  movements: ['productId', 'fromDate', 'toDate'],
  saleDetail: ['saleId'],
  purchaseDetail: ['purchaseId'],
};
export const excelMultipleKeys = {
  categoryId: 'categoryIds',
  brandId: 'brandIds',
  status: 'statuses',
  filter: 'stockFilters',
  view: 'views',
  role: 'roles',
  terminalId: 'terminalIds',
  locationId: 'locationIds',
  operation: 'operations',
} as const;
export const ExcelFiltersSchema = z.strictObject({
  categoryIds: z.array(z.uuid()).min(1).max(100).optional(),
  brandIds: z.array(z.uuid()).min(1).max(100).optional(),
  statuses: z.array(z.string().min(1).max(30)).min(1).max(10).optional(),
  stockFilters: z
    .array(z.enum(['UNKNOWN', 'OUT', 'LOW', 'NEGATIVE', 'OK', 'DISABLED', 'SHORTAGES']))
    .min(1)
    .max(8)
    .optional(),
  views: z
    .array(z.enum(['CURRENT', 'SCHEDULED', 'OTHER']))
    .min(1)
    .max(3)
    .optional(),
  roles: z
    .array(z.enum(['ADMIN', 'OWNER', 'SUPERVISOR', 'SELLER']))
    .min(1)
    .max(4)
    .optional(),
  terminalIds: z.array(z.uuid()).min(1).max(100).optional(),
  locationIds: z.array(z.uuid()).min(1).max(100).optional(),
  operations: z.array(z.string().min(1).max(100)).min(1).max(30).optional(),
  role: z.enum(['ADMIN', 'OWNER', 'SUPERVISOR', 'SELLER']).optional(),
  query: z.string().trim().max(120).optional(),
  status: z.string().max(30).optional(),
  filter: z.string().max(30).optional(),
  view: z.enum(['ALL', 'CURRENT', 'SCHEDULED', 'OTHER']).optional(),
  categoryId: z.uuid().optional(),
  brandId: z.uuid().optional(),
  locationId: z.uuid().optional(),
  terminalId: z.uuid().optional(),
  productId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  supplierId: z.uuid().optional(),
  saleId: z.uuid().optional(),
  purchaseId: z.uuid().optional(),
  month: z
    .string()
    .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
    .optional(),
  fromDate: z.iso.date().optional(),
  toDate: z.iso.date().optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  preset: z.enum(['TODAY', 'WEEK', 'MONTH', 'CUSTOM']).optional(),
  rank: z.enum(['revenue', 'units', 'kilos']).optional(),
  activeOnly: z.boolean().optional(),
  includeInactive: z.boolean().optional(),
  operation: z.string().max(100).optional(),
});
export type ExcelFilters = z.infer<typeof ExcelFiltersSchema>;
export const ExcelRequestSchema = z
  .strictObject({
    dataset: z.enum(Object.keys(excelTitles) as [ExcelDataset, ...ExcelDataset[]]),
    filters: ExcelFiltersSchema.default({}),
  })
  .superRefine((v, c) => {
    for (const k of Object.keys(v.filters))
      if (
        !excelFilterKeys[v.dataset].includes(k) &&
        !(v.dataset === 'customers' && k === 'statuses') &&
        !Object.entries(excelMultipleKeys).some(
          ([single, multi]) => multi === k && excelFilterKeys[v.dataset].includes(single),
        )
      )
        c.addIssue({ code: 'custom', message: 'El filtro no corresponde al módulo.' });
    for (const [key, value] of Object.entries(v.filters))
      if (Array.isArray(value) && new Set(value).size !== value.length)
        c.addIssue({
          code: 'custom',
          message: 'No repitas opciones en un filtro.',
          path: ['filters', key],
        });
    const states: Record<string, string[]> = {
      products: ['ACTIVE', 'INACTIVE'],
      users: ['ACTIVE', 'INACTIVE'],
      customers: ['ACTIVE', 'INACTIVE'],
      suppliers: ['ACTIVE', 'INACTIVE'],
      sales: ['COMPLETED', 'VOIDED'],
      purchases: ['RECEIVED', 'VOIDED'],
      shifts: ['OPEN', 'CLOSED'],
      transfers: ['IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
    };
    if (v.filters.statuses?.some((status) => !states[v.dataset]?.includes(status)))
      c.addIssue({ code: 'custom', message: 'El estado no corresponde al módulo.' });
    for (const [single, multiple] of Object.entries(excelMultipleKeys))
      if (single in v.filters && multiple in v.filters)
        c.addIssue({ code: 'custom', message: 'Usá una sola selección por filtro.' });
    if (v.filters.fromDate && v.filters.toDate && v.filters.fromDate > v.filters.toDate)
      c.addIssue({ code: 'custom', message: 'Revisá las fechas.' });
  });
