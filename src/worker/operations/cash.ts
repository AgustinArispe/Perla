import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import type { SaleDetail } from '../../shared/sales';
import type { SaleReturnDetail } from '../../shared/returns';
import { DomainError } from '../../shared/errors';
import { recordAudit } from '../auth/audit';
export interface RegisterShift {
  id: string;
  terminalId: string;
  status: 'OPEN' | 'CLOSED';
  openingCashCents: number;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  countedCashCents: number | null;
  expectedCashCents: number | null;
  differenceCents: number | null;
  revision: number;
}
export const shiftSql =
  'SELECT id,terminal_id AS terminalId,status,opening_cash_cents AS openingCashCents,opened_by AS openedBy,opened_at_utc AS openedAt,closed_by AS closedBy,closed_at_utc AS closedAt,counted_cash_cents AS countedCashCents,expected_cash_cents AS expectedCashCents,difference_cents AS differenceCents,revision FROM register_shifts';
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, x]) => [k, canonical(x)]),
    );
  return v;
}
export const operationHash = (v: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(canonical(v)))
    .digest('hex');
export class CashService {
  constructor(private readonly db: Database.Database) {}
  detail(id: string, actor: User): RegisterShift {
    const row = this.db.prepare(shiftSql + ' WHERE id=?').get(id) as RegisterShift | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'La caja no existe.');
    this.own(row, actor);
    return row;
  }
  private own(s: RegisterShift, a: User) {
    if (a.role === 'SELLER' && s.openedBy !== a.id)
      throw new DomainError('FORBIDDEN', 'La caja pertenece a otro vendedor.');
  }
  current(terminalId: string, actor: User): RegisterShift | null {
    const row = this.db
      .prepare(shiftSql + " WHERE terminal_id=? AND status='OPEN'")
      .get(terminalId) as RegisterShift | undefined;
    if (row) this.own(row, actor);
    return row ?? null;
  }
  requireOpen(terminalId: string, actor: User): RegisterShift {
    this.active(terminalId);
    const s = this.current(terminalId, actor);
    if (!s) throw new DomainError('VALIDATION', 'Abrí la caja antes de operar.');
    return s;
  }
  private active(id: string) {
    const t = this.db.prepare('SELECT active FROM terminals WHERE id=?').get(id) as
      { active: number } | undefined;
    if (!t || !t.active) throw new DomainError('INACTIVE', 'La terminal no está activa.');
  }
  private openShift(id: string, a: User) {
    const s = this.detail(id, a);
    if (s.status !== 'OPEN') throw new DomainError('VALIDATION', 'La caja está cerrada.');
    this.active(s.terminalId);
    return s;
  }
  private replay(
    key: string,
    hash: string,
    kind: 'open' | 'close' | 'movement',
    actor: User,
  ): unknown | null {
    const row =
      kind === 'movement'
        ? this.db
            .prepare(
              'SELECT shift_id AS id,payload_hash AS hash FROM register_movements WHERE operation_key=?',
            )
            .get(key)
        : this.db
            .prepare(`SELECT id,${kind}_hash AS hash FROM register_shifts WHERE ${kind}_key=?`)
            .get(key);
    if (!row) {
      const used = this.db
        .prepare(
          'SELECT id FROM register_shifts WHERE open_key=? OR close_key=? UNION ALL SELECT id FROM register_movements WHERE operation_key=?',
        )
        .get(key, key, key);
      if (used) throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave ya fue utilizada.');
      return null;
    }
    const r = row as { id: string; hash: string };
    this.detail(r.id, actor);
    if (r.hash !== hash)
      throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave corresponde a otros datos.');
    return kind === 'movement'
      ? this.db
          .prepare(
            'SELECT id,shift_id AS shiftId,kind,amount_cents AS amountCents,reason,actor_user_id AS actorUserId,created_at_utc AS createdAt FROM register_movements WHERE operation_key=?',
          )
          .get(key)
      : this.detail(r.id, actor);
  }
  open(input: { terminalId: string; openingCashCents: number; operationKey: string }, a: User) {
    return this.db
      .transaction(() => {
        const h = operationHash({ ...input, actorId: a.id });
        const old = this.replay(input.operationKey, h, 'open', a);
        if (old) return old;
        this.active(input.terminalId);
        if (this.current(input.terminalId, a))
          throw new DomainError('VALIDATION', 'La terminal tiene una caja abierta.');
        const id = randomUUID();
        this.db
          .prepare(
            "INSERT INTO register_shifts(id,terminal_id,status,opening_cash_cents,opened_by,opened_at_utc,open_key,open_hash) VALUES (?,?,'OPEN',?,?,?,?,?)",
          )
          .run(
            id,
            input.terminalId,
            input.openingCashCents,
            a.id,
            new Date().toISOString(),
            input.operationKey,
            h,
          );
        recordAudit(this.db, a, 'cash.open', id);
        return this.detail(id, a);
      })
      .immediate();
  }
  expected(s: RegisterShift) {
    const sales = (
      this.db
        .prepare(
          "SELECT COALESCE(SUM(p.amount_cents),0) AS n FROM sale_payments p JOIN sales s ON s.id=p.sale_id WHERE s.register_shift_id=? AND p.method='CASH'",
        )
        .get(s.id) as { n: number }
    ).n;
    const movements = (
      this.db
        .prepare(
          "SELECT COALESCE(SUM(CASE WHEN kind='IN' THEN amount_cents ELSE -amount_cents END),0) AS n FROM register_movements WHERE shift_id=?",
        )
        .get(s.id) as { n: number }
    ).n;
    const result = s.openingCashCents + sales + movements;
    if (!Number.isSafeInteger(result))
      throw new DomainError('VALIDATION', 'El saldo excede el límite.');
    return result;
  }
  close(input: { shiftId: string; countedCashCents: number; operationKey: string }, a: User) {
    return this.db
      .transaction(() => {
        const h = operationHash({ ...input, actorId: a.id }),
          old = this.replay(input.operationKey, h, 'close', a);
        if (old) return old;
        const s = this.openShift(input.shiftId, a);
        const draft = this.db
          .prepare('SELECT body_json FROM checkout_drafts WHERE id=?')
          .get(s.openedBy) as { body_json: string } | undefined;
        if (draft && (JSON.parse(draft.body_json).lines?.length ?? 0) > 0)
          throw new DomainError('VALIDATION', 'Finalizá o cancelá el borrador antes de cerrar.');
        const expected = this.expected(s);
        this.db
          .prepare(
            "UPDATE register_shifts SET status='CLOSED',closed_by=?,closed_at_utc=?,counted_cash_cents=?,expected_cash_cents=?,difference_cents=?,revision=revision+1,close_key=?,close_hash=? WHERE id=?",
          )
          .run(
            a.id,
            new Date().toISOString(),
            input.countedCashCents,
            expected,
            input.countedCashCents - expected,
            input.operationKey,
            h,
            s.id,
          );
        recordAudit(this.db, a, 'cash.close', s.id);
        return this.detail(s.id, a);
      })
      .immediate();
  }
  movement(
    input: {
      shiftId: string;
      kind: 'IN' | 'OUT';
      amountCents: number;
      reason: string;
      operationKey: string;
    },
    a: User,
  ) {
    return this.db
      .transaction(() => {
        const h = operationHash({ ...input, actorId: a.id }),
          old = this.replay(input.operationKey, h, 'movement', a);
        if (old) return old;
        this.openShift(input.shiftId, a);
        const id = randomUUID();
        this.db
          .prepare(
            'INSERT INTO register_movements(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash) VALUES (?,?,?,?,?,?,?,?,?)',
          )
          .run(
            id,
            input.shiftId,
            input.kind,
            input.amountCents,
            input.reason,
            a.id,
            new Date().toISOString(),
            input.operationKey,
            h,
          );
        recordAudit(this.db, a, 'cash.movement', id);
        return this.replay(input.operationKey, h, 'movement', a);
      })
      .immediate();
  }
  supplierPayment(
    input: {
      supplierPaymentId: string;
      shiftId: string;
      amountCents: number;
      supplierName: string;
      operationKey: string;
    },
    a: User,
  ): { id: string; shiftId: string } {
    if (!this.db.inTransaction)
      throw new Error('El pago a proveedor requiere una transacción activa.');
    const existing = this.db
      .prepare(
        'SELECT id,shift_id AS shiftId FROM register_movements WHERE supplier_payment_id=?',
      )
      .get(input.supplierPaymentId) as { id: string; shiftId: string } | undefined;
    if (existing) return existing;
    const shift = this.openShift(input.shiftId, a);
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO register_movements(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,supplier_payment_id) VALUES (?,?,'OUT',?,?,?,?,?,?,?)",
      )
      .run(
        id,
        shift.id,
        input.amountCents,
        `Pago a ${input.supplierName}`,
        a.id,
        new Date().toISOString(),
        input.operationKey,
        operationHash(input),
        input.supplierPaymentId,
      );
    recordAudit(this.db, a, 'cash.supplierPayment', id);
    return { id, shiftId: shift.id };
  }
  customerCollection(input:{customerCollectionId:string;shiftId:string;amountCents:number;customerName:string;operationKey:string},a:User):{id:string;shiftId:string}{
    if(!this.db.inTransaction)throw new Error('El cobro requiere una transacción activa.');
    const existing=this.db.prepare('SELECT id,shift_id AS shiftId FROM register_movements WHERE customer_collection_id=?').get(input.customerCollectionId) as {id:string;shiftId:string}|undefined;
    if(existing)return existing;
    const shift=this.openShift(input.shiftId,a),id=randomUUID();
    this.db.prepare("INSERT INTO register_movements(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,customer_collection_id) VALUES (?,?,'IN',?,?,?,?,?,?,?)").run(id,shift.id,input.amountCents,`Cobro de ${input.customerName}`,a.id,new Date().toISOString(),input.operationKey,operationHash(input),input.customerCollectionId);
    recordAudit(this.db,a,'cash.customerCollection',id);return {id,shiftId:shift.id};
  }
  refund(sale: SaleDetail, refundShiftId: string, a: User) {
    if (!this.db.inTransaction)
      throw new Error('El reintegro requiere la transacción de anulación.');
    const amount = sale.payments
      .filter((p) => p.method === 'CASH')
      .reduce((n, p) => n + p.amountCents, 0);
    const original = this.db
      .prepare('SELECT register_shift_id FROM sales WHERE id=?')
      .get(sale.id) as { register_shift_id: string | null };
    if (!original?.register_shift_id || !amount) return null;
    const existing = this.db
      .prepare(
        "SELECT id,shift_id AS shiftId FROM register_movements WHERE sale_id=? AND kind='REFUND'",
      )
      .get(sale.id);
    if (existing) return existing;
    const s = this.openShift(refundShiftId, a);
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO register_movements(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,sale_id) VALUES (?,?,'REFUND',?,?,?,?,?,?,?)",
      )
      .run(
        id,
        s.id,
        amount,
        'Reintegro de venta ' + sale.number,
        a.id,
        new Date().toISOString(),
        randomUUID(),
        operationHash({ saleId: sale.id, shiftId: s.id, amount }),
        sale.id,
      );
    recordAudit(this.db, a, 'cash.refund', id);
    return { id, shiftId: s.id };
  }
  partialRefund(saleReturn: SaleReturnDetail, refundShiftId: string, a: User) {
    if (!this.db.inTransaction)
      throw new Error('El reintegro requiere la transacción de devolución.');
    if (saleReturn.refundMethod !== 'CASH' || saleReturn.refundCents === 0) return null;
    const existing = this.db
      .prepare(
        "SELECT id,shift_id AS shiftId FROM register_movements WHERE return_id=? AND kind='REFUND'",
      )
      .get(saleReturn.id) as { id: string; shiftId: string } | undefined;
    if (existing) return existing;
    const shift = this.openShift(refundShiftId, a);
    const id = randomUUID();
    this.db
      .prepare(
        "INSERT INTO register_movements(id,shift_id,kind,amount_cents,reason,actor_user_id,created_at_utc,operation_key,payload_hash,return_id) VALUES (?,?,'REFUND',?,?,?,?,?,?,?)",
      )
      .run(
        id,
        shift.id,
        saleReturn.refundCents,
        `Devolución N.º ${saleReturn.number} · Venta N.º ${saleReturn.saleNumber}`,
        a.id,
        new Date().toISOString(),
        saleReturn.input.operationKey,
        operationHash({ returnId: saleReturn.id, shiftId: shift.id, amount: saleReturn.refundCents }),
        saleReturn.id,
      );
    this.db
      .prepare(
        'UPDATE sale_return_refunds SET register_shift_id=?,register_movement_id=? WHERE return_id=?',
      )
      .run(shift.id, id, saleReturn.id);
    recordAudit(this.db, a, 'cash.partialRefund', id);
    return { id, shiftId: shift.id };
  }
}
