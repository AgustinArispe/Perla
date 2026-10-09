import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import {
  ControlPageSchema,
  type CountSession,
  type CountLine,
} from '../../shared/operational-control';
import { CatalogRepository } from '../products/repository';
import { StockService } from '../stock/service';
import { StockRepository } from '../stock/repository';
import { recordAudit } from '../auth/audit';

const id = z.uuid();
const reason = z.string().trim().min(3).max(240);
const quantity = z.number().int().min(0).max(1_000_000_000);
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const date = () =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).format(
    new Date(),
  );
const addDays = (value: string, days: number) => {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const weekEnd = (value: string) =>
  addDays(value, (7 - new Date(`${value}T12:00:00Z`).getUTCDay()) % 7);
const monthEnd = (value: string) => {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};
type SessionRow = {
  id: string;
  location_id: string;
  location_name: string;
  category_id: string | null;
  revision: number;
  status: 'DRAFT' | 'APPLIED';
  updated_at_utc: string;
};

export class OperationalControlService {
  constructor(private readonly db: Database.Database) {}
  execute(action: string, raw: unknown, actor: User): unknown {
    if (!actor.active || actor.role === 'SELLER')
      throw new DomainError('FORBIDDEN', 'No tenés permiso para acceder a estos controles.');
    if (
      (action.startsWith('agenda') || action === 'cashReview') &&
      !['OWNER', 'ADMIN'].includes(actor.role)
    )
      throw new DomainError('FORBIDDEN', 'Solo el jefe puede gestionar este control.');
    switch (action) {
      case 'metadata':
        return {
          locations: this.db
            .prepare(
              "SELECT id,name FROM locations WHERE active=1 AND (is_default=1 OR EXISTS(SELECT 1 FROM business_features WHERE feature_key='LOCATIONS_TRANSFERS' AND enabled=1)) ORDER BY is_default DESC,name",
            )
            .all(),
          categories: this.db
            .prepare('SELECT id,name FROM product_categories WHERE active=1 ORDER BY name')
            .all(),
        };
      case 'countStart':
        return this.start(raw, actor);
      case 'countSessions': {
        const p = ControlPageSchema.parse(raw);
        return this.page(
          "SELECT s.id,s.location_id locationId,l.name locationName,s.revision,s.status,s.updated_at_utc updatedAt FROM control_count_sessions s JOIN locations l ON l.id=s.location_id WHERE s.status='DRAFT' ORDER BY s.updated_at_utc DESC,s.id",
          [],
          p,
        );
      }
      case 'countGet': {
        const session = this.get(z.object({ sessionId: id }).parse(raw).sessionId);
        this.assertLocation(session.locationId);
        return session;
      }
      case 'countLine':
        return this.line(raw, actor);
      case 'countApply':
        return this.apply(raw, actor);
      case 'expiries':
        if (
          !['OWNER', 'ADMIN'].includes(actor.role) &&
          !this.db
            .prepare("SELECT 1 FROM business_features WHERE feature_key='LOTS' AND enabled=1")
            .get()
        )
          throw new DomainError('FORBIDDEN', 'La función de lotes está desactivada.');
        return this.expiries(raw);
      case 'cashDifferences':
        return this.cash(raw, actor);
      case 'cashReview':
        return this.review(raw, actor);
      case 'agenda':
        return this.agenda(raw);
      case 'agendaDate':
        return this.due(raw, actor);
      case 'agendaHistory': {
        const p = z.object({ kind: z.enum(['CUSTOMER', 'SUPPLIER']), obligationId: id }).parse(raw);
        this.obligation(p.kind, p.obligationId);
        return this.db
          .prepare(
            'SELECT previous_due_on previousDueOn,due_on dueOn,revision,reason,actor_name actorName,created_at_utc createdAt FROM control_due_history WHERE kind=? AND obligation_id=? ORDER BY revision',
          )
          .all(p.kind, p.obligationId);
      }
      case 'export':
        return this.export(raw, actor);
      default:
        throw new DomainError('VALIDATION', 'Acción de control desconocida.');
    }
  }
  private page(sql: string, params: (string | number)[], p: { page: number; limit: number }) {
    const total = (
      this.db.prepare(`SELECT COUNT(*) n FROM (${sql})`).get(...params) as { n: number }
    ).n;
    return {
      items: this.db
        .prepare(`${sql} LIMIT ? OFFSET ?`)
        .all(...params, p.limit, (p.page - 1) * p.limit),
      total,
      ...p,
    };
  }
  private assertLocation(locationId: string) {
    const l = this.db
      .prepare('SELECT active,is_default FROM locations WHERE id=?')
      .get(locationId) as { active: number; is_default: number } | undefined;
    if (!l?.active) throw new DomainError('VALIDATION', 'La ubicación está inactiva o no existe.');
    if (
      !l.is_default &&
      !this.db
        .prepare(
          "SELECT 1 FROM business_features WHERE feature_key='LOCATIONS_TRANSFERS' AND enabled=1",
        )
        .get()
    )
      throw new DomainError('FORBIDDEN', 'Las ubicaciones están desactivadas.');
  }
  private start(raw: unknown, actor: User) {
    const p = z.object({ locationId: id, categoryId: id.optional() }).parse(raw);
    this.assertLocation(p.locationId);
    if (
      p.categoryId &&
      !this.db.prepare('SELECT 1 FROM product_categories WHERE id=? AND active=1').get(p.categoryId)
    )
      throw new DomainError('VALIDATION', 'La categoría no está disponible.');
    return this.db
      .transaction(() => {
        const sessionId = randomUUID(),
          now = new Date().toISOString();
        this.db
          .prepare("INSERT INTO control_count_sessions VALUES (?,?,?,1,'DRAFT',?,?,?,?)")
          .run(sessionId, p.locationId, p.categoryId ?? null, actor.id, actor.name, now, now);
        this.db
          .prepare(
            `INSERT INTO control_count_lines(session_id,product_id) SELECT ?,id FROM products WHERE active=1 AND track_stock=1 AND stock_initialized=1${p.categoryId ? ' AND category_id=?' : ''}`,
          )
          .run(sessionId, ...(p.categoryId ? [p.categoryId] : []));
        return this.get(sessionId);
      })
      .immediate();
  }
  private get(sessionId: string): CountSession {
    const session = this.db
      .prepare(
        'SELECT s.*,l.name location_name FROM control_count_sessions s JOIN locations l ON l.id=s.location_id WHERE s.id=?',
      )
      .get(sessionId) as SessionRow | undefined;
    if (!session) throw new DomainError('NOT_FOUND', 'No se encontró el borrador de conteo.');
    const rows = this.db
      .prepare(
        `SELECT c.*,p.name,p.sku,p.barcode,p.sale_unit,p.active,p.track_stock,p.revision current_product_revision,COALESCE(b.revision,0) current_stock_revision FROM control_count_lines c JOIN products p ON p.id=c.product_id LEFT JOIN location_inventory_balances b ON b.product_id=p.id AND b.location_id=? WHERE c.session_id=? ORDER BY p.search_name,p.id`,
      )
      .all(session.location_id, sessionId) as {
      product_id: string;
      name: string;
      sku: string;
      barcode: string | null;
      sale_unit: 'UNIT' | 'KG';
      counted_base: number | null;
      observed_base: number | null;
      applied_at_utc: string | null;
      stock_revision: number | null;
      product_revision: number | null;
      current_stock_revision: number;
      current_product_revision: number;
      active: number;
      track_stock: number;
      lot_counts_json: string | null;
    }[];
    return {
      id: session.id,
      locationId: session.location_id,
      locationName: session.location_name,
      categoryId: session.category_id,
      revision: session.revision,
      status: session.status,
      updatedAt: session.updated_at_utc,
      lines: rows.map((r) => {
        const saved = r.lot_counts_json
          ? (JSON.parse(r.lot_counts_json) as {
              lotId: string;
              countedBase: number;
              expectedRevision: number;
            }[])
          : [];
        const lots = (
          this.db
            .prepare(
              'SELECT l.id lotId,l.code,b.quantity_base quantityBase,b.revision FROM inventory_lots l JOIN location_lot_balances b ON b.lot_id=l.id WHERE l.product_id=? AND b.location_id=? ORDER BY l.code',
            )
            .all(r.product_id, session.location_id) as CountLine['lots']
        ).map((l) => ({
          ...l,
          countedBase: saved.find((s) => s.lotId === l.lotId)?.countedBase ?? null,
        }));
        const lotChanged =
          saved.length > 0 &&
          (saved.length !== lots.length ||
            saved.some(
              (s) => lots.find((l) => l.lotId === s.lotId)?.revision !== s.expectedRevision,
            ));
        return {
          productId: r.product_id,
          name: r.name,
          sku: r.sku,
          barcode: r.barcode,
          unit: r.sale_unit,
          countedBase: r.counted_base,
          observedBase: r.observed_base,
          differenceBase: r.counted_base === null ? null : r.counted_base - (r.observed_base ?? 0),
          status: r.applied_at_utc
            ? 'APPLIED'
            : r.counted_base === null
              ? 'UNCOUNTED'
              : r.stock_revision !== r.current_stock_revision ||
                  r.product_revision !== r.current_product_revision ||
                  !r.active ||
                  !r.track_stock ||
                  lotChanged
                ? 'REVIEW'
                : 'COUNTED',
          lots,
        };
      }),
    };
  }
  private line(raw: unknown, actor: User) {
    const p = z
      .object({
        sessionId: id,
        expectedRevision: z.number().int().positive(),
        productId: id,
        countedBase: quantity.nullable(),
        lots: z
          .array(
            z.object({
              lotId: id,
              countedBase: quantity,
              expectedRevision: z.number().int().positive(),
            }),
          )
          .max(500)
          .optional(),
      })
      .parse(raw);
    return this.db
      .transaction(() => {
        const s = this.get(p.sessionId);
        this.assertLocation(s.locationId);
        if (s.revision !== p.expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recargalo antes de contar.',
          );
        const line = s.lines.find((l) => l.productId === p.productId);
        if (!line || line.status === 'APPLIED')
          throw new DomainError('VALIDATION', 'Este artículo no está pendiente en el conteo.');
        const product = new CatalogRepository(this.db).get(p.productId);
        if (!product.active || !product.trackStock)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El producto ya no está disponible para contar.',
          );
        const balance = new StockRepository(this.db).balance(p.productId, s.locationId);
        this.db
          .prepare(
            'UPDATE control_count_lines SET counted_base=?,observed_base=?,stock_revision=?,product_revision=?,counted_at_utc=?,lot_counts_json=? WHERE session_id=? AND product_id=?',
          )
          .run(
            p.countedBase,
            balance?.quantity_base ?? 0,
            balance?.revision ?? 0,
            product.revision,
            new Date().toISOString(),
            p.lots ? JSON.stringify(p.lots) : null,
            p.sessionId,
            p.productId,
          );
        this.touch(s.id);
        recordAudit(this.db, actor, 'control.countLine', s.id);
        return this.get(s.id);
      })
      .immediate();
  }
  private touch(sessionId: string) {
    this.db
      .prepare('UPDATE control_count_sessions SET revision=revision+1,updated_at_utc=? WHERE id=?')
      .run(new Date().toISOString(), sessionId);
  }
  private apply(raw: unknown, actor: User) {
    const p = z
        .object({
          sessionId: id,
          expectedRevision: z.number().int().positive(),
          productIds: z.array(id).min(1).max(100),
          reason,
          operationKey: id,
        })
        .parse(raw),
      payloadHash = hash({ ...p, actor: actor.id });
    return this.db
      .transaction(() => {
        const replay = this.db
          .prepare(
            'SELECT payload_hash,result_json FROM control_operation_results WHERE operation_key=?',
          )
          .get(p.operationKey) as { payload_hash: string; result_json: string } | undefined;
        if (replay) {
          if (replay.payload_hash !== payloadHash)
            throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave corresponde a otro ajuste.');
          return JSON.parse(replay.result_json) as CountSession;
        }
        const s = this.get(p.sessionId);
        this.assertLocation(s.locationId);
        if (s.revision !== p.expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recargá antes de aplicar.',
          );
        if (new Set(p.productIds).size !== p.productIds.length)
          throw new DomainError('VALIDATION', 'Seleccioná cada artículo una sola vez.');
        const stock = new StockService(this.db, new CatalogRepository(this.db)),
          ledger = new StockRepository(this.db),
          now = new Date().toISOString();
        for (const productId of p.productIds) {
          const line = s.lines.find((l) => l.productId === productId);
          if (!line || line.status === 'UNCOUNTED' || line.status === 'APPLIED')
            throw new DomainError('VALIDATION', 'Seleccioná solo artículos contados pendientes.');
          if (line.status === 'REVIEW')
            throw new DomainError(
              'REVISION_CONFLICT',
              `La existencia de ${line.name} cambió. Volvé a contar esta fila.`,
            );
          const delta = line.differenceBase!,
            current = stock.get(productId),
            local = ledger.balance(productId, s.locationId);
          this.reconcileLots(
            s.id,
            productId,
            s.locationId,
            line.countedBase!,
            p.operationKey,
            actor,
            p.reason,
            now,
          );
          if (delta !== 0) {
            ledger.appendWithinTransaction({
              productId,
              deltaBase: delta,
              nextBase: line.countedBase!,
              revision: (local?.revision ?? 0) + 1,
              kind: 'ADJUSTMENT',
              reason: p.reason,
              operationKey: randomUUID(),
              hash: payloadHash,
              result: {
                ...current,
                quantityBase: (current.quantityBase ?? 0) + delta,
                revision: current.revision + 1,
              },
              locationId: s.locationId,
              timestamp: now,
            });
          }
          this.db
            .prepare(
              'UPDATE control_count_lines SET applied_at_utc=? WHERE session_id=? AND product_id=?',
            )
            .run(now, s.id, productId);
        }
        this.touch(s.id);
        if (
          !this.db
            .prepare(
              'SELECT 1 FROM control_count_lines WHERE session_id=? AND applied_at_utc IS NULL LIMIT 1',
            )
            .get(s.id)
        )
          this.db
            .prepare("UPDATE control_count_sessions SET status='APPLIED' WHERE id=?")
            .run(s.id);
        const result = this.get(s.id);
        this.db
          .prepare('INSERT INTO control_operation_results VALUES (?,?,?,?)')
          .run(p.operationKey, payloadHash, JSON.stringify(result), now);
        recordAudit(this.db, actor, 'control.countApply', s.id);
        return result;
      })
      .immediate();
  }
  private reconcileLots(
    sessionId: string,
    productId: string,
    locationId: string,
    counted: number,
    key: string,
    actor: User,
    note: string,
    now: string,
  ) {
    const setting = this.db
      .prepare('SELECT enabled,reconciled FROM lot_product_settings WHERE product_id=?')
      .get(productId) as { enabled: number; reconciled: number } | undefined;
    if (!setting?.enabled) return;
    if (
      !setting.reconciled ||
      !this.db
        .prepare("SELECT 1 FROM business_features WHERE feature_key='LOTS' AND enabled=1")
        .get()
    )
      throw new DomainError(
        'FORBIDDEN',
        'Habilitá y conciliá los lotes antes de ajustar este artículo.',
      );
    const saved = this.db
      .prepare(
        'SELECT lot_counts_json FROM control_count_lines WHERE session_id=? AND product_id=?',
      )
      .get(sessionId, productId) as { lot_counts_json: string | null };
    const lots = saved.lot_counts_json
      ? (JSON.parse(saved.lot_counts_json) as {
          lotId: string;
          countedBase: number;
          expectedRevision: number;
        }[])
      : [];
    const current = this.db
      .prepare(
        'SELECT l.id,l.quantity_base total,b.quantity_base local,b.revision FROM inventory_lots l JOIN location_lot_balances b ON b.lot_id=l.id WHERE l.product_id=? AND b.location_id=?',
      )
      .all(productId, locationId) as {
      id: string;
      total: number;
      local: number;
      revision: number;
    }[];
    if (
      lots.length !== current.length ||
      new Set(lots.map((l) => l.lotId)).size !== lots.length ||
      lots.reduce((sum, l) => sum + l.countedBase, 0) !== counted
    )
      throw new DomainError(
        'VALIDATION',
        'Contá cada lote de esta ubicación; la suma debe coincidir con el conteo.',
      );
    const operationKey = `${key}:${productId}:LOTS`;
    this.db
      .prepare("INSERT INTO lot_operations VALUES (?,?,'RECONCILIATION',?,?)")
      .run(operationKey, hash(lots), JSON.stringify(lots), now);
    for (const lot of lots) {
      const before = current.find((l) => l.id === lot.lotId);
      if (!before || before.revision !== lot.expectedRevision)
        throw new DomainError('REVISION_CONFLICT', 'El lote cambió. Volvé a contar.');
      const delta = lot.countedBase - before.local;
      if (!delta) continue;
      this.db
        .prepare(
          'UPDATE location_lot_balances SET quantity_base=?,revision=revision+1 WHERE location_id=? AND lot_id=?',
        )
        .run(lot.countedBase, locationId, lot.lotId);
      this.db
        .prepare(
          'UPDATE inventory_lots SET quantity_base=quantity_base+?,revision=revision+1,updated_at_utc=? WHERE id=?',
        )
        .run(delta, now, lot.lotId);
      this.db
        .prepare(
          "INSERT INTO lot_movements(id,lot_id,delta_base,balance_after_base,kind,reason,operation_key,actor_user_id,actor_name,created_at_utc) VALUES (?,?,?,?,'ADJUSTMENT',?,?,?,?,?)",
        )
        .run(
          randomUUID(),
          lot.lotId,
          delta,
          before.total + delta,
          note,
          operationKey,
          actor.id,
          actor.name,
          now,
        );
    }
  }
  private expiries(raw: unknown) {
    const p = ControlPageSchema.extend({
        bucket: z.enum(['EXPIRED', 'WEEK', 'MONTH', 'ALL']).default('WEEK'),
        locationId: id.optional(),
        lotId: id.optional(),
        today: z.iso.date().optional(),
      }).parse(raw),
      today = p.today ?? date(),
      end = p.bucket === 'MONTH' ? monthEnd(today) : weekEnd(today);
    const params: (string | number)[] = [],
      where = ['b.quantity_base>0', 'l.expires_on IS NOT NULL'];
    if (p.bucket === 'EXPIRED') {
      where.push('l.expires_on<?');
      params.push(today);
    } else if (p.bucket !== 'ALL') {
      where.push('l.expires_on>=? AND l.expires_on<=?');
      params.push(today, end);
    }
    if (p.locationId) {
      where.push('b.location_id=?');
      params.push(p.locationId);
    }
    if (p.lotId) {
      where.push('l.id=?');
      params.push(p.lotId);
    }
    return this.page(
      `SELECT l.id lotId,l.product_id productId,p.name productName,p.sale_unit unit,l.code,l.expires_on expiresOn,l.status,b.location_id locationId,loc.name locationName,b.quantity_base quantityBase FROM inventory_lots l JOIN products p ON p.id=l.product_id JOIN location_lot_balances b ON b.lot_id=l.id JOIN locations loc ON loc.id=b.location_id WHERE ${where.join(' AND ')} ORDER BY l.expires_on,l.id,b.location_id`,
      params,
      p,
    );
  }
  private cash(raw: unknown, actor: User) {
    const p = ControlPageSchema.extend({
        status: z.enum(['PENDING', 'REVIEWED', 'ALL']).default('PENDING'),
        terminalId: id.optional(),
        shiftId: id.optional(),
        fromDate: z.iso.date().optional(),
        toDate: z.iso.date().optional(),
      }).parse(raw),
      params: (string | number)[] = [],
      where = ["s.status='CLOSED'", 's.difference_cents<>0'];
    if (p.status !== 'ALL')
      where.push(p.status === 'PENDING' ? 'r.shift_id IS NULL' : 'r.shift_id IS NOT NULL');
    if (p.terminalId) {
      where.push('s.terminal_id=?');
      params.push(p.terminalId);
    }
    if (p.shiftId) {
      where.push('s.id=?');
      params.push(p.shiftId);
    }
    if (p.fromDate) {
      where.push('substr(s.closed_at_utc,1,10)>=?');
      params.push(p.fromDate);
    }
    if (p.toDate) {
      where.push('substr(s.closed_at_utc,1,10)<=?');
      params.push(p.toDate);
    }
    const base = `FROM register_shifts s JOIN terminals t ON t.id=s.terminal_id JOIN users u ON u.id=s.closed_by LEFT JOIN control_cash_reviews r ON r.shift_id=s.id WHERE ${where.join(' AND ')}`;
    const page = this.page(
      `SELECT s.id shiftId,t.name terminalName,u.name actorName,s.closed_at_utc closedAt,s.expected_cash_cents expectedCents,s.counted_cash_cents countedCents,s.difference_cents differenceCents,COALESCE(r.revision,0) reviewRevision,r.note reviewNote,r.reviewed_at_utc reviewedAt ${base} ORDER BY s.closed_at_utc DESC,s.id`,
      params,
      p,
    );
    return {
      ...page,
      ...(['OWNER', 'ADMIN'].includes(actor.role)
        ? {
            summary: this.db
              .prepare(
                `SELECT COALESCE(SUM(CASE WHEN s.difference_cents<0 THEN -s.difference_cents ELSE 0 END),0) shortagesCents,COALESCE(SUM(CASE WHEN s.difference_cents>0 THEN s.difference_cents ELSE 0 END),0) surplusesCents ${base}`,
              )
              .get(...params),
          }
        : {}),
    };
  }
  private review(raw: unknown, actor: User) {
    const p = z
      .object({ shiftId: id, expectedRevision: z.number().int().min(0), note: reason })
      .parse(raw);
    return this.db
      .transaction(() => {
        if (
          !this.db
            .prepare(
              "SELECT 1 FROM register_shifts WHERE id=? AND status='CLOSED' AND difference_cents<>0",
            )
            .get(p.shiftId)
        )
          throw new DomainError('NOT_FOUND', 'El cierre con diferencias no existe.');
        const row = this.db
          .prepare('SELECT revision FROM control_cash_reviews WHERE shift_id=?')
          .get(p.shiftId) as { revision: number } | undefined;
        if ((row?.revision ?? 0) !== p.expectedRevision)
          throw new DomainError('REVISION_CONFLICT', 'La revisión cambió. Recargá el cierre.');
        const now = new Date().toISOString();
        this.db
          .prepare(
            'INSERT INTO control_cash_reviews VALUES (?,?,?,?,?,?) ON CONFLICT(shift_id) DO UPDATE SET revision=excluded.revision,note=excluded.note,actor_user_id=excluded.actor_user_id,actor_name=excluded.actor_name,reviewed_at_utc=excluded.reviewed_at_utc',
          )
          .run(p.shiftId, p.expectedRevision + 1, p.note, actor.id, actor.name, now);
        this.db
          .prepare('INSERT INTO control_cash_review_history VALUES (?,?,?,?,?,?,?)')
          .run(randomUUID(), p.shiftId, p.expectedRevision + 1, p.note, actor.id, actor.name, now);
        recordAudit(this.db, actor, 'control.cashReview', p.shiftId);
        return { revision: p.expectedRevision + 1 };
      })
      .immediate();
  }
  private obligation(kind: 'CUSTOMER' | 'SUPPLIER', obligationId: string) {
    const customer = kind === 'CUSTOMER',
      row = this.db
        .prepare(
          `SELECT balance_cents,due_on,due_revision FROM ${customer ? 'customer_receivables' : 'supplier_payables'} WHERE ${customer ? 'sale_id' : 'purchase_id'}=?`,
        )
        .get(obligationId) as
        { balance_cents: number; due_on: string | null; due_revision: number } | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'No se encontró la obligación.');
    return row;
  }
  private agenda(raw: unknown) {
    const p = ControlPageSchema.extend({
        kind: z.enum(['CUSTOMER', 'SUPPLIER', 'ALL']).default('ALL'),
        bucket: z.enum(['OVERDUE', 'WEEK', 'NEXT', 'NO_DATE', 'ALL']).default('ALL'),
        today: z.iso.date().optional(),
        partyId: id.optional(),
      }).parse(raw),
      today = p.today ?? date(),
      week = weekEnd(today),
      params: (string | number)[] = [],
      where = ['balanceCents>0'];
    if (p.kind !== 'ALL') {
      where.push('kind=?');
      params.push(p.kind);
    }
    if (p.partyId) {
      where.push('partyId=?');
      params.push(p.partyId);
    }
    if (p.bucket === 'NO_DATE') where.push('dueOn IS NULL');
    if (p.bucket === 'OVERDUE') {
      where.push('dueOn<?');
      params.push(today);
    }
    if (p.bucket === 'WEEK') {
      where.push('dueOn>=? AND dueOn<=?');
      params.push(today, week);
    }
    if (p.bucket === 'NEXT') {
      where.push('dueOn>?');
      params.push(week);
    }
    const base = `FROM (SELECT 'CUSTOMER' kind,r.sale_id obligationId,r.customer_id partyId,c.name,r.balance_cents balanceCents,r.due_on dueOn,r.due_revision dueRevision,r.created_at_utc createdAt FROM customer_receivables r JOIN customers c ON c.id=r.customer_id WHERE r.status='OPEN' UNION ALL SELECT 'SUPPLIER',r.purchase_id,r.supplier_id,s.name,r.balance_cents,r.due_on,r.due_revision,r.created_at_utc FROM supplier_payables r JOIN suppliers s ON s.id=r.supplier_id WHERE r.status='OPEN') WHERE ${where.join(' AND ')}`;
    return {
      ...this.page(`SELECT * ${base} ORDER BY dueOn IS NULL,dueOn,kind,obligationId`, params, p),
      summary: this.db
        .prepare(
          `SELECT COALESCE(SUM(CASE WHEN kind='CUSTOMER' THEN balanceCents ELSE 0 END),0) receivableCents,COALESCE(SUM(CASE WHEN kind='SUPPLIER' THEN balanceCents ELSE 0 END),0) payableCents ${base}`,
        )
        .get(...params),
    };
  }
  private due(raw: unknown, actor: User) {
    const p = z
      .object({
        kind: z.enum(['CUSTOMER', 'SUPPLIER']),
        obligationId: id,
        expectedRevision: z.number().int().positive(),
        expectedBalanceCents: z.number().int().min(0),
        dueOn: z.iso.date().nullable(),
        reason,
      })
      .parse(raw);
    return this.db
      .transaction(() => {
        const row = this.obligation(p.kind, p.obligationId);
        if (row.due_revision !== p.expectedRevision || row.balance_cents !== p.expectedBalanceCents)
          throw new DomainError(
            'REVISION_CONFLICT',
            'La obligación cambió. Recargá la cuenta antes de acordar una fecha.',
          );
        if (row.balance_cents === 0)
          throw new DomainError('VALIDATION', 'La obligación ya está saldada.');
        const customer = p.kind === 'CUSTOMER';
        this.db
          .prepare(
            `UPDATE ${customer ? 'customer_receivables' : 'supplier_payables'} SET due_on=?,due_revision=due_revision+1 WHERE ${customer ? 'sale_id' : 'purchase_id'}=?`,
          )
          .run(p.dueOn, p.obligationId);
        this.db
          .prepare('INSERT INTO control_due_history VALUES (?,?,?,?,?,?,?,?,?,?)')
          .run(
            randomUUID(),
            p.kind,
            p.obligationId,
            row.due_on,
            p.dueOn,
            row.due_revision + 1,
            p.reason,
            actor.id,
            actor.name,
            new Date().toISOString(),
          );
        recordAudit(this.db, actor, 'control.agendaDate', p.obligationId);
        return { dueOn: p.dueOn, revision: row.due_revision + 1 };
      })
      .immediate();
  }
  private export(raw: unknown, actor: User) {
    const p = z
      .object({
        dataset: z.enum(['counts', 'expiries', 'cashDifferences', 'agenda']),
        filters: z.record(z.string(), z.unknown()).default({}),
      })
      .parse(raw);
    if (p.dataset === 'agenda' && !['OWNER', 'ADMIN'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'No tenés permiso para exportar la agenda.');
    let rows: Record<string, unknown>[] = [];
    let title: string;
    let summary: Record<string, unknown> | undefined;
    if (p.dataset === 'counts') {
      const session = this.get(z.object({ sessionId: id }).parse(p.filters).sessionId);
      rows = session.lines.map((l) => ({
        ...l,
        location: session.locationName,
        lots: JSON.stringify(l.lots),
      }));
      title = 'Conteo físico';
    } else {
      title =
        p.dataset === 'agenda'
          ? 'Agenda'
          : p.dataset === 'expiries'
            ? 'Vencimientos'
            : 'Diferencias de caja';
      for (let page = 1; ; page++) {
        const result = this.execute(p.dataset, { ...p.filters, page, limit: 100 }, actor) as {
          items: Record<string, unknown>[];
          total: number;
          summary?: Record<string, unknown>;
        };
        summary = result.summary;
        rows.push(...result.items);
        if (rows.length >= result.total) break;
      }
    }
    return {
      title,
      filters: p.filters,
      sheets: [
        { name: title, columns: Object.keys(rows[0] ?? { resultado: '' }), rows },
        ...(summary ? [{ name: 'Resumen', columns: Object.keys(summary), rows: [summary] }] : []),
        {
          name: 'Filtros',
          columns: ['filtro', 'valor'],
          rows: Object.entries(p.filters).map(([filtro, valor]) => ({
            filtro,
            valor: String(valor ?? ''),
          })),
        },
      ],
    };
  }
}
