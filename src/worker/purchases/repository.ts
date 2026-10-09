import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { normalizeSearch } from '../../domain/values';
import { DomainError } from '../../shared/errors';
import type {
  Supplier,
  SupplierPage,
  SupplierSaveInput,
  SupplierSearchInput,
  SupplierSetActiveInput,
} from '../../shared/purchases';

type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  contact_name: string | null;
  address: string | null;
  notes: string | null;
  active: number;
  revision: number;
  created_at_utc: string;
  updated_at_utc: string;
  last_purchase_at: string | null;
  balance_cents: number;
  credit_cents: number;
};

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');

export class PurchaseRepository {
  constructor(private readonly db: Database.Database) {}

  supplier(id: string): Supplier {
    const row = this.db
      .prepare(
        `SELECT s.*, (SELECT MAX(received_at_utc) FROM purchases p WHERE p.supplier_id=s.id) AS last_purchase_at,
          COALESCE((SELECT SUM(balance_cents) FROM supplier_payables sp WHERE sp.supplier_id=s.id AND sp.status='OPEN'),0) AS balance_cents,
          COALESCE((SELECT SUM(amount_cents) FROM supplier_credits sc WHERE sc.supplier_id=s.id),0) AS credit_cents
         FROM suppliers s WHERE s.id=?`,
      )
      .get(id) as SupplierRow | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'El proveedor no existe.');
    return this.mapSupplier(row);
  }

  saveSupplier(input: SupplierSaveInput): Supplier {
    const now = new Date().toISOString();
    const fields = [
      input.name,
      normalizeSearch(input.name),
      input.phone ?? null,
      input.contactName ?? null,
      input.address ?? null,
      input.notes ?? null,
      now,
    ];
    if (!input.id) {
      const id = randomUUID();
      this.db
        .prepare(
          'INSERT INTO suppliers (id,name,search_name,phone,contact_name,address,notes,active,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,1,1,?,?)',
        )
        .run(id, ...fields.slice(0, 6), now, now);
      return this.supplier(id);
    }
    const changed = this.db
      .prepare(
        'UPDATE suppliers SET name=?,search_name=?,phone=?,contact_name=?,address=?,notes=?,revision=revision+1,updated_at_utc=? WHERE id=? AND revision=?',
      )
      .run(...fields, input.id, input.expectedRevision).changes;
    if (!changed) {
      this.supplier(input.id);
      throw new DomainError(
        'REVISION_CONFLICT',
        'El proveedor cambió. Actualizalo antes de guardar.',
      );
    }
    return this.supplier(input.id);
  }

  setSupplierActive(input: SupplierSetActiveInput): Supplier {
    const changed = this.db
      .prepare(
        'UPDATE suppliers SET active=?,revision=revision+1,updated_at_utc=? WHERE id=? AND revision=?',
      )
      .run(
        Number(input.active),
        new Date().toISOString(),
        input.supplierId,
        input.expectedRevision,
      ).changes;
    if (!changed) {
      this.supplier(input.supplierId);
      throw new DomainError(
        'REVISION_CONFLICT',
        'El proveedor cambió. Actualizalo antes de guardar.',
      );
    }
    return this.supplier(input.supplierId);
  }

  searchSuppliers(input: SupplierSearchInput): SupplierPage {
    const query = normalizeSearch(input.query ?? '');
    const pattern = `%${query.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const status = input.status ?? 'ACTIVE';
    let where = `(s.search_name LIKE ? ESCAPE '\\' OR bocha_search(s.phone) LIKE ? ESCAPE '\\' OR bocha_search(s.contact_name) LIKE ? ESCAPE '\\')`;
    const params: (string | number)[] = [pattern, pattern, pattern];
    if (status !== 'ALL') {
      where += ' AND s.active=?';
      params.push(status === 'ACTIVE' ? 1 : 0);
    }
    let after = '';
    if (input.cursor) {
      try {
        const cursor = JSON.parse(Buffer.from(input.cursor, 'base64url').toString('utf8')) as {
          search: string;
          id: string;
          query: string;
          status: string;
        };
        if (cursor.query !== query || cursor.status !== status) throw new Error();
        after = ' AND (s.search_name>? OR (s.search_name=? AND s.id>?))';
        params.push(cursor.search, cursor.search, cursor.id);
      } catch {
        throw new DomainError('VALIDATION', 'La página solicitada no es válida.');
      }
    }
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) AS n FROM suppliers s WHERE ${where}`)
        .get(...(after ? params.slice(0, -3) : params)) as { n: number }
    ).n;
    const rows = this.db
      .prepare(
        `SELECT s.*, (SELECT MAX(received_at_utc) FROM purchases p WHERE p.supplier_id=s.id) AS last_purchase_at,
          COALESCE((SELECT SUM(balance_cents) FROM supplier_payables sp WHERE sp.supplier_id=s.id AND sp.status='OPEN'),0) AS balance_cents,
          COALESCE((SELECT SUM(amount_cents) FROM supplier_credits sc WHERE sc.supplier_id=s.id),0) AS credit_cents
         FROM suppliers s WHERE ${where}${after} ORDER BY s.search_name,s.id LIMIT ?`,
      )
      .all(...params, (input.limit ?? 20) + 1) as (SupplierRow & { search_name: string })[];
    const page = rows.slice(0, input.limit ?? 20);
    const last = page.at(-1);
    return {
      items: page.map((row) => this.mapSupplier(row)),
      total,
      nextCursor:
        rows.length > (input.limit ?? 20) && last
          ? encode({ search: last.search_name, id: last.id, query, status })
          : null,
    };
  }

  private mapSupplier(row: SupplierRow): Supplier {
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      contactName: row.contact_name,
      address: row.address,
      notes: row.notes,
      active: Boolean(row.active),
      revision: row.revision,
      lastPurchaseAt: row.last_purchase_at,
      createdAt: row.created_at_utc,
      updatedAt: row.updated_at_utc,
      balanceCents: row.balance_cents,
      creditCents: row.credit_cents,
    };
  }
}
