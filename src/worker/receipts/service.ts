import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { ReceiptCreateSchema } from '../../shared/receipts';
import type {
  ReceiptCreateInput,
  ReceiptPage,
  ReceiptSnapshot,
  SaleReceipt,
} from '../../shared/receipts';
import type { SaleDetail } from '../../shared/sales';
import { DomainError } from '../../shared/errors';

type Actor = { id: string; name: string };
type ReceiptRow = {
  id: string;
  sale_id: string;
  sale_number: number;
  format: SaleReceipt['format'];
  status: SaleReceipt['status'];
  snapshot_json: string;
  reprint_reason: string | null;
  created_at_utc: string;
  printed_at_utc: string | null;
};

const map = (row: ReceiptRow): SaleReceipt => ({
  id: row.id,
  saleId: row.sale_id,
  saleNumber: row.sale_number,
  format: row.format,
  status: row.status,
  snapshot: JSON.parse(row.snapshot_json) as ReceiptSnapshot,
  reprintReason: row.reprint_reason,
  createdAt: row.created_at_utc,
  printedAt: row.printed_at_utc,
});

export class ReceiptService {
  constructor(
    private readonly db: Database.Database,
    private readonly detail: (saleId: string) => SaleDetail,
  ) {}
  create(raw: ReceiptCreateInput, actor: Actor): SaleReceipt {
    const input = ReceiptCreateSchema.parse(raw);
    return this.db
      .transaction(() => {
        const sale = this.detail(input.saleId);
        if (sale.status !== 'COMPLETED')
          throw new DomainError(
            'VALIDATION',
            'Sólo se puede emitir un comprobante de una venta completada.',
          );
        const setting = this.db
          .prepare('SELECT business_name FROM business_settings WHERE id=1')
          .get() as { business_name: string } | undefined;
        const snapshot: ReceiptSnapshot = {
          title: 'COMPROBANTE DE VENTA — NO FISCAL',
          businessName: setting?.business_name ?? 'Perla Negra',
          sale,
        };
        const now = new Date().toISOString(),
          id = randomUUID();
        this.db
          .prepare(
            "INSERT INTO sale_receipts (id,sale_id,sale_number,format,status,snapshot_json,reprint_reason,requested_by,requested_by_name,created_at_utc) VALUES (?,?,?,?,'PENDING',?,?,?,?,?)",
          )
          .run(
            id,
            sale.id,
            sale.number,
            input.format,
            JSON.stringify(snapshot),
            input.reprintReason ?? null,
            actor.id,
            actor.name,
            now,
          );
        return this.get(id);
      })
      .immediate();
  }
  get(id: string): SaleReceipt {
    const row = this.db.prepare('SELECT * FROM sale_receipts WHERE id=?').get(id) as
      ReceiptRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'No se encontró el comprobante.');
    return map(row);
  }
  list(input: { status?: SaleReceipt['status'] | undefined } = {}): ReceiptPage {
    const rows = this.db
      .prepare(
        `SELECT * FROM sale_receipts${input.status ? ' WHERE status=?' : ''} ORDER BY created_at_utc DESC,id DESC`,
      )
      .all(...(input.status ? [input.status] : [])) as ReceiptRow[];
    return { items: rows.map(map), total: rows.length };
  }
  markPrinted(id: string): SaleReceipt {
    return this.db
      .transaction(() => {
        const receipt = this.get(id);
        if (receipt.status !== 'PENDING')
          throw new DomainError('VALIDATION', 'El comprobante ya está marcado como impreso.');
        this.db
          .prepare("UPDATE sale_receipts SET status='PRINTED',printed_at_utc=? WHERE id=?")
          .run(new Date().toISOString(), id);
        return this.get(id);
      })
      .immediate();
  }
}
