import { expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { FeatureService } from '../../src/worker/features/service';
import { Application } from '../../src/worker/application';

const password = 'Prueba-Perla-2026!';

function fixture() {
  const db = openDatabase(':memory:');
  const auth = new AuthService(db);
  const grant = auth.bootstrap({ name: 'Dueña', username: 'jefe', password });
  return {
    db,
    auth,
    app: new Application(db, auth),
    features: new FeatureService(db),
    owner: grant.user,
    token: grant.sessionToken,
  };
}

test('el jefe cambia tablero y comprobantes juntos con la revisión vigente', () => {
  const f = fixture();
  try {
    const before = f.features.status();
    const after = f.features.change(
      {
        expectedRevision: before.revision,
        enabled: {
          STOCK_CONTROL: true,
          MONTHLY_DASHBOARD: false,
          RECEIPTS: false,
          PRODUCT_LABELS: true,
        },
      },
      f.owner,
    );
    expect(after.enabled.MONTHLY_DASHBOARD).toBe(false);
    expect(after.enabled.RECEIPTS).toBe(false);
    expect(after.revision).toBe(before.revision + 1);
  } finally {
    f.db.close();
  }
});

test('el tablero apagado rechaza el acceso directo y Caja puede seguir cerrando ventas', () => {
  const f = fixture();
  try {
    const before = f.features.status();
    f.features.change(
      { expectedRevision: before.revision, enabled: { MONTHLY_DASHBOARD: false } },
      f.owner,
    );
    expect(() => f.app.dispatch('dashboard.monthly', { month: '2026-10' }, f.token)).toThrow(
      'desactivada',
    );
    const product = f.app.dispatch(
      'products.save',
      {
        sku: 'FILET-01',
        barcode: '7791234567890',
        name: 'Filet de merluza',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 1800,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      f.token,
    ) as { id: string; revision: number; priceCents: number };
    expect(
      f.app.dispatch(
        'sales.complete',
        {
          checkoutKey: randomUUID(),
          lines: [
            {
              lineId: randomUUID(),
              productId: product.id,
              quantityBase: 1,
              expectedProductRevision: product.revision,
              expectedPriceCents: product.priceCents,
            },
          ],
          discount: { type: 'NONE' },
          payments: [{ method: 'CASH', amountCents: product.priceCents }],
        },
        f.token,
      ),
    ).toMatchObject({ status: 'COMPLETED' });
  } finally {
    f.db.close();
  }
});

test('un cambio con revisión vencida no altera ninguna función', () => {
  const f = fixture();
  try {
    const before = f.features.status();
    expect(() =>
      f.features.change(
        { expectedRevision: before.revision - 1, enabled: before.enabled },
        f.owner,
      ),
    ).toThrow('La configuración cambió');
    expect(f.features.status()).toEqual(before);
  } finally {
    f.db.close();
  }
});

test('Costos apagado oculta mantenimiento y al activarlo conserva la referencia', () => {
  const f = fixture();
  try {
    const product = f.app.dispatch(
      'products.save',
      {
        sku: 'COST-01',
        barcode: null,
        name: 'Producto estimado',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 5000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      f.token,
    ) as { id: string };
    expect(() => f.app.dispatch('costs.get', { productId: product.id }, f.token)).toThrow(
      'desactivada',
    );
    const status = f.features.status();
    f.features.change(
      { expectedRevision: status.revision, enabled: { COSTS_MARGIN: true } },
      f.owner,
    );
    expect(
      f.app.dispatch(
        'costs.setReference',
        { productId: product.id, unitCostCents: 2200, expectedRevision: 0 },
        f.token,
      ),
    ).toMatchObject({ unitCostCents: 2200, method: 'REFERENCE' });
    expect(f.app.dispatch('costs.get', { productId: product.id }, f.token)).toMatchObject({
      unitCostCents: 2200,
    });
  } finally {
    f.db.close();
  }
});

test('Compras apagado bloquea nuevas recepciones y conserva el histórico para el jefe', () => {
  const f = fixture();
  try {
    let status = f.features.status();
    f.features.change(
      {
        expectedRevision: status.revision,
        enabled: { SUPPLIERS_PURCHASES: true, STOCK_CONTROL: false },
      },
      f.owner,
    );
    const supplier = f.app.dispatch('suppliers.save', { name: 'Proveedor histórico' }, f.token) as {
      id: string;
    };
    const product = f.app.dispatch(
      'products.save',
      {
        sku: 'HIST-01',
        barcode: null,
        name: 'Producto histórico',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 1000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      f.token,
    ) as { id: string; revision: number };
    f.app.dispatch(
      'purchases.receive',
      {
        receiptKey: randomUUID(),
        supplierId: supplier.id,
        businessDate: '2026-10-02',
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 1,
            unitCostCents: 500,
            expectedProductRevision: product.revision,
          },
        ],
      },
      f.token,
    );
    status = f.features.status();
    f.features.change(
      { expectedRevision: status.revision, enabled: { SUPPLIERS_PURCHASES: false } },
      f.owner,
    );
    expect(f.app.dispatch('purchases.list', { status: 'ALL', limit: 20 }, f.token)).toMatchObject({
      total: 1,
    });
    expect(() => f.app.dispatch('suppliers.save', { name: 'No permitido' }, f.token)).toThrow(
      'desactivada',
    );
    f.auth.saveUser(f.token, {
      name: 'Supervisora',
      username: 'supervisora',
      password: 'Supervisora-2026!',
      role: 'SUPERVISOR',
      active: true,
    });
    const supervisor = f.auth.login({ username: 'supervisora', password: 'Supervisora-2026!' });
    expect(() =>
      f.app.dispatch('purchases.list', { status: 'ALL', limit: 20 }, supervisor.sessionToken),
    ).toThrow('Solo el jefe');
  } finally {
    f.db.close();
  }
});

test('Cuenta de proveedores requiere Compras y no oculta saldos pendientes', () => {
  const f = fixture();
  try {
    let status = f.features.status();
    expect(status.enabled.SUPPLIER_ACCOUNTS).toBe(false);
    expect(() =>
      f.features.change(
        { expectedRevision: status.revision, enabled: { SUPPLIER_ACCOUNTS: true } },
        f.owner,
      ),
    ).toThrow('necesita Proveedores');
    status = f.features.status();
    f.features.change(
      {
        expectedRevision: status.revision,
        enabled: {
          SUPPLIERS_PURCHASES: true,
          SUPPLIER_ACCOUNTS: true,
          STOCK_CONTROL: false,
        },
      },
      f.owner,
    );
    const supplier = f.app.dispatch('suppliers.save', { name: 'Cuenta protegida' }, f.token) as {
      id: string;
    };
    const product = f.app.dispatch(
      'products.save',
      {
        sku: 'CTA-01',
        barcode: null,
        name: 'Producto con deuda',
        category: null,
        saleUnit: 'UNIT',
        priceCents: 2000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      f.token,
    ) as { id: string; revision: number };
    f.app.dispatch(
      'purchases.receive',
      {
        receiptKey: randomUUID(),
        supplierId: supplier.id,
        businessDate: '2026-10-05',
        lines: [
          {
            lineId: randomUUID(),
            productId: product.id,
            quantityBase: 2,
            unitCostCents: 1000,
            expectedProductRevision: product.revision,
          },
        ],
      },
      f.token,
    );
    expect(
      f.app.dispatch('supplierAccounts.detail', { supplierId: supplier.id }, f.token),
    ).toMatchObject({ balanceCents: 2000 });
    status = f.features.status();
    expect(() =>
      f.features.change(
        { expectedRevision: status.revision, enabled: { SUPPLIER_ACCOUNTS: false } },
        f.owner,
      ),
    ).toThrow('compra pendiente');
  } finally {
    f.db.close();
  }
});

test('Ubicaciones requiere Stock y no se apaga con mercadería en tránsito', () => {
  const f=fixture();
  try {
    let status=f.features.status();
    expect(()=>f.features.change({expectedRevision:status.revision,enabled:{STOCK_CONTROL:false,LOCATIONS_TRANSFERS:true}},f.owner)).toThrow('necesita Control de stock');
    status=f.features.status();
    f.features.change({expectedRevision:status.revision,enabled:{STOCK_CONTROL:true,LOCATIONS_TRANSFERS:true}},f.owner);
    const product=f.app.dispatch('products.save',{sku:'MOD-LOC',barcode:null,name:'Producto traslado',category:null,saleUnit:'UNIT',priceCents:1000,active:true,trackStock:true,minStockBase:0},f.token) as {id:string;revision:number};
    f.app.dispatch('stock.opening',{productId:product.id,countedBase:2,expectedRevision:0,expectedProductRevision:product.revision,reason:'Conteo inicial',operationKey:randomUUID()},f.token);
    const locations=f.app.dispatch('locations.list',{},f.token) as {id:string}[];
    const destination=f.app.dispatch('locations.save',{name:'Segundo local',code:'SEGUNDO',active:true},f.token) as {id:string};
    f.app.dispatch('transfers.dispatch',{operationKey:randomUUID(),fromLocationId:locations[0]!.id,toLocationId:destination.id,items:[{productId:product.id,quantityBase:1}]},f.token);
    status=f.features.status();
    expect(()=>f.features.change({expectedRevision:status.revision,enabled:{LOCATIONS_TRANSFERS:false}},f.owner)).toThrow('traslado en tránsito');
  } finally { f.db.close(); }
});
