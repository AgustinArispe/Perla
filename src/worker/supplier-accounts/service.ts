import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { allocateSupplierPayment } from '../../domain/supplier-accounts';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import {
  SupplierPaymentInputSchema,
  type SupplierAccount,
  type SupplierPayment,
  type SupplierPaymentInput,
} from '../../shared/supplier-accounts';
import { recordAudit } from '../auth/audit';
import { CashService, operationHash } from '../operations/cash';

type PayableRow = {
  purchase_id: string;
  purchase_number: number;
  business_date: string;
  original_cents: number;
  balance_cents: number;
  status: 'OPEN' | 'PAID' | 'VOIDED';
};

export class SupplierAccountService {
  constructor(
    private readonly db: Database.Database,
    private readonly cash: CashService,
  ) {}

  recordPurchase(purchase: { id: string; supplierId: string; totalCents: number }): void {
    if (!this.db.inTransaction)
      throw new Error('La deuda de compra requiere la transacción de recepción.');
    if (purchase.totalCents <= 0) return;
    const now = new Date().toISOString();
    this.db
      .prepare(
        "UPDATE purchases SET debt_party_id=?,debt_original_cents=?,debt_balance_cents=?,debt_status='OPEN',debt_created_at_utc=?,debt_updated_at_utc=? WHERE id=? AND debt_status IS NULL",
      )
      .run(purchase.supplierId, purchase.totalCents, purchase.totalCents, now, now, purchase.id);
  }

  pay(raw: SupplierPaymentInput, actor: User): SupplierPayment {
    const input = SupplierPaymentInputSchema.parse(raw);
    const hash = operationHash(input);
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare('SELECT id,payload_hash FROM supplier_payments WHERE operation_key=?')
          .get(input.operationKey) as { id: string; payload_hash: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== hash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador ya corresponde a otro pago.',
            );
          return this.payment(replay.id);
        }
        const supplier = this.db
          .prepare('SELECT name FROM suppliers WHERE id=?')
          .get(input.supplierId) as { name: string } | undefined;
        if (!supplier) throw new DomainError('NOT_FOUND', 'El proveedor no existe.');
        const rows = this.openPayables(input.supplierId);
        let allocations: { purchaseId: string; amountCents: number }[];
        if (input.allocations?.length) {
          const unique = new Set(input.allocations.map((allocation) => allocation.purchaseId));
          if (unique.size !== input.allocations.length)
            throw new DomainError('VALIDATION', 'Cada compra puede imputarse una sola vez.');
          const byId = new Map(rows.map((row) => [row.purchase_id, row]));
          allocations = input.allocations.map((allocation) => {
            const payable = byId.get(allocation.purchaseId);
            if (
              allocation.expectedBalanceCents !== undefined &&
              (!payable || payable.balance_cents !== allocation.expectedBalanceCents)
            )
              throw new DomainError(
                'REVISION_CONFLICT',
                'El saldo de la obligación cambió. Recargá la cuenta antes de pagar.',
              );
            if (!payable || allocation.amountCents > payable.balance_cents)
              throw new DomainError(
                'VALIDATION',
                'La imputación supera el saldo de una compra pendiente.',
              );
            return allocation;
          });
          const total = allocations.reduce((sum, allocation) => sum + allocation.amountCents, 0);
          if (total !== input.amountCents)
            throw new DomainError('VALIDATION', 'Las imputaciones no coinciden con el pago.');
        } else {
          try {
            allocations = allocateSupplierPayment(
              input.amountCents,
              rows.map((row) => ({
                purchaseId: row.purchase_id,
                balanceCents: row.balance_cents,
              })),
            );
          } catch (error) {
            throw new DomainError(
              'VALIDATION',
              error instanceof Error ? error.message : 'El pago no es válido.',
            );
          }
        }
        const id = randomUUID();
        const now = new Date().toISOString();
        this.db
          .prepare(
            "INSERT INTO account_payments(direction,id,operation_key,payload_hash,party_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,register_movement_id,created_at_utc) VALUES ('OUT',?,?,?,?,?,?,?,?,?,?,?,NULL,?)",
          )
          .run(
            id,
            input.operationKey,
            hash,
            input.supplierId,
            input.businessDate,
            input.method,
            input.amountCents,
            input.note ?? null,
            actor.id,
            actor.name,
            input.shiftId ?? null,
            now,
          );
        const insert = this.db.prepare(
          'INSERT INTO account_payment_allocations(payment_id,purchase_id,amount_cents) VALUES (?,?,?)',
        );
        const update = this.db.prepare(
          "UPDATE purchases SET debt_balance_cents=debt_balance_cents-?,debt_status=CASE WHEN debt_balance_cents-?=0 THEN 'PAID' ELSE 'OPEN' END,debt_updated_at_utc=? WHERE id=? AND debt_status='OPEN' AND debt_balance_cents>=?",
        );
        for (const allocation of allocations) {
          insert.run(id, allocation.purchaseId, allocation.amountCents);
          const changed = update.run(
            allocation.amountCents,
            allocation.amountCents,
            now,
            allocation.purchaseId,
            allocation.amountCents,
          ).changes;
          if (!changed)
            throw new DomainError(
              'REVISION_CONFLICT',
              'El saldo cambió mientras se registraba el pago. Actualizá la ficha.',
            );
        }
        if (input.method === 'CASH') {
          const movement = this.cash.supplierPayment(
            {
              supplierPaymentId: id,
              shiftId: input.shiftId!,
              amountCents: input.amountCents,
              supplierName: supplier.name,
              operationKey: input.operationKey,
            },
            actor,
          );
          this.db
            .prepare(
              "UPDATE account_payments SET register_movement_id=? WHERE direction='OUT' AND id=?",
            )
            .run(movement.id, id);
        }
        recordAudit(this.db, actor, 'supplierAccounts.pay', id);
        return this.payment(id);
      })
      .immediate();
  }

  reversePurchase(purchaseId: string, reason: string): void {
    if (!this.db.inTransaction)
      throw new Error('La reversión de deuda requiere la transacción de anulación.');
    const row = this.db
      .prepare(
        'SELECT supplier_id,original_cents,balance_cents,status FROM supplier_payables WHERE purchase_id=?',
      )
      .get(purchaseId) as
      | {
          supplier_id: string;
          original_cents: number;
          balance_cents: number;
          status: 'OPEN' | 'PAID' | 'VOIDED';
        }
      | undefined;
    if (!row || row.status === 'VOIDED') return;
    const now = new Date().toISOString();
    const paid = row.original_cents - row.balance_cents;
    this.db
      .prepare(
        "UPDATE purchases SET debt_balance_cents=0,debt_status='VOIDED',debt_updated_at_utc=? WHERE id=? AND debt_status IS NOT NULL",
      )
      .run(now, purchaseId);
    if (paid > 0)
      this.db
        .prepare(
          'INSERT INTO account_credits(id,party_id,purchase_id,amount_cents,reason,created_at_utc) VALUES (?,?,?,?,?,?)',
        )
        .run(randomUUID(), row.supplier_id, purchaseId, paid, reason, now);
  }

  detail(supplierId: string): SupplierAccount {
    const supplier = this.db.prepare('SELECT name FROM suppliers WHERE id=?').get(supplierId) as
      { name: string } | undefined;
    if (!supplier) throw new DomainError('NOT_FOUND', 'El proveedor no existe.');
    const payables = this.db
      .prepare(
        `SELECT sp.purchase_id,p.number AS purchase_number,p.business_date,sp.original_cents,sp.balance_cents,sp.status
         FROM supplier_payables sp JOIN purchases p ON p.id=sp.purchase_id
         WHERE sp.supplier_id=? ORDER BY p.business_date,p.number`,
      )
      .all(supplierId) as PayableRow[];
    const paymentRows = this.db
      .prepare(
        `SELECT id,supplier_id,business_date,method,amount_cents,note,actor_name,created_at_utc,shift_id
         FROM supplier_payments WHERE supplier_id=? ORDER BY business_date DESC,created_at_utc DESC,id DESC`,
      )
      .all(supplierId) as {
      id: string;
      supplier_id: string;
      business_date: string;
      method: SupplierPayment['method'];
      amount_cents: number;
      note: string | null;
      actor_name: string;
      created_at_utc: string;
      shift_id: string | null;
    }[];
    const allocationQuery = this.db.prepare(
      `SELECT a.purchase_id,p.number AS purchase_number,a.amount_cents
       FROM supplier_payment_allocations a JOIN purchases p ON p.id=a.purchase_id
       WHERE a.payment_id=? ORDER BY p.business_date,p.number`,
    );
    const credits = this.db
      .prepare(
        `SELECT c.id,c.purchase_id,p.number AS purchase_number,c.amount_cents,c.reason,c.created_at_utc
         FROM supplier_credits c JOIN purchases p ON p.id=c.purchase_id
         WHERE c.supplier_id=? ORDER BY c.created_at_utc DESC,c.id DESC`,
      )
      .all(supplierId) as {
      id: string;
      purchase_id: string;
      purchase_number: number;
      amount_cents: number;
      reason: string;
      created_at_utc: string;
    }[];
    return {
      supplierId,
      supplierName: supplier.name,
      balanceCents: payables.reduce((sum, payable) => sum + payable.balance_cents, 0),
      creditCents: credits.reduce((sum, credit) => sum + credit.amount_cents, 0),
      payables: payables.map((row) => ({
        purchaseId: row.purchase_id,
        purchaseNumber: row.purchase_number,
        businessDate: row.business_date,
        originalCents: row.original_cents,
        balanceCents: row.balance_cents,
        status: row.status,
      })),
      payments: paymentRows.map((row) => ({
        id: row.id,
        supplierId: row.supplier_id,
        businessDate: row.business_date,
        method: row.method,
        amountCents: row.amount_cents,
        note: row.note,
        actorName: row.actor_name,
        createdAt: row.created_at_utc,
        shiftId: row.shift_id,
        allocations: (
          allocationQuery.all(row.id) as {
            purchase_id: string;
            purchase_number: number;
            amount_cents: number;
          }[]
        ).map((allocation) => ({
          purchaseId: allocation.purchase_id,
          purchaseNumber: allocation.purchase_number,
          amountCents: allocation.amount_cents,
        })),
      })),
      credits: credits.map((credit) => ({
        id: credit.id,
        purchaseId: credit.purchase_id,
        purchaseNumber: credit.purchase_number,
        amountCents: credit.amount_cents,
        reason: credit.reason,
        createdAt: credit.created_at_utc,
      })),
    };
  }

  private openPayables(supplierId: string): PayableRow[] {
    return this.db
      .prepare(
        `SELECT sp.purchase_id,p.number AS purchase_number,p.business_date,sp.original_cents,sp.balance_cents,sp.status
         FROM supplier_payables sp JOIN purchases p ON p.id=sp.purchase_id
         WHERE sp.supplier_id=? AND sp.status='OPEN' AND sp.balance_cents>0
         ORDER BY p.business_date,p.number`,
      )
      .all(supplierId) as PayableRow[];
  }

  private payment(id: string): SupplierPayment {
    const supplierId = (
      this.db.prepare('SELECT supplier_id FROM supplier_payments WHERE id=?').get(id) as
        { supplier_id: string } | undefined
    )?.supplier_id;
    if (!supplierId) throw new DomainError('NOT_FOUND', 'El pago no existe.');
    const payment = this.detail(supplierId).payments.find((item) => item.id === id);
    if (!payment) throw new DomainError('NOT_FOUND', 'El pago no existe.');
    return payment;
  }
}
