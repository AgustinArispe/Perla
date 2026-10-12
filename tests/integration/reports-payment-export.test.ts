import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import { expect, test } from 'vitest';
import { ServerRuntime } from '../../src/server/runtime';
import { AuthService } from '../../src/worker/auth/service';
import { Application } from '../../src/worker/application';
import { FeatureService } from '../../src/worker/features/service';

test('Excel calcula participación sobre pagos y deja porcentajes vacíos con reembolsos negativos', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'pos-report-payments-'));
  const runtime = new ServerRuntime({
    databasePath: join(dir, 'pos.sqlite'),
    backupDirectory: join(dir, 'backups'),
    backupKey: randomBytes(32),
    appVersion: 'test',
  });
  try {
    const auth = new AuthService(runtime.database);
    const grant = auth.bootstrap({
      name: 'Jefe',
      username: 'jefe',
      password: 'Prueba-Excel-2026!',
    });
    const app = new Application(runtime.database, auth);
    const features = new FeatureService(runtime.database);
    features.change(
      {
        expectedRevision: features.status().revision,
        enabled: { CUSTOMERS: true, CUSTOMER_CREDIT: true },
      },
      grant.user,
    );
    const customer = app.dispatch('customers.save', { name: 'Cliente' }, grant.sessionToken) as {
      id: string;
      revision: number;
    };
    app.dispatch(
      'customers.setCredit',
      {
        customerId: customer.id,
        expectedRevision: customer.revision,
        creditEnabled: true,
        creditLimitCents: 10000,
      },
      grant.sessionToken,
    );
    const product = app.dispatch(
      'products.save',
      {
        sku: 'EXPORT',
        barcode: null,
        category: null,
        name: 'Producto',
        saleUnit: 'UNIT',
        priceCents: 1000,
        active: true,
        trackStock: false,
        minStockBase: 0,
      },
      grant.sessionToken,
    ) as { id: string; revision: number };
    const checkout = {
      lines: [
        {
          lineId: randomUUID(),
          productId: product.id,
          quantityBase: 1,
          expectedPriceCents: 1000,
          expectedProductRevision: product.revision,
        },
      ],
      discount: { type: 'NONE' },
    };
    const sale = app.dispatch(
      'sales.complete',
      {
        ...checkout,
        checkoutKey: randomUUID(),
        customerId: customer.id,
        onAccountCents: 500,
        payments: [{ method: 'CASH', amountCents: 500 }],
      },
      grant.sessionToken,
    ) as { localMonth: string };
    const exportPayments = async () => {
      const result = await runtime.request(
        'exports.excel',
        { dataset: 'payments', filters: { month: sale.localMonth } },
        grant.sessionToken,
      );
      if (!result.ok) throw new Error(result.error.message);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load((result.value as { content: Buffer }).content as never);
      return workbook.getWorksheet('Medios de pago')!;
    };
    const positive = await exportPayments();
    // Sold = $10, paid = $5: cash represents all recorded payments.
    expect(positive.getCell('E2').value).toBe(1);
    expect(positive.getCell('B2').value).toBe(5);
    expect(positive.getCell('D2').value).toBe(0);
    expect(positive.getCell('E1').value).toBe('Participación en pagos netos');
    const paidSale = app.dispatch(
      'sales.complete',
      { ...checkout, checkoutKey: randomUUID(), payments: [{ method: 'CASH', amountCents: 1000 }] },
      grant.sessionToken,
    ) as { id: string; items: { id: string }[] };
    app.dispatch(
      'sales.return',
      {
        saleId: paidSale.id,
        operationKey: randomUUID(),
        reason: 'Reembolso por otro medio',
        refundMethod: 'DEBIT',
        items: [{ saleItemId: paidSale.items[0]!.id, quantityBase: 1, disposition: 'NONE' }],
      },
      grant.sessionToken,
    );
    const negative = await exportPayments();
    expect(negative.getCell('B2').value).toBe(15);
    expect(negative.getCell('B3').value).toBe(-10);
    expect(negative.getCell('D3').value).toBe(1);
    for (let row = 2; row <= 6; row++) expect(negative.getCell(`E${row}`).value).toBeNull();
  } finally {
    await runtime.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
