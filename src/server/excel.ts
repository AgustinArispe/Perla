import ExcelJS from 'exceljs';
import type Database from 'better-sqlite3';
import {
  ExcelRequestSchema,
  ExcelPreviewRequestSchema,
  excelTitles,
  excelMultipleKeys,
  type ExcelFilters,
  type ExcelDataset,
} from '../shared/excel';
import { DomainError } from '../shared/errors';
import { normalizeSearch } from '../domain/values';
import { MonthlyReports } from '../worker/reports/queries';
import { FeatureService } from '../worker/features/service';
import { previewExportRows, selectExportRows } from './export-selection';
import { brandWorkbook, styleExcelSheet } from './excel-brand';

type Row = Record<string, unknown>;
type Call = (operation: string, payload: unknown) => unknown;
const MAX = 50000;
const labels: Record<string, string> = {
  ADMIN: 'Administrador',
  OWNER: 'Jefe',
  SUPERVISOR: 'Supervisor',
  SELLER: 'Vendedor',
  ALL: 'Todos',
  DRAFT: 'Borrador',
  CURRENT: 'Vigentes',
  SCHEDULED: 'Programadas',
  UNKNOWN: 'Sin conteo',
  OUT: 'Sin stock',
  EMPTY: 'Sin stock',
  LOW: 'Bajo mínimo',
  NEGATIVE: 'Stock negativo',
  OK: 'Disponible',
  DISABLED: 'Sin control',
  SHORTAGES: 'Para reponer',
  MONTH: 'Mes',
  TODAY: 'Hoy',
  WEEK: 'Semana',
  CUSTOM: 'Rango personalizado',
  revenue: 'Facturación neta',
  units: 'Unidades',
  kilos: 'Kilos',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  COMPLETED: 'Completada',
  VOIDED: 'Anulada',
  RECEIVED: 'Recibida',
  IN_TRANSIT: 'En tránsito',
  CANCELLED: 'Cancelado',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
  UNIT: 'Unidad',
  KG: 'Kilogramo',
  CASH: 'Efectivo',
  DEBIT: 'Débito',
  CREDIT: 'Crédito',
  TRANSFER: 'Transferencia',
  OTHER: 'Otro',
  PAID: 'Saldada',
  REFERENCE: 'Referencia',
  WEIGHTED: 'Promedio ponderado',
  OPENING: 'Stock inicial',
  RECEIPT: 'Ingreso',
  WASTE: 'Merma',
  ADJUSTMENT: 'Ajuste',
  SALE: 'Venta',
  VOID: 'Anulación',
  PAUSED: 'Pausada',
  PERCENT: 'Porcentaje',
  X_FOR_Y: 'Llevá X, pagá Y',
  QUANTITY_PRICE: 'Precio por cantidad',
  COMBO_PRICE: 'Combo',
};
interface Sheet {
  name: string;
  columns: string[];
  rows: Row[];
}
const monthNow = () =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());
function records(value: unknown): Row[] {
  return value as Row[];
}
function pageAll(call: Call, op: string, filters: Row) {
  let cursor: string | null = null;
  const rows: Row[] = [];
  do {
    const page = call(op, { ...filters, limit: 100, ...(cursor ? { cursor } : {}) }) as {
      items: Row[];
      nextCursor: string | null;
    };
    rows.push(...page.items);
    if (rows.length > MAX)
      throw new DomainError(
        'VALIDATION',
        'Hay más de 50.000 filas. Acotá los filtros para exportar.',
      );
    cursor = page.nextCursor;
  } while (cursor);
  return rows;
}
const productColumns = [
  'name|Producto',
  'sku|Código interno',
  'barcode|Código de barras',
  'internalBarcode|Código generado',
  'category|Categoría',
  'brand|Marca',
  'priceCents|Precio (ARS)|money',
  'saleUnit|Venta por',
  'active|Estado',
];
const stockColumns = [
  'name|Producto',
  'sku|Código interno',
  'barcode|Código de barras',
  'quantityBase|Existencia|quantity',
  'unit|Unidad',
  'minStockBase|Mínimo|quantity',
  'state|Estado',
];
const saleColumns = [
  'number|Venta',
  'businessDate|Fecha|date',
  'status|Estado',
  'subtotalCents|Subtotal (ARS)|money',
  'discountCents|Descuento (ARS)|money',
  'totalCents|Total (ARS)|money',
];
function collect(
  db: Database.Database,
  dataset: ExcelDataset,
  f: ExcelFilters,
  call: Call,
): Sheet[] {
  const sheet = (name: string, columns: string[], rows: Row[]): Sheet => ({ name, columns, rows });
  const range = {
    ...(f.fromDate ? { fromDate: f.fromDate } : {}),
    ...(f.toDate ? { toDate: f.toDate } : {}),
  };
  if (dataset === 'users') {
    const rows = records(call('users.list', null)).filter(
      (row) =>
        (!f.role || row.role === f.role) &&
        (!f.status || f.status === 'ALL' || Boolean(row.active) === (f.status === 'ACTIVE')) &&
        normalizeSearch(`${row.name} ${row.username}`).includes(normalizeSearch(f.query ?? '')),
    );
    if (f.status && !['ALL', 'ACTIVE', 'INACTIVE'].includes(f.status))
      throw new DomainError('VALIDATION', 'Estado de usuario inválido.');
    return [
      sheet(
        'Usuarios',
        ['name|Nombre', 'username|Usuario', 'role|Rol', 'active|Estado', 'createdAt|Creado|date'],
        rows,
      ),
    ];
  }
  if (dataset === 'products')
    return [
      sheet(
        'Productos',
        productColumns,
        pageAll(call, 'products.search', {
          query: f.query ?? '',
          status: f.status ?? 'ALL',
          activeOnly: false,
          ...(f.categoryId ? { categoryId: f.categoryId } : {}),
          ...(f.brandId ? { brandId: f.brandId } : {}),
        }),
      ),
    ];
  if (dataset === 'stock')
    return [
      sheet(
        'Stock',
        stockColumns,
        pageAll(call, 'stock.search', {
          query: f.query ?? '',
          filter: f.filter ?? 'ALL',
          includeInactive: f.includeInactive ?? false,
          ...(f.categoryId ? { categoryId: f.categoryId } : {}),
          ...(f.brandId ? { brandId: f.brandId } : {}),
        }),
      ),
    ];
  if (dataset === 'suppliers')
    return [
      sheet(
        'Proveedores',
        [
          'name|Proveedor',
          'phone|Teléfono',
          'email|Email',
          'active|Estado',
          'balanceCents|Saldo pendiente (ARS)|money',
        ],
        pageAll(call, 'suppliers.search', { query: f.query ?? '', status: f.status ?? 'ALL' }),
      ),
    ];
  if (dataset === 'customers') {
    call('customers.search', { query: f.query ?? '', activeOnly: f.activeOnly ?? true, limit: 1 });
    const pattern = `%${(f.query ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()}%`;
    const ids = db
      .prepare(
        `SELECT id FROM customers WHERE ${f.statuses?.length === 1 && f.statuses[0] === 'INACTIVE' ? 'active=0 AND ' : (f.activeOnly ?? true) ? 'active=1 AND ' : ''}(search_name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY name,id LIMIT ?`,
      )
      .all(pattern, pattern, pattern, MAX + 1) as { id: string }[];
    if (ids.length > MAX)
      throw new DomainError(
        'VALIDATION',
        'Hay más de 50.000 clientes. Acotá la búsqueda para exportar.',
      );
    return [
      sheet(
        'Clientes',
        [
          'name|Cliente',
          'phone|Teléfono',
          'email|Email',
          'active|Estado',
          'creditEnabled|Cuenta habilitada',
          'creditLimitCents|Límite (ARS)|money',
          'balanceCents|Saldo pendiente (ARS)|money',
          'availableCents|Disponible (ARS)|money',
        ],
        ids.map((row) => call('customers.get', { customerId: row.id }) as Row),
      ),
    ];
  }
  if (dataset === 'sales')
    return [
      sheet(
        'Ventas',
        saleColumns,
        pageAll(call, 'sales.list', { ...range, status: f.status ?? 'ALL' }),
      ),
    ];
  if (dataset === 'purchases')
    return [
      sheet(
        'Compras',
        [
          'number|Compra',
          'businessDate|Fecha|date',
          'supplierName|Proveedor',
          'status|Estado',
          'totalCents|Total (ARS)|money',
          'actorName|Registrada por',
        ],
        pageAll(call, 'purchases.list', { ...range, status: f.status ?? 'ALL' }),
      ),
    ];
  if (dataset === 'shifts')
    return [
      sheet(
        'Turnos',
        [
          'openedAt|Apertura|date',
          'closedAt|Cierre|date',
          'terminalName|Caja',
          'status|Estado',
          'openingCashCents|Inicial (ARS)|money',
          'expectedCashCents|Esperado (ARS)|money',
          'countedCashCents|Contado (ARS)|money',
          'differenceCents|Diferencia (ARS)|money',
        ],
        pageAll(call, 'shifts.list', {
          ...range,
          status: f.status ?? 'ALL',
          ...(f.terminalId ? { terminalId: f.terminalId } : {}),
        }).map((row) => ({
          ...row,
          terminalName:
            (
              db.prepare('SELECT name FROM terminals WHERE id=?').get(row.terminalId) as
                { name: string } | undefined
            )?.name ?? '',
        })),
      ),
    ];
  if (dataset === 'audit')
    return [
      sheet(
        'Actividad',
        ['createdAt|Fecha|date', 'actorName|Usuario', 'operation|Operación', 'entityId|Referencia'],
        pageAll(call, 'audit.list', {
          ...range,
          ...(f.operation ? { operation: f.operation } : {}),
        }),
      ),
    ];
  if (dataset === 'inventory') {
    if (!f.locationId) throw new DomainError('VALIDATION', 'Elegí una ubicación.');
    const rows: Row[] = [];
    let offset = 0;
    let total: number;
    do {
      const page = call('locations.inventory', {
        locationId: f.locationId,
        query: f.query ?? '',
        limit: 100,
        offset,
      }) as { items: Row[]; total: number };
      total = page.total;
      if (total > MAX)
        throw new DomainError('VALIDATION', 'Acotá la búsqueda a menos de 50.000 artículos.');
      rows.push(...page.items);
      offset += 100;
    } while (offset < total);
    return [
      sheet(
        'Existencias',
        stockColumns.filter((c) => !c.startsWith('minStock') && !c.startsWith('state')),
        rows,
      ),
    ];
  }
  if (dataset === 'transfers') {
    // Authorize using the same business rules as the screen; read all matching transfers.
    call('transfers.list', { status: f.status ?? 'ALL', limit: 1 });
    const states = f.statuses ?? (f.status && f.status !== 'ALL' ? [f.status] : []);
    const ids = db
      .prepare(
        `SELECT id FROM stock_transfers ${states.length ? `WHERE status IN (${states.map(() => '?').join(',')})` : ''} ORDER BY number DESC LIMIT ?`,
      )
      .all(...states, MAX + 1) as { id: string }[];
    const transfers = ids
      .map((row) => call('transfers.detail', { transferId: row.id }) as Row)
      .filter((row) => matchesSelections(db, f, row));
    return [
      sheet(
        'Traslados',
        [
          'number|Traslado',
          'fromLocationName|Origen',
          'toLocationName|Destino',
          'status|Estado',
          'dispatchedAt|Salida|date',
          'receivedAt|Recepción|date',
          'dispatchedByName|Despachado por',
          'note|Nota',
        ],
        transfers,
      ),
      sheet(
        'Artículos trasladados',
        [
          'number|Traslado',
          'fromLocationName|Origen',
          'toLocationName|Destino',
          'productName|Producto',
          'sku|Código interno',
          'unit|Unidad',
          'dispatchedBase|Enviado|quantity',
          'receivedBase|Recibido|quantity',
          'differenceBase|Diferencia|quantity',
        ],
        transfers.flatMap((t) =>
          records(t.items).map((item) => ({
            ...item,
            number: t.number,
            fromLocationName: t.fromLocationName,
            toLocationName: t.toLocationName,
          })),
        ),
      ),
    ];
  }
  if (dataset === 'promotions') {
    const now = Date.now();
    const rows = records(call('promotions.list', null))
      .map((row) => ({ ...row, ...(row.input as Row) }))
      .filter((row) => {
        const current =
          row.status === 'ACTIVE' &&
          (!row.startsAt || Date.parse(String(row.startsAt)) <= now) &&
          (!row.endsAt || Date.parse(String(row.endsAt)) > now);
        const scheduled =
          row.status === 'ACTIVE' && row.startsAt && Date.parse(String(row.startsAt)) > now;
        const view = current ? 'CURRENT' : scheduled ? 'SCHEDULED' : 'OTHER';
        return (
          (!f.view || f.view === 'ALL' || f.view === view) &&
          normalizeSearch(String(row.name)).includes(normalizeSearch(f.query ?? ''))
        );
      });
    const targetName = (table: string, id: string) =>
      (db.prepare(`SELECT name FROM ${table} WHERE id=?`).get(id) as { name: string } | undefined)
        ?.name ?? id;
    return [
      sheet(
        'Promociones',
        [
          'name|Promoción',
          'status|Estado',
          'type|Tipo',
          'startsAt|Inicio|date',
          'endsAt|Fin|date',
          'priority|Prioridad',
          'basisPoints|Descuento|percent',
          'buyQuantity|Llevá',
          'payQuantity|Pagá',
          'specialPriceCents|Precio especial (ARS)|money',
          'comboPriceCents|Precio combo (ARS)|money',
          'products|Productos',
          'categories|Categorías',
          'brands|Marcas',
        ],
        rows.map((row) => ({
          ...row,
          products: (row.productIds as string[]).map((id) => targetName('products', id)).join(', '),
          categories: (row.categoryIds as string[])
            .map((id) => targetName('product_categories', id))
            .join(', '),
          brands: (row.brandIds as string[])
            .map((id) => targetName('product_brands', id))
            .join(', '),
        })),
      ),
    ];
  }
  if (dataset === 'customerAccount') {
    const a = call('customerAccounts.detail', { customerId: f.customerId }) as Row;
    return [
      sheet(
        'Resumen',
        [
          'name|Cliente',
          'balanceCents|Saldo pendiente (ARS)|money',
          'availableCents|Disponible (ARS)|money',
          'creditCents|Crédito a favor (ARS)|money',
        ],
        [{ ...a, ...(a.customer as Row) }],
      ),
      sheet(
        'Ventas a cuenta',
        [
          'saleNumber|Venta',
          'businessDate|Fecha|date',
          'status|Estado',
          'originalCents|Original (ARS)|money',
          'balanceCents|Pendiente (ARS)|money',
        ],
        records(a.receivables),
      ),
      sheet(
        'Cobros',
        [
          'businessDate|Fecha|date',
          'method|Medio',
          'amountCents|Importe (ARS)|money',
          'actorName|Registrado por',
          'note|Nota',
        ],
        records(a.collections),
      ),
      sheet(
        'Créditos',
        ['saleNumber|Venta', 'amountCents|Importe (ARS)|money', 'reason|Motivo'],
        records(a.credits),
      ),
    ];
  }
  if (dataset === 'supplierAccount') {
    const a = call('supplierAccounts.detail', { supplierId: f.supplierId }) as Row;
    return [
      sheet(
        'Resumen',
        [
          'supplierName|Proveedor',
          'balanceCents|Saldo (ARS)|money',
          'creditCents|Crédito a favor (ARS)|money',
        ],
        [a],
      ),
      sheet(
        'Compras pendientes',
        [
          'purchaseNumber|Compra',
          'businessDate|Fecha|date',
          'status|Estado',
          'originalCents|Original (ARS)|money',
          'balanceCents|Pendiente (ARS)|money',
        ],
        records(a.payables),
      ),
      sheet(
        'Pagos',
        [
          'businessDate|Fecha|date',
          'method|Medio',
          'amountCents|Importe (ARS)|money',
          'actorName|Registrado por',
          'note|Nota',
        ],
        records(a.payments),
      ),
      sheet(
        'Créditos',
        ['purchaseNumber|Compra', 'amountCents|Importe (ARS)|money', 'reason|Motivo'],
        records(a.credits),
      ),
    ];
  }
  if (dataset === 'movements') {
    const product = call('products.get', { productId: f.productId }) as Row;
    return [
      sheet(
        'Movimientos',
        [
          'productName|Producto',
          'businessDate|Fecha|date',
          'kind|Tipo',
          'deltaBase|Cambio|quantity',
          'balanceAfterBase|Saldo posterior|quantity',
          'unit|Unidad',
          'reason|Motivo',
        ],
        pageAll(call, 'stock.movements', { productId: f.productId, ...range }).map((row) => ({
          ...row,
          productName: product.name,
          unit: product.saleUnit,
        })),
      ),
    ];
  }
  if (dataset === 'saleDetail' || dataset === 'purchaseDetail') {
    const a = call(
      dataset === 'saleDetail' ? 'sales.detail' : 'purchases.detail',
      dataset === 'saleDetail' ? { saleId: f.saleId } : { purchaseId: f.purchaseId },
    ) as Row;
    return [
      sheet(
        'Resumen',
        dataset === 'saleDetail'
          ? saleColumns
          : [
              'number|Compra',
              'businessDate|Fecha|date',
              'supplierName|Proveedor',
              'status|Estado',
              'totalCents|Total (ARS)|money',
            ],
        [a],
      ),
      sheet(
        'Artículos',
        [
          'name|Producto',
          'sku|Código interno',
          'barcode|Código de barras',
          'unit|Unidad',
          'quantityBase|Cantidad|quantity',
          ...(dataset === 'saleDetail'
            ? [
                'unitPriceCents|Precio unitario (ARS)|money',
                'discountCents|Descuento (ARS)|money',
                'netCents|Importe (ARS)|money',
              ]
            : ['unitCostCents|Costo unitario (ARS)|money', 'subtotalCents|Importe (ARS)|money']),
        ],
        records(a.items).map((row) => ({
          ...row,
          name: row.name ?? row.productName,
          unit: row.unit ?? row.saleUnit,
        })),
      ),
    ];
  }
  if (dataset === 'comparison') {
    const report = call('dashboard.compare', {
      preset: f.preset ?? 'MONTH',
      ...(f.from ? { from: f.from } : {}),
      ...(f.to ? { to: f.to } : {}),
    }) as { current: Row; previous: Row; period: Row };
    return [
      sheet(
        'Comparación',
        [
          'period|Período',
          'from|Desde|date',
          'to|Hasta|date',
          'netCents|Vendido neto (ARS)|money',
          'saleCount|Ventas',
          'averageCents|Ticket promedio (ARS)|money',
        ],
        [
          { ...report.current, period: 'Actual', from: report.period.from, to: report.period.to },
          {
            ...report.previous,
            period: 'Anterior',
            from: report.period.previousFrom,
            to: report.period.previousTo,
          },
        ],
      ),
    ];
  }
  const month = f.month ?? monthNow();
  if (dataset === 'locations')
    return [
      sheet(
        'Ubicaciones',
        [
          'name|Ubicación',
          'quantityUnits|Unidades',
          'quantityGrams|Kilos|grams',
          'incomingTransfers|Por recibir',
          'outgoingTransfers|Envíos pendientes',
          'lowStockCount|Bajo mínimo',
          'netCents|Vendido neto (ARS)|money',
          'saleCount|Ventas',
        ],
        records((call('locations.summary', { month }) as Row).locations),
      ),
    ];
  call('dashboard.monthly', { month });
  const report = new MonthlyReports(db).month(month, new Date(), true);
  const summary = sheet(
    'Resumen',
    [
      'grossCents|Venta bruta (ARS)|money',
      'discountCents|Descuentos (ARS)|money',
      'netCents|Vendido neto (ARS)|money',
      'saleCount|Ventas',
      'averageCents|Ticket promedio (ARS)|money',
      'voidedCount|Ventas anuladas',
      'voidedCents|Anuladas (ARS)|money',
    ],
    [report.totals as unknown as Row],
  );
  const payments = sheet(
    'Medios de pago',
    [
      'method|Medio',
      'amountCents|Importe (ARS)|money',
      'saleCount|Ventas',
      'shareBasisPoints|Participación|percent',
    ],
    report.payments,
  );
  const ranking = sheet(
    'Más vendidos',
    [
      'name|Producto',
      'unit|Unidad',
      'quantityBase|Cantidad|quantity',
      'netCents|Vendido neto (ARS)|money',
    ],
    report.rankings[f.rank ?? 'revenue'].map((row) => ({ ...row })),
  );
  const low = sheet(
    'Reposición',
    stockColumns
      .filter((c) => !c.startsWith('sku') && !c.startsWith('barcode'))
      .concat('soldBase|Venta del mes|quantity'),
    report.lowStock,
  );
  const features = new FeatureService(db);
  const margin = () => {
    features.assertOperation('costs.get');
    return sheet(
      'Margen bruto',
      [
        'name|Producto',
        'netCents|Venta neta (ARS)|money',
        'coveredNetCents|Venta con costo (ARS)|money',
        'knownCostCents|Costo (ARS)|money',
        'grossMarginCents|Margen (ARS)|money',
        'coverageBasisPoints|Cobertura|percent',
      ],
      report.profitability.products.map((row) => ({ ...row })),
    );
  };
  if (dataset === 'payments') return [payments];
  if (dataset === 'ranking') return [ranking];
  if (dataset === 'lowStock') return [low];
  if (dataset === 'profitability') return [margin()];
  return [
    summary,
    sheet(
      'Ventas por día',
      ['date|Fecha|date', 'saleCount|Ventas', 'netCents|Vendido neto (ARS)|money'],
      report.daily,
    ),
    payments,
    ranking,
    low,
    ...(features.isEnabled('COSTS_MARGIN') ? [margin()] : []),
  ];
}

function matchesSelections(db: Database.Database, f: ExcelFilters, row: Row): boolean {
  if (f.statuses) {
    const state =
      typeof row.active === 'boolean' ? (row.active ? 'ACTIVE' : 'INACTIVE') : String(row.status);
    if (!f.statuses.includes(state)) return false;
  }
  if (
    f.stockFilters &&
    !f.stockFilters.some(
      (state) =>
        state === row.state ||
        (state === 'SHORTAGES' && ['OUT', 'LOW', 'NEGATIVE'].includes(String(row.state))),
    )
  )
    return false;
  if (f.roles && !f.roles.includes(row.role as NonNullable<ExcelFilters['roles']>[number]))
    return false;
  if (f.terminalIds && !f.terminalIds.includes(String(row.terminalId))) return false;
  if (f.operations && !f.operations.includes(String(row.operation))) return false;
  if (f.categoryIds || f.brandIds) {
    const product =
      'categoryId' in row
        ? row
        : (db
            .prepare(
              'SELECT category_id AS categoryId,brand_id AS brandId FROM products WHERE id=?',
            )
            .get(row.productId ?? row.id) as Row | undefined);
    if (f.categoryIds && !f.categoryIds.includes(String(product?.categoryId))) return false;
    if (f.brandIds && !f.brandIds.includes(String(product?.brandId))) return false;
  }
  if (f.views) {
    const now = Date.now(),
      current =
        row.status === 'ACTIVE' &&
        (!row.startsAt || Date.parse(String(row.startsAt)) <= now) &&
        (!row.endsAt || Date.parse(String(row.endsAt)) > now),
      scheduled = row.status === 'ACTIVE' && row.startsAt && Date.parse(String(row.startsAt)) > now;
    if (!f.views.includes(current ? 'CURRENT' : scheduled ? 'SCHEDULED' : 'OTHER')) return false;
  }
  return true;
}
function collectSelections(
  db: Database.Database,
  dataset: ExcelDataset,
  filters: ExcelFilters,
  call: Call,
): Sheet[] {
  const f = { ...filters };
  for (const [single, multiple] of Object.entries(excelMultipleKeys)) {
    const values = filters[multiple as keyof ExcelFilters];
    if (Array.isArray(values)) {
      delete f[single as keyof ExcelFilters];
      if (values.length === 1 && single !== 'filter')
        (f as Record<string, unknown>)[single] = values[0];
    }
  }
  if (dataset === 'customers' && !('activeOnly' in f))
    f.activeOnly = f.statuses?.length === 1 && f.statuses[0] === 'ACTIVE';
  const paged = new Set([
    'products.search',
    'stock.search',
    'suppliers.search',
    'sales.list',
    'purchases.list',
    'shifts.list',
    'audit.list',
  ]);
  const filteredCall: Call = (op, input) => {
    const result = call(op, input);
    if (paged.has(op)) {
      const page = result as { items: Row[] };
      return { ...page, items: page.items.filter((row) => matchesSelections(db, f, row)) };
    }
    return result;
  };
  if (dataset === 'inventory' && filters.locationIds) {
    let count = 0;
    const rows = filters.locationIds.flatMap((locationId) => {
      const local = { ...f, locationId };
      delete local.locationIds;
      const name = (
        db.prepare('SELECT name FROM locations WHERE id=?').get(locationId) as
          { name: string } | undefined
      )?.name;
      const collected = collect(db, dataset, local, call)[0]!.rows;
      count += collected.length;
      if (count > MAX)
        throw new DomainError(
          'VALIDATION',
          'Hay más de 50.000 filas. Acotá los filtros para exportar.',
        );
      return collected.map((row) => ({
        ...row,
        locationName: name,
      }));
    });
    return [
      {
        name: 'Existencias',
        columns: [
          'locationName|Ubicación',
          ...stockColumns.filter((c) => !c.startsWith('minStock') && !c.startsWith('state')),
        ],
        rows,
      },
    ];
  }
  const sheets = collect(db, dataset, f, filteredCall);
  if (['users', 'customers', 'promotions'].includes(dataset))
    for (const sheet of sheets)
      sheet.rows = sheet.rows.filter((row) => matchesSelections(db, f, row));
  return sheets;
}

export function previewExcel(db: Database.Database, raw: unknown, call: Call) {
  const input = ExcelPreviewRequestSchema.parse(raw);
  const sheets = db.transaction(() =>
    collectSelections(db, input.request.dataset, input.request.filters, call),
  )();
  return previewExportRows(sheets, input.request.dataset, input.page, input.initialIds);
}
export async function exportExcel(db: Database.Database, raw: unknown, call: Call) {
  const input = ExcelRequestSchema.parse(raw);
  const allSheets = db.transaction(() =>
    input.selectedIds
      ? [
          {
            name: 'Productos',
            columns: productColumns,
            rows: input.selectedIds.map((productId) => call('products.get', { productId }) as Row),
          },
        ]
      : collectSelections(db, input.dataset, input.filters, call),
  )();
  const sheets = selectExportRows(allSheets, input.dataset, input.selection);
  if (sheets.reduce((sum, s) => sum + s.rows.length, 0) > MAX)
    throw new DomainError(
      'VALIDATION',
      'Hay más de 50.000 filas. Acotá los filtros para exportar.',
    );
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Perla';
  workbook.created = new Date();
  const business = (call('settings.get', {}) as { businessName: string }).businessName;
  brandWorkbook(workbook, {
    title: excelTitles[input.dataset],
    business,
    scope: input.selectedIds
      ? 'Productos elegidos en el catálogo, entre búsquedas y páginas'
      : input.selection
        ? 'Filas elegidas dentro de los filtros aplicados'
        : 'Todos los resultados de los filtros aplicados',
    rows: sheets.reduce((n, s) => n + s.rows.length, 0),
  });
  for (const data of sheets) {
    const sheet = workbook.addWorksheet(data.name, { views: [{ state: 'frozen', ySplit: 1 }] });
    const columns = data.columns.map((text) => {
      const [key, label, type] = text.split('|');
      return { key: key!, label: label!, type };
    });
    sheet.columns = columns.map((c) => ({
      header: c.label,
      key: c.key,
      width:
        c.type === 'money'
          ? 22
          : c.type === 'date'
            ? 22
            : c.key === 'name' || c.key === 'productName'
              ? 42
              : 24,
    }));
    for (const row of data.rows)
      sheet.addRow(
        columns.map((c) => {
          const value = row[c.key];
          if (value === undefined || value === null) return null;
          if (c.type === 'money') return Number(value) / 100;
          if (c.type === 'percent') return Number(value) / 10000;
          if (c.type === 'grams') return Number(value) / 1000;
          if (c.type === 'quantity')
            return Number(value) / (row.unit === 'KG' || row.saleUnit === 'KG' ? 1000 : 1);
          if (c.type === 'date') {
            const text = String(value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return new Date(text + 'T12:00:00Z');
            return new Date(new Date(text).getTime() - 3 * 3600000);
          }
          if (typeof value === 'boolean')
            return c.key === 'active' ? (value ? 'Activo' : 'Inactivo') : value ? 'Sí' : 'No';
          if (typeof value === 'number') return value;
          return [
            'state',
            'status',
            'unit',
            'saleUnit',
            'type',
            'kind',
            'method',
            'costMethod',
            'role',
          ].includes(c.key)
            ? (labels[String(value)] ?? String(value))
            : String(value);
        }),
      );
    columns.forEach((c, i) => {
      sheet.getColumn(i + 1).numFmt =
        c.type === 'money'
          ? '"$" #,##0.00;[Red]-"$" #,##0.00'
          : c.type === 'percent'
            ? '0.00%'
            : c.type === 'quantity' || c.type === 'grams'
              ? '#,##0.###'
              : c.type === 'date'
                ? ['businessDate', 'date', 'from', 'to'].includes(c.key)
                  ? 'dd/mm/yyyy'
                  : 'dd/mm/yyyy hh:mm'
                : c.key.toLowerCase().includes('barcode')
                  ? '@'
                  : 'General';
    });
    sheet.getRow(1).height = 28;
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF223C49' } };
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, sheet.rowCount), column: columns.length },
    };
    sheet.eachRow((row, index) => {
      if (index > 1) {
        row.height = 22;
        if (index % 2 === 0)
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F4ED' } };
      }
    });
    styleExcelSheet(sheet);
  }
  const context = workbook.addWorksheet('Filtros');
  context.columns = [
    { header: 'Detalle', key: 'key', width: 30 },
    { header: 'Valor', key: 'value', width: 70 },
  ];
  context.addRow(['Negocio', business]);
  context.addRow(['Módulo', excelTitles[input.dataset]]);
  context.addRow([
    'Generado',
    new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
  ]);
  context.addRow(['Filas', sheets.reduce((n, s) => n + s.rows.length, 0)]);
  context.addRow([
    'Alcance',
    input.selection || input.selectedIds
      ? 'Solo filas seleccionadas'
      : 'Todos los resultados filtrados',
  ]);
  for (const [key, value] of Object.entries(input.filters)) {
    let text: unknown = value;
    if (Array.isArray(value)) {
      const single = Object.entries(excelMultipleKeys).find(([, multi]) => multi === key)?.[0];
      const table =
        single === 'categoryId'
          ? 'product_categories'
          : single === 'brandId'
            ? 'product_brands'
            : single === 'locationId'
              ? 'locations'
              : single === 'terminalId'
                ? 'terminals'
                : undefined;
      text = value
        .map((item) =>
          table
            ? ((
                db.prepare(`SELECT name FROM ${table} WHERE id=?`).get(item) as
                  { name: string } | undefined
              )?.name ?? item)
            : (labels[item] ?? item),
        )
        .join(', ');
    }
    if (key.endsWith('Id')) {
      const table: Record<string, string> = {
        locationId: 'locations',
        categoryId: 'product_categories',
        brandId: 'product_brands',
        terminalId: 'terminals',
        customerId: 'customers',
        supplierId: 'suppliers',
        productId: 'products',
      };
      if (table[key])
        text =
          (
            db.prepare(`SELECT name FROM ${table[key]} WHERE id=?`).get(value) as
              { name: string } | undefined
          )?.name ?? value;
    }
    const filterNames: Record<string, string> = {
      categoryIds: 'Categorías',
      brandIds: 'Marcas',
      statuses: 'Estados',
      stockFilters: 'Estados del stock',
      views: 'Vigencia',
      roles: 'Roles',
      terminalIds: 'Cajas',
      locationIds: 'Ubicaciones',
      operations: 'Operaciones',
      role: 'Rol',
      query: 'Búsqueda',
      status: 'Estado',
      filter: 'Estado del stock',
      view: 'Vigencia',
      fromDate: 'Desde',
      toDate: 'Hasta',
      from: 'Desde',
      to: 'Hasta',
      month: 'Mes',
      categoryId: 'Categoría',
      brandId: 'Marca',
      locationId: 'Ubicación',
      terminalId: 'Caja',
      customerId: 'Cliente',
      supplierId: 'Proveedor',
      productId: 'Producto',
      saleId: 'Venta',
      purchaseId: 'Compra',
      preset: 'Período',
      rank: 'Orden',
      activeOnly: 'Solo activos',
      includeInactive: 'Incluir inactivos',
      operation: 'Operación',
    };
    context.addRow([
      filterNames[key] ?? key,
      typeof text === 'boolean' ? (text ? 'Sí' : 'No') : (labels[String(text)] ?? String(text)),
    ]);
  }
  context.getRow(1).font = { bold: true };
  styleExcelSheet(context);
  const content = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    content,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filename: `perla-${input.dataset}-${new Date().toISOString().slice(0, 10)}.xlsx`,
  };
}
