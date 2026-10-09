import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import {
  CustomerCollectionInputSchema,
  CustomerCreditSchema,
  CustomerSaveSchema,
  CustomerSearchSchema,
  CustomerSetActiveSchema,
  type Customer,
  type CustomerAccount,
  type CustomerCollection,
  type CustomerCollectionInput,
  type CustomerPage,
  type CustomerSaveInput,
} from '../../shared/customers';
import { recordAudit } from '../auth/audit';
import { CashService, operationHash } from '../operations/cash';

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: number;
  credit_enabled: number;
  credit_limit_cents: number;
  revision: number;
  created_at_utc: string;
  updated_at_utc: string;
};

export class CustomerService {
  constructor(
    private readonly db: Database.Database,
    private readonly cash: CashService,
  ) {}
  save(raw: CustomerSaveInput): Customer {
    const input = CustomerSaveSchema.parse(raw),
      now = new Date().toISOString(),
      id = input.id ?? randomUUID();
    return this.db
      .transaction(() => {
        if (input.id) {
          const current = this.db.prepare('SELECT revision FROM customers WHERE id=?').get(id) as
            { revision: number } | undefined;
          if (!current) throw new DomainError('NOT_FOUND', 'El cliente no existe.');
          if (current.revision !== input.expectedRevision)
            throw new DomainError('REVISION_CONFLICT', 'El cliente cambió. Actualizá la ficha.');
          this.db
            .prepare(
              'UPDATE customers SET name=?,search_name=?,phone=?,email=?,notes=?,revision=revision+1,updated_at_utc=? WHERE id=?',
            )
            .run(
              input.name,
              normalize(input.name),
              input.phone || null,
              input.email || null,
              input.notes || null,
              now,
              id,
            );
        } else
          this.db
            .prepare(
              'INSERT INTO customers(id,name,search_name,phone,email,notes,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?)',
            )
            .run(
              id,
              input.name,
              normalize(input.name),
              input.phone || null,
              input.email || null,
              input.notes || null,
              now,
              now,
            );
        return this.get(id);
      })
      .immediate();
  }
  get(id: string): Customer {
    const row = this.db.prepare('SELECT * FROM customers WHERE id=?').get(id) as
      CustomerRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'El cliente no existe.');
    const balance = (
      this.db
        .prepare(
          "SELECT COALESCE(SUM(balance_cents),0) n FROM customer_receivables WHERE customer_id=? AND status='OPEN'",
        )
        .get(id) as { n: number }
    ).n;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email,
      notes: row.notes,
      active: Boolean(row.active),
      creditEnabled: Boolean(row.credit_enabled),
      creditLimitCents: row.credit_limit_cents,
      balanceCents: balance,
      availableCents: Math.max(0, row.credit_limit_cents - balance),
      revision: row.revision,
      createdAt: row.created_at_utc,
      updatedAt: row.updated_at_utc,
    };
  }
  search(raw: unknown): CustomerPage {
    const input = CustomerSearchSchema.parse(raw),
      q = `%${normalize(input.query)}%`,
      where = input.activeOnly ? 'active=1 AND ' : '',
      rows = this.db
        .prepare(
          `SELECT id FROM customers WHERE ${where}(search_name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY name,id LIMIT ?`,
        )
        .all(q, q, q, input.limit) as { id: string }[];
    const total = (
      this.db
        .prepare(
          `SELECT COUNT(*) n FROM customers WHERE ${where}(search_name LIKE ? OR phone LIKE ? OR email LIKE ?)`,
        )
        .get(q, q, q) as { n: number }
    ).n;
    return { items: rows.map((r) => this.get(r.id)), total };
  }
  setCredit(raw: unknown): Customer {
    const input = CustomerCreditSchema.parse(raw),
      current = this.get(input.customerId);
    if (current.revision !== input.expectedRevision)
      throw new DomainError('REVISION_CONFLICT', 'El cliente cambió. Actualizá la ficha.');
    if (!input.creditEnabled && current.balanceCents > 0)
      throw new DomainError('VALIDATION', 'El cliente todavía tiene saldo pendiente.');
    if (input.creditEnabled && input.creditLimitCents < current.balanceCents)
      throw new DomainError('VALIDATION', 'El límite no puede ser menor al saldo pendiente.');
    this.db
      .prepare(
        'UPDATE customers SET credit_enabled=?,credit_limit_cents=?,revision=revision+1,updated_at_utc=? WHERE id=?',
      )
      .run(
        Number(input.creditEnabled),
        input.creditLimitCents,
        new Date().toISOString(),
        input.customerId,
      );
    return this.get(input.customerId);
  }
  setActive(raw: unknown): Customer {
    const input = CustomerSetActiveSchema.parse(raw),
      current = this.get(input.customerId);
    if (current.revision !== input.expectedRevision)
      throw new DomainError('REVISION_CONFLICT', 'El cliente cambió. Actualizá la ficha.');
    if (!input.active && current.balanceCents > 0)
      throw new DomainError(
        'VALIDATION',
        'El cliente tiene saldo pendiente y no se puede desactivar.',
      );
    this.db
      .prepare('UPDATE customers SET active=?,revision=revision+1,updated_at_utc=? WHERE id=?')
      .run(Number(input.active), new Date().toISOString(), input.customerId);
    return this.get(input.customerId);
  }
  recordSale(
    sale: { id: string; customerId: string; amountCents: number },
    creditEnabled: boolean,
  ): void {
    if (!this.db.inTransaction)
      throw new Error('La cuenta del cliente requiere la transacción de venta.');
    if (sale.amountCents <= 0) return;
    if (!creditEnabled) throw new DomainError('FORBIDDEN', 'La cuenta corriente está desactivada.');
    const customer = this.get(sale.customerId);
    if (!customer.active) throw new DomainError('INACTIVE', 'El cliente está inactivo.');
    if (!customer.creditEnabled)
      throw new DomainError('VALIDATION', 'El cliente no está autorizado para comprar a cuenta.');
    if (sale.amountCents > customer.availableCents)
      throw new DomainError('VALIDATION', 'La compra supera el límite disponible del cliente.');
    const now = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO customer_receivables(sale_id,customer_id,original_cents,balance_cents,status,created_at_utc,updated_at_utc) VALUES (?,?,?,?,'OPEN',?,?)",
      )
      .run(sale.id, sale.customerId, sale.amountCents, sale.amountCents, now, now);
  }
  reverseSale(saleId: string, reason: string): void {
    if (!this.db.inTransaction)
      throw new Error('La reversión de cuenta requiere la transacción de anulación.');
    const row = this.db
      .prepare(
        'SELECT customer_id,original_cents,balance_cents,status FROM customer_receivables WHERE sale_id=?',
      )
      .get(saleId) as
      | {
          customer_id: string;
          original_cents: number;
          balance_cents: number;
          status: 'OPEN' | 'PAID' | 'VOIDED';
        }
      | undefined;
    if (!row || row.status === 'VOIDED') return;
    const now = new Date().toISOString(),
      collected = row.original_cents - row.balance_cents;
    this.db
      .prepare(
        "UPDATE customer_receivables SET balance_cents=0,status='VOIDED',updated_at_utc=? WHERE sale_id=?",
      )
      .run(now, saleId);
    if (collected > 0)
      this.db
        .prepare(
          'INSERT INTO customer_credits(id,customer_id,sale_id,amount_cents,reason,created_at_utc) VALUES (?,?,?,?,?,?)',
        )
        .run(randomUUID(), row.customer_id, saleId, collected, reason, now);
  }
  applyReturn(saleId: string, amountCents: number): number {
    if (!this.db.inTransaction) throw new Error('La devolución requiere una transacción activa.');
    const row = this.db
      .prepare('SELECT balance_cents,status FROM customer_receivables WHERE sale_id=?')
      .get(saleId) as { balance_cents: number; status: 'OPEN' | 'PAID' | 'VOIDED' } | undefined;
    if (!row || row.status === 'VOIDED' || row.balance_cents === 0) return 0;
    const offset = Math.min(row.balance_cents, amountCents),
      next = row.balance_cents - offset;
    this.db
      .prepare(
        "UPDATE customer_receivables SET balance_cents=?,status=CASE WHEN ?=0 THEN 'PAID' ELSE 'OPEN' END,updated_at_utc=? WHERE sale_id=? AND balance_cents=?",
      )
      .run(next, next, new Date().toISOString(), saleId, row.balance_cents);
    return offset;
  }
  collect(raw: CustomerCollectionInput, actor: User): CustomerCollection {
    const input = CustomerCollectionInputSchema.parse(raw),
      payloadHash = operationHash(input);
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare('SELECT id,payload_hash FROM customer_collections WHERE operation_key=?')
          .get(input.operationKey) as { id: string; payload_hash: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== payloadHash)
            throw new DomainError(
              'IDEMPOTENCY_CONFLICT',
              'Ese identificador ya corresponde a otro cobro.',
            );
          return this.collection(replay.id);
        }
        const customer = this.get(input.customerId);
        if (input.amountCents > customer.balanceCents)
          throw new DomainError('VALIDATION', 'El cobro supera el saldo pendiente.');
        let remaining = input.amountCents;
        const rows = this.db
          .prepare(
            "SELECT sale_id,balance_cents FROM customer_receivables WHERE customer_id=? AND status='OPEN' ORDER BY created_at_utc,sale_id",
          )
          .all(input.customerId) as { sale_id: string; balance_cents: number }[];
        const allocations: { saleId: string; amountCents: number }[] = [];
        if (input.allocations) {
          if (
            new Set(input.allocations.map((a) => a.saleId)).size !== input.allocations.length ||
            input.allocations.reduce((sum, a) => sum + a.amountCents, 0) !== input.amountCents
          )
            throw new DomainError(
              'VALIDATION',
              'La imputación debe coincidir con el importe y no repetir obligaciones.',
            );
          for (const allocation of input.allocations) {
            const row = rows.find((r) => r.sale_id === allocation.saleId);
            if (
              !row ||
              allocation.amountCents > row.balance_cents ||
              (allocation.expectedBalanceCents !== undefined &&
                allocation.expectedBalanceCents !== row.balance_cents)
            )
              throw new DomainError(
                'REVISION_CONFLICT',
                'El saldo de la obligación cambió. Recargá la cuenta antes de cobrar.',
              );
            allocations.push({ saleId: allocation.saleId, amountCents: allocation.amountCents });
          }
          remaining = 0;
        } else
          for (const row of rows) {
            const amount = Math.min(remaining, row.balance_cents);
            if (amount > 0) allocations.push({ saleId: row.sale_id, amountCents: amount });
            remaining -= amount;
            if (!remaining) break;
          }
        if (remaining)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El saldo cambió mientras se registraba el cobro.',
          );
        const id = randomUUID(),
          now = new Date().toISOString();
        this.db
          .prepare(
            'INSERT INTO customer_collections(id,operation_key,payload_hash,customer_id,business_date,method,amount_cents,note,actor_user_id,actor_name,shift_id,created_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          )
          .run(
            id,
            input.operationKey,
            payloadHash,
            input.customerId,
            input.businessDate,
            input.method,
            input.amountCents,
            input.note ?? null,
            actor.id,
            actor.name,
            input.shiftId ?? null,
            now,
          );
        for (const a of allocations) {
          this.db
            .prepare(
              'INSERT INTO customer_collection_allocations(collection_id,sale_id,amount_cents) VALUES (?,?,?)',
            )
            .run(id, a.saleId, a.amountCents);
          const changed = this.db
            .prepare(
              "UPDATE customer_receivables SET balance_cents=balance_cents-?,status=CASE WHEN balance_cents-?=0 THEN 'PAID' ELSE 'OPEN' END,updated_at_utc=? WHERE sale_id=? AND status='OPEN' AND balance_cents>=?",
            )
            .run(a.amountCents, a.amountCents, now, a.saleId, a.amountCents).changes;
          if (!changed)
            throw new DomainError(
              'REVISION_CONFLICT',
              'El saldo cambió mientras se registraba el cobro.',
            );
        }
        if (input.method === 'CASH') {
          const movement = this.cash.customerCollection(
            {
              customerCollectionId: id,
              shiftId: input.shiftId!,
              amountCents: input.amountCents,
              customerName: customer.name,
              operationKey: input.operationKey,
            },
            actor,
          );
          this.db
            .prepare('UPDATE customer_collections SET register_movement_id=? WHERE id=?')
            .run(movement.id, id);
        }
        recordAudit(this.db, actor, 'customerAccounts.collect', id);
        return this.collection(id);
      })
      .immediate();
  }
  detail(customerId: string): CustomerAccount {
    const customer = this.get(customerId);
    const receivables = (
      this.db
        .prepare(
          `SELECT r.sale_id,s.number,s.business_date,r.original_cents,r.balance_cents,r.status FROM customer_receivables r JOIN sales s ON s.id=r.sale_id WHERE r.customer_id=? ORDER BY s.business_date,s.number`,
        )
        .all(customerId) as {
        sale_id: string;
        number: number;
        business_date: string;
        original_cents: number;
        balance_cents: number;
        status: 'OPEN' | 'PAID' | 'VOIDED';
      }[]
    ).map((r) => ({
      saleId: r.sale_id,
      saleNumber: r.number,
      businessDate: r.business_date,
      originalCents: r.original_cents,
      balanceCents: r.balance_cents,
      status: r.status,
    }));
    const ids = this.db
      .prepare(
        'SELECT id FROM customer_collections WHERE customer_id=? ORDER BY business_date DESC,created_at_utc DESC,id DESC',
      )
      .all(customerId) as { id: string }[];
    const credits = (
      this.db
        .prepare(
          'SELECT c.id,c.sale_id,s.number,c.amount_cents,c.reason,c.created_at_utc FROM customer_credits c JOIN sales s ON s.id=c.sale_id WHERE c.customer_id=? ORDER BY c.created_at_utc DESC',
        )
        .all(customerId) as {
        id: string;
        sale_id: string;
        number: number;
        amount_cents: number;
        reason: string;
        created_at_utc: string;
      }[]
    ).map((c) => ({
      id: c.id,
      saleId: c.sale_id,
      saleNumber: c.number,
      amountCents: c.amount_cents,
      reason: c.reason,
      createdAt: c.created_at_utc,
    }));
    return {
      customer,
      balanceCents: customer.balanceCents,
      availableCents: customer.availableCents,
      creditCents: credits.reduce((sum, c) => sum + c.amountCents, 0),
      receivables,
      collections: ids.map((r) => this.collection(r.id)),
      credits,
    };
  }
  private collection(id: string): CustomerCollection {
    const r = this.db
      .prepare(
        'SELECT id,customer_id,business_date,method,amount_cents,note,actor_name,shift_id,created_at_utc FROM customer_collections WHERE id=?',
      )
      .get(id) as
      | {
          id: string;
          customer_id: string;
          business_date: string;
          method: CustomerCollection['method'];
          amount_cents: number;
          note: string | null;
          actor_name: string;
          shift_id: string | null;
          created_at_utc: string;
        }
      | undefined;
    if (!r) throw new DomainError('NOT_FOUND', 'El cobro no existe.');
    const allocations = (
      this.db
        .prepare(
          'SELECT a.sale_id,s.number,a.amount_cents FROM customer_collection_allocations a JOIN sales s ON s.id=a.sale_id WHERE a.collection_id=? ORDER BY s.business_date,s.number',
        )
        .all(id) as { sale_id: string; number: number; amount_cents: number }[]
    ).map((a) => ({ saleId: a.sale_id, saleNumber: a.number, amountCents: a.amount_cents }));
    return {
      id: r.id,
      customerId: r.customer_id,
      businessDate: r.business_date,
      method: r.method,
      amountCents: r.amount_cents,
      note: r.note,
      actorName: r.actor_name,
      shiftId: r.shift_id,
      createdAt: r.created_at_utc,
      allocations,
    };
  }
}
