import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { ReceiptService } from '../../src/worker/receipts/service';
import type { SaleDetail } from '../../src/shared/sales';

const sale: SaleDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  number: 7,
  checkoutKey: '11111111-1111-4111-8111-111111111112',
  status: 'COMPLETED',
  createdAt: '2026-09-28T15:00:00.000Z',
  businessDate: '2026-09-28',
  localMonth: '2026-09',
  subtotalCents: 1500,
  discountCents: 0,
  totalCents: 1500,
  discount: { type: 'NONE' },
  actorUserId: null,
  actorName: 'Cajero',
  items: [
    {
      id: '11111111-1111-4111-8111-111111111113',
      lineId: '11111111-1111-4111-8111-111111111114',
      productId: '11111111-1111-4111-8111-111111111115',
      sku: 'AGUA',
      barcode: '7790000000000',
      name: 'Agua',
      unit: 'UNIT',
      unitPriceCents: 1500,
      quantityBase: 1,
      grossCents: 1500,
      discountCents: 0,
      netCents: 1500,
      costMethod: null,
      costRateMicrosPerBase: null,
      costCents: null,
      costEffectiveAt: null,
      categoryName: null,
    },
  ],
  payments: [{ method: 'CASH', amountCents: 1500, tenderedCents: 2000, changeCents: 500 }],
  events: [],
};

describe('comprobantes no fiscales', () => {
  it('crea una emisión pendiente con una instantánea inmutable de la venta', () => {
    const db = openDatabase(':memory:');
    try {
      db.prepare(
        'INSERT INTO users (id,username,name,role,active,password_hash,revision,created_at_utc,updated_at_utc,system_admin) VALUES (?,?,?,?,?,?,?,?,?,?)',
      ).run('actor', 'cajero', 'Cajero', 'SELLER', 1, 'hash', 1, sale.createdAt, sale.createdAt, 0);
      db.prepare(
        'INSERT INTO sales (id,number,checkout_key,payload_hash,status,created_at_utc,business_date,local_month,subtotal_cents,discount_cents,total_cents,discount_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      ).run(
        sale.id,
        sale.number,
        sale.checkoutKey,
        'hash',
        sale.status,
        sale.createdAt,
        sale.businessDate,
        sale.localMonth,
        sale.subtotalCents,
        sale.discountCents,
        sale.totalCents,
        JSON.stringify(sale.discount),
      );
      const receipts = new ReceiptService(db, () => sale);
      const receipt = receipts.create(
        { saleId: sale.id, format: 'THERMAL_80' },
        { id: 'actor', name: 'Cajero' },
      );
      expect(receipt.status).toBe('PENDING');
      expect(receipt.snapshot.title).toBe('COMPROBANTE DE VENTA — NO FISCAL');
      expect(receipt.snapshot.sale.items[0]?.name).toBe('Agua');
    } finally {
      db.close();
    }
  });
});
