import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';
import { DeliveryNoteService } from '../../src/worker/delivery-notes/service';
import { createServer } from '../../src/server/app';
import { ServerRuntime } from '../../src/server/runtime';
import { BackupService, recoverDatabaseFromBackup } from '../../src/server/backups/service';
import type {
  DeliveryNote,
  DeliveryNoteKind,
  DeliveryNoteCreate,
} from '../../src/shared/delivery-notes';
import type { FeatureSelection } from '../../src/shared/features';
import type { Product } from '../../src/shared/catalog';
import type { SaleDetail } from '../../src/shared/sales';
import type { PurchaseDetail } from '../../src/shared/purchases';
import type { StockTransfer } from '../../src/shared/locations';
import type { User } from '../../src/shared/auth';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup();
});
const password = 'Prueba-Remitos-2026!';
function fixture(path = ':memory:') {
  const db = openDatabase(path);
  cleanups.push(() => {
    if (db.open) db.close();
  });
  const auth = new AuthService(db);
  const owner = auth.bootstrap({ username: 'jefe', name: 'Dueña', password });
  const app = new Application(db, auth);
  const features = new FeatureService(db);
  const service = new DeliveryNoteService(db);
  const call = <T>(op: string, payload: unknown) =>
    app.dispatch(op, payload, owner.sessionToken) as T;
  function flags(enabled: FeatureSelection) {
    const current = features.status();
    return features.change({ expectedRevision: current.revision, enabled }, owner.user);
  }
  const product = call<Product>('products.save', {
    sku: 'REM-01',
    barcode: null,
    name: 'Merluza',
    category: null,
    saleUnit: 'KG',
    priceCents: 10000,
    active: true,
    trackStock: true,
    minStockBase: 0,
  });
  call('stock.opening', {
    productId: product.id,
    countedBase: 20000,
    expectedRevision: 0,
    expectedProductRevision: product.revision,
    reason: 'Conteo inicial',
    operationKey: randomUUID(),
  });
  Object.assign(product, call<Product>('products.get', { productId: product.id }));
  function sale() {
    return call<SaleDetail>('sales.complete', {
      checkoutKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 1500,
          expectedProductRevision: product.revision,
          expectedPriceCents: product.priceCents,
        },
      ],
      discount: { type: 'NONE' },
      payments: [{ method: 'DEBIT', amountCents: 15000 }],
    });
  }
  function purchase() {
    flags({ SUPPLIERS_PURCHASES: true });
    const supplier = call<{ id: string }>('suppliers.save', { name: 'Proveedor del Puerto' });
    return call<PurchaseDetail>('purchases.receive', {
      receiptKey: randomUUID(),
      supplierId: supplier.id,
      businessDate: '2026-10-23',
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 1000,
          unitCostCents: 5000,
          expectedProductRevision: product.revision,
        },
      ],
    });
  }
  function transfer() {
    flags({ LOCATIONS_TRANSFERS: true });
    const origin = call<{ id: string }[]>('locations.list', {})[0]!;
    const target = call<{ id: string }>('locations.save', {
      name: 'Depósito reserva',
      code: 'RESERVA',
      active: true,
    });
    return call<StockTransfer>('transfers.dispatch', {
      operationKey: randomUUID(),
      fromLocationId: origin.id,
      toLocationId: target.id,
      items: [{ productId: product.id, quantityBase: 1000 }],
      note: 'Reposición',
    });
  }
  const input = (kind: DeliveryNoteKind, sourceId: string): DeliveryNoteCreate => ({
    kind,
    sourceId,
    operationKey: randomUUID(),
    recipient: 'Destino del remito',
    address: 'Puerto 123',
    reference: 'EXT-001',
    note: 'Entregar por la mañana',
  });
  const stock = () =>
    JSON.stringify({
      balances: db.prepare('SELECT * FROM inventory_balances ORDER BY product_id').all(),
      locations: db
        .prepare('SELECT * FROM location_inventory_balances ORDER BY product_id,location_id')
        .all(),
      movements: db.prepare('SELECT * FROM stock_movements ORDER BY sequence').all(),
      lots: db.prepare('SELECT * FROM inventory_lots ORDER BY id').all(),
      payments: db.prepare('SELECT * FROM sale_payments ORDER BY id').all(),
      accounts: db.prepare('SELECT * FROM account_payments ORDER BY id').all(),
    });
  return {
    db,
    auth,
    owner,
    app,
    call,
    flags,
    features,
    service,
    product,
    sale,
    purchase,
    transfer,
    input,
    stock,
  };
}

describe('remitos modulares', () => {
  it('instala el esquema actual con remitos apagados, sin alterar el catálogo', () => {
    const f = fixture();
    expect(f.features.status().enabled).toMatchObject({
      DELIVERY_NOTES_SALES: false,
      DELIVERY_NOTES_PURCHASES: false,
      DELIVERY_NOTES_INTERNAL: false,
    });
    expect(
      f.db
        .prepare(
          "SELECT count(*) n FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get(),
    ).toEqual({ n: 62 });
    expect(f.db.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(f.db.pragma('foreign_key_check')).toEqual([]);
    expect(MIGRATIONS.at(-1)?.version).toBe(37);
    migrate(f.db);
    expect(f.db.prepare('SELECT count(*) n FROM products').get()).toEqual({ n: 1 });
  });
  it('rechaza emitir apagado aun para el jefe, y habilita cada tipo de forma independiente', () => {
    const f = fixture();
    const sale = f.sale();
    expect(() => f.call('deliveryNotes.create', f.input('SALE', sale.id))).toThrow('desactivado');
    f.flags({ DELIVERY_NOTES_SALES: true });
    expect(f.call<DeliveryNote>('deliveryNotes.create', f.input('SALE', sale.id)).kind).toBe(
      'SALE',
    );
    expect(() => f.service.sources({ kind: 'PURCHASE' }, f.owner.user)).toThrow('desactivado');
    expect(() => f.service.sources({ kind: 'TRANSFER' }, f.owner.user)).toThrow('desactivado');
  });
  it('valida dependencias en el servidor y rechaza revisiones de configuración vencidas', () => {
    const f = fixture();
    expect(() => f.flags({ DELIVERY_NOTES_PURCHASES: true, SUPPLIERS_PURCHASES: false })).toThrow(
      'necesita',
    );
    expect(() => f.flags({ DELIVERY_NOTES_INTERNAL: true, LOCATIONS_TRANSFERS: false })).toThrow(
      'necesita',
    );
    f.flags({ DELIVERY_NOTES_SALES: true });
    f.flags({ PRODUCT_LABELS: false });
    expect(f.features.status().enabled.DELIVERY_NOTES_SALES).toBe(true);
    expect(() =>
      f.features.change(
        { expectedRevision: 1, enabled: { DELIVERY_NOTES_SALES: false } },
        f.owner.user,
      ),
    ).toThrow('configuración cambió');
  });
  it.each(['SALE', 'PURCHASE', 'TRANSFER'] as const)(
    '%s: emite y anula sin duplicar stock, lotes, pagos ni cuentas',
    (kind) => {
      const f = fixture();
      const source = kind === 'SALE' ? f.sale() : kind === 'PURCHASE' ? f.purchase() : f.transfer();
      f.flags({
        DELIVERY_NOTES_SALES: true,
        DELIVERY_NOTES_PURCHASES: kind === 'PURCHASE',
        DELIVERY_NOTES_INTERNAL: kind === 'TRANSFER',
      });
      const before = f.stock();
      const note = f.call<DeliveryNote>('deliveryNotes.create', f.input(kind, source.id));
      expect(note.snapshot.items).toHaveLength(1);
      expect(note.snapshot.items[0]).not.toHaveProperty('unitCostCents');
      expect(note.snapshot.items[0]).not.toHaveProperty('netCents');
      expect(f.stock()).toBe(before);
      expect(
        f.call<DeliveryNote>('deliveryNotes.cancel', {
          noteId: note.id,
          expectedRevision: note.revision,
          operationKey: randomUUID(),
          reason: 'Documento emitido por error',
        }).status,
      ).toBe('CANCELLED');
      expect(f.stock()).toBe(before);
      expect(f.db.pragma('foreign_key_check')).toEqual([]);
    },
  );
  it('conserva instantáneas y exige consultar el remito ya emitido en vez de duplicarlo', () => {
    const f = fixture();
    const sale = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    const input = f.input('SALE', sale.id);
    const first = f.call<DeliveryNote>('deliveryNotes.create', input);
    expect(f.call('deliveryNotes.create', input)).toEqual(first);
    expect(() => f.call('deliveryNotes.create', { ...input, recipient: 'Otro cliente' })).toThrow(
      'otros datos',
    );
    expect(() => f.call('deliveryNotes.create', { ...input, operationKey: randomUUID() })).toThrow(
      'ya tiene',
    );
    f.db.prepare("UPDATE products SET name='Nombre nuevo' WHERE id=?").run(f.product.id);
    f.db.prepare("UPDATE business_settings SET business_name='Empresa nueva'").run();
    expect(f.service.detail(first.id, f.owner.user).snapshot).toEqual(first.snapshot);
    expect(() =>
      f.db.prepare("UPDATE delivery_notes SET snapshot_json='{}' WHERE id=?").run(first.id),
    ).toThrow();
    expect(f.service.detail(first.id, f.owner.user).snapshot).toEqual(first.snapshot);
    expect(() => f.db.prepare('DELETE FROM delivery_notes WHERE id=?').run(first.id)).toThrow(
      'no se eliminan',
    );
  });
  it('permite desactivar con remitos emitidos y al jefe concluirlos; supervisor y vendedor no evaden el switch', () => {
    const f = fixture();
    const sale = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    const note = f.call<DeliveryNote>('deliveryNotes.create', f.input('SALE', sale.id));
    const supervisor = { ...f.owner.user, role: 'SUPERVISOR' } as User;
    const seller = { ...f.owner.user, role: 'SELLER' } as User;
    f.flags({ DELIVERY_NOTES_SALES: false });
    expect(f.service.list({}, f.owner.user).total).toBe(1);
    expect(f.service.list({}, supervisor).total).toBe(0);
    expect(() => f.service.detail(note.id, supervisor)).toThrow('desactivado');
    expect(() => f.service.detail(note.id, seller)).toThrow('perfil');
    expect(() => f.call('deliveryNotes.create', f.input('SALE', randomUUID()))).toThrow(
      'desactivado',
    );
    const before = f.stock();
    const action = {
      noteId: note.id,
      expectedRevision: note.revision,
      operationKey: randomUUID(),
      reason: 'Recibió María, DNI registrado',
    };
    expect(f.call<DeliveryNote>('deliveryNotes.deliver', action).status).toBe('DELIVERED');
    expect(f.call<DeliveryNote>('deliveryNotes.deliver', action).revision).toBe(2);
    expect(f.stock()).toBe(before);
    f.flags({ DELIVERY_NOTES_SALES: true });
    expect(f.service.list({}, supervisor).total).toBe(1);
  });
  it('reemplaza un documento anulado conservando el historial y el vínculo al anterior', () => {
    const f = fixture();
    const sale = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    const input = f.input('SALE', sale.id);
    const first = f.service.create(input, f.owner.user);
    f.service.act(
      {
        noteId: first.id,
        expectedRevision: first.revision,
        operationKey: randomUUID(),
        reason: 'Dirección incorrecta',
      },
      f.owner.user,
      'cancel',
    );
    expect(f.service.sources({ kind: 'SALE', number: sale.number }, f.owner.user)).toHaveLength(1);
    const next = f.service.create(
      { ...input, operationKey: randomUUID(), address: 'Dirección corregida' },
      f.owner.user,
    );
    expect(next.number).toBe(first.number + 1);
    expect(next.supersedesNumber).toBe(first.number);
    expect(f.service.detail(first.id, f.owner.user)).toMatchObject({
      status: 'CANCELLED',
      snapshot: first.snapshot,
    });
    expect(f.service.create(input, f.owner.user).status).toBe('CANCELLED');
    expect(f.service.list({}, f.owner.user).total).toBe(2);
    expect(() =>
      f.db
        .prepare(
          "UPDATE delivery_notes SET status='ISSUED',revision=revision+1,cancelled_at_utc=NULL WHERE id=?",
        )
        .run(first.id),
    ).toThrow();
  });
  it('controla revisión, estado terminal y claves de confirmación', () => {
    const f = fixture();
    const sale = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    const note = f.service.create(f.input('SALE', sale.id), f.owner.user);
    const action = {
      noteId: note.id,
      expectedRevision: 1,
      operationKey: randomUUID(),
      reason: 'Recibió el cliente',
    };
    expect(() =>
      f.service.act({ ...action, expectedRevision: 2 }, f.owner.user, 'deliver'),
    ).toThrow('cambió');
    const delivered = f.service.act(action, f.owner.user, 'deliver');
    expect(() =>
      f.service.act({ ...action, reason: 'Otro receptor' }, f.owner.user, 'deliver'),
    ).toThrow('otros datos');
    expect(() =>
      f.service.act(
        { ...action, operationKey: randomUUID(), expectedRevision: delivered.revision },
        f.owner.user,
        'deliver',
      ),
    ).toThrow('ya está confirmada');
    const cancel = {
      ...action,
      operationKey: randomUUID(),
      expectedRevision: delivered.revision,
      reason: 'Error de documentación',
    };
    const cancelled = f.service.act(cancel, f.owner.user, 'cancel');
    expect(f.service.act(cancel, f.owner.user, 'cancel')).toEqual(cancelled);
    expect(() =>
      f.service.act(
        { ...action, operationKey: randomUUID(), expectedRevision: cancelled.revision },
        f.owner.user,
        'deliver',
      ),
    ).toThrow('anulado');
  });
  it('refleja la anulación posterior del origen y conserva el documento emitido', () => {
    const f = fixture();
    const sale = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    const note = f.service.create(f.input('SALE', sale.id), f.owner.user);
    f.call('sales.void', {
      saleId: sale.id,
      reason: 'Venta duplicada',
      operationKey: randomUUID(),
    });
    expect(f.service.detail(note.id, f.owner.user)).toMatchObject({
      status: 'ISSUED',
      sourceStatus: 'VOIDED',
      snapshot: note.snapshot,
    });
    expect(() =>
      f.service.act(
        { noteId: note.id, expectedRevision: 1, operationKey: randomUUID(), reason: 'Entregado' },
        f.owner.user,
        'deliver',
      ),
    ).toThrow('origen está anulada');
  });
  it('sigue la recepción del traslado desde su origen sin permitir una segunda recepción desde remitos', () => {
    const f = fixture();
    const transfer = f.transfer();
    f.flags({ DELIVERY_NOTES_INTERNAL: true });
    const note = f.service.create(f.input('TRANSFER', transfer.id), f.owner.user);
    expect(note.sourceStatus).toBe('IN_TRANSIT');
    expect(() =>
      f.service.act(
        { noteId: note.id, expectedRevision: 1, operationKey: randomUUID(), reason: 'Recepción' },
        f.owner.user,
        'deliver',
      ),
    ).toThrow('origen');
    f.call('transfers.receive', {
      transferId: transfer.id,
      operationKey: randomUUID(),
      items: [{ productId: f.product.id, receivedBase: 1000 }],
    });
    expect(f.service.detail(note.id, f.owner.user).sourceStatus).toBe('RECEIVED');
  });
  it('filtra y pagina sin aceptar filtros SQL, y retira orígenes ya documentados', () => {
    const f = fixture();
    const sale = f.sale();
    const second = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    expect(f.service.sources({ kind: 'SALE', number: sale.number }, f.owner.user)).toMatchObject([
      { id: sale.id },
    ]);
    const note = f.service.create(f.input('SALE', sale.id), f.owner.user);
    expect(f.service.sources({ kind: 'SALE', number: sale.number }, f.owner.user)).toEqual([]);
    expect(f.service.sources({ kind: 'SALE' }, f.owner.user)).toMatchObject([{ id: second.id }]);
    expect(f.service.list({ kind: 'PURCHASE' }, f.owner.user).total).toBe(0);
    expect(f.service.list({ offset: 1, limit: 1 }, f.owner.user)).toEqual({ total: 1, items: [] });
    expect(f.service.list({ limit: 1 }, f.owner.user).items[0]?.id).toBe(note.id);
    expect(() => f.call('deliveryNotes.list', { kind: "SALE' OR 1=1" })).toThrow();
    expect(() => f.call('deliveryNotes.detail', { noteId: '../../db' })).toThrow();
    expect(() => f.service.create(f.input('SALE', randomUUID()), f.owner.user)).toThrow('origen');
  });
  it('incluye remitos y estado en backups verificados', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'perla-remito-backup-'));
    cleanups.push(() => rmSync(directory, { recursive: true, force: true }));
    const f = fixture(join(directory, 'db.sqlite'));
    const sale = f.sale();
    f.flags({ DELIVERY_NOTES_SALES: true });
    const note = f.service.create(f.input('SALE', sale.id), f.owner.user);
    const key = randomBytes(32);
    const service = new BackupService({
      databasePath: join(directory, 'db.sqlite'),
      backupDirectory: join(directory, 'backups'),
      key,
      appVersion: 'test',
      getDatabase: () => f.db,
      closeDatabase: () => f.db.close(),
      reopenDatabase: () => {
        throw new Error('unused');
      },
    });
    const backup = await service.create();
    expect((await service.inspect(backup.id)).info.schemaVersion).toBe(37);
    expect(f.service.detail(note.id, f.owner.user).snapshot.items[0]?.quantityBase).toBe(1500);
    const restoredPath = join(directory, 'restored.sqlite');
    recoverDatabaseFromBackup({
      databasePath: restoredPath,
      backupDirectory: join(directory, 'recovery'),
      key,
      appVersion: 'test',
      buffer: service.download(backup.id),
    });
    const restored = openDatabase(restoredPath);
    try {
      expect(new DeliveryNoteService(restored).detail(note.id, f.owner.user)).toEqual(note);
      expect(restored.pragma('foreign_key_check')).toEqual([]);
    } finally {
      restored.close();
    }
  });
});

it('API HTTP exige sesión y CSRF, valida filtros y aplica el switch aunque se invoque directamente', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'perla-remito-http-'));
  const runtime = new ServerRuntime({
    databasePath: join(directory, 'db.sqlite'),
    backupDirectory: join(directory, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  });
  new AuthService(runtime.database).bootstrap({ username: 'jefe', name: 'Dueña', password });
  const server = await createServer(
    { origin: 'http://pos.test', production: false, trustProxy: false, logger: false },
    runtime,
  );
  try {
    const base = { host: 'pos.test', origin: 'http://pos.test' };
    expect((await server.inject({ url: '/api/v1/delivery-notes', headers: base })).statusCode).toBe(
      401,
    );
    const login = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      headers: base,
      payload: { username: 'jefe', password },
    });
    const headers = {
      ...base,
      cookie: (login.headers['set-cookie'] as string).split(';')[0]!,
      'x-csrf-token': login.json().value.csrfToken as string,
    };
    expect(
      (await server.inject({ url: '/api/v1/delivery-notes?limit=10&offset=0', headers })).json()
        .value,
    ).toEqual({ items: [], total: 0 });
    expect(
      (await server.inject({ url: '/api/v1/delivery-notes/sources?kind=SALE&number=1', headers }))
        .statusCode,
    ).toBe(403);
    expect(
      (
        await server.inject({
          method: 'POST',
          url: '/api/v1/delivery-notes',
          headers: base,
          payload: {},
        })
      ).statusCode,
    ).toBe(403);
    runtime.database
      .prepare("UPDATE business_features SET enabled=1 WHERE feature_key='DELIVERY_NOTES_SALES'")
      .run();
    expect(
      (
        await server.inject({ url: '/api/v1/delivery-notes/sources?kind=SALE&number=1', headers })
      ).json().value,
    ).toEqual([]);
    expect(
      (
        await server.inject({
          url: '/api/v1/delivery-notes/sources?kind=SALE&number=oops',
          headers,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await server.inject({ url: '/api/v1/delivery-notes?limit=100000', headers })).statusCode,
    ).toBe(400);
  } finally {
    await server.close();
    runtime.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
