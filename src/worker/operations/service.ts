import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { OperationSchemas, type OperationName } from '../../shared/operations';
import { hasPermission } from '../../domain/permissions';
import { DomainError } from '../../shared/errors';
import { recordAudit } from '../auth/audit';
import { CashService, shiftSql } from './cash';
import { exportCsv } from './export';
import { FeatureService } from '../features/service';
const terminalSql =
  'SELECT t.id,t.name,t.active,t.revision,t.created_at_utc AS createdAt,t.updated_at_utc AS updatedAt,tl.location_id AS locationId,l.name AS locationName FROM terminals t LEFT JOIN terminal_locations tl ON tl.terminal_id=t.id LEFT JOIN locations l ON l.id=tl.location_id';
export class OperationsService {
  readonly cash: CashService;
  private readonly features: FeatureService;
  constructor(private readonly db: Database.Database) {
    this.cash = new CashService(db);
    this.features = new FeatureService(db);
  }
  execute(operation: string, payload: unknown, actor: User): unknown {
    if (!actor.active || !hasPermission(actor.role, operation))
      throw new DomainError('FORBIDDEN', 'No tenés permiso para esta operación.');
    if (!Object.hasOwn(OperationSchemas, operation))
      throw new DomainError('VALIDATION', 'Operación desconocida.');
    const input = OperationSchemas[operation as OperationName].parse(payload) as Record<
      string,
      unknown
    >;
    switch (operation) {
      case 'settings.get':
        return this.settings();
      case 'settings.features.get':
        return this.features.status();
      case 'settings.features.save':
        return this.features.change(input as never, actor);
      case 'settings.save':
        return this.db
          .transaction(() => {
            const old = this.settings();
            if (old.revision !== input.expectedRevision)
              throw new DomainError('REVISION_CONFLICT', 'La configuración cambió.');
            this.db
              .prepare(
                'UPDATE business_settings SET business_name=?,currency=?,payment_methods_json=?,revision=revision+1,updated_at_utc=? WHERE id=1',
              )
              .run(
                input.businessName,
                input.currency,
                JSON.stringify(input.paymentMethods),
                new Date().toISOString(),
              );
            recordAudit(this.db, actor, operation, '1');
            return this.settings();
          })
          .immediate();
      case 'terminals.list':
      case 'terminals.active':
        return this.db
          .prepare(
            terminalSql +
              (operation === 'terminals.active' ? ' WHERE t.active=1' : '') +
              ' ORDER BY t.name,t.id',
          )
          .all()
          .map((row) => ({
            ...(row as Record<string, unknown>),
            active: Boolean((row as { active: number }).active),
          }));
      case 'terminals.save':
        return this.db
          .transaction(() => {
            const now = new Date().toISOString(),
              id = (input.id as string | undefined) ?? randomUUID();
            if (input.id) {
              const old = this.db.prepare('SELECT revision FROM terminals WHERE id=?').get(id) as
                { revision: number } | undefined;
              if (!old) throw new DomainError('NOT_FOUND', 'La terminal no existe.');
              if (old.revision !== input.expectedRevision)
                throw new DomainError('REVISION_CONFLICT', 'La terminal cambió.');
              if (
                !input.active &&
                this.db
                  .prepare("SELECT id FROM register_shifts WHERE terminal_id=? AND status='OPEN'")
                  .get(id)
              )
                throw new DomainError(
                  'VALIDATION',
                  'Cerrá la caja antes de desactivar la terminal.',
                );
              this.db
                .prepare(
                  'UPDATE terminals SET name=?,active=?,revision=revision+1,updated_at_utc=? WHERE id=?',
                )
                .run(input.name, Number(input.active), now, id);
            } else
              this.db
                .prepare('INSERT INTO terminals VALUES (?,?,?,1,?,?)')
                .run(id, input.name, Number(input.active), now, now);
            this.db.prepare(`INSERT INTO terminal_locations(terminal_id,location_id,updated_at_utc)
              VALUES (?,(SELECT id FROM locations WHERE is_default=1),?)
              ON CONFLICT(terminal_id) DO NOTHING`).run(id,now);
            recordAudit(this.db, actor, operation, id);
            const row = this.db.prepare(terminalSql + ' WHERE t.id=?').get(id) as Record<
              string,
              unknown
            >;
            return { ...row, active: Boolean(row.active) };
          })
          .immediate();
      case 'cash.current':
        return this.cash.current(input.terminalId as string, actor);
      case 'cash.open':
        return this.cash.open(input as never, actor);
      case 'cash.close':
        return this.cash.close(input as never, actor);
      case 'cash.movement':
        return this.cash.movement(input as never, actor);
      case 'shifts.details': {
        const shift = this.cash.detail(input.shiftId as string, actor);
        return {
          ...shift,
          expectedCashCents:
            shift.status === 'OPEN' ? this.cash.expected(shift) : shift.expectedCashCents,
          movements: this.db
            .prepare(
              'SELECT id,kind,amount_cents AS amountCents,reason,actor_user_id AS actorUserId,created_at_utc AS createdAt,sale_id AS saleId FROM register_movements WHERE shift_id=? ORDER BY created_at_utc,id',
            )
            .all(shift.id),
        };
      }
      case 'shifts.list':
        return this.page('shifts', input);
      case 'audit.list':
        return this.page('audit', input);
      default:
        return exportCsv(this.db, operation, input as never);
    }
  }
  private settings() {
    const row = this.db
      .prepare(
        'SELECT business_name AS businessName,currency,payment_methods_json AS paymentMethods,revision,updated_at_utc AS updatedAt FROM business_settings WHERE id=1',
      )
      .get() as {
      businessName: string;
      currency: string;
      paymentMethods: string;
      revision: number;
      updatedAt: string;
    };
    return { ...row, paymentMethods: JSON.parse(row.paymentMethods) as string[] };
  }
  private page(kind: 'shifts' | 'audit', input: Record<string, unknown>) {
    const from = input.fromDate as string | undefined,
      to = input.toDate as string | undefined;
    if (from && to && from > to) throw new DomainError('VALIDATION', 'El rango no es válido.');
    const filter = JSON.stringify({ ...input, cursor: undefined });
    let after: { date: string; id: string } | undefined;
    if (input.cursor) {
      try {
        const c = JSON.parse(Buffer.from(input.cursor as string, 'base64url').toString()) as {
          filter: string;
          date: string;
          id: string;
        };
        if (c.filter !== filter || typeof c.date !== 'string' || typeof c.id !== 'string')
          throw new Error();
        after = c;
      } catch {
        throw new DomainError('VALIDATION', 'La página no es válida.');
      }
    }
    const date = kind === 'shifts' ? 'opened_at_utc' : 'created_at_utc';
    const where: string[] = [];
    const args: unknown[] = [];
    if (from) {
      where.push(`${date}>=?`);
      args.push(from + 'T03:00:00.000Z');
    }
    if (to) {
      where.push(`${date}<?`);
      args.push(new Date(Date.parse(to) + 86400000 + 3 * 3600000).toISOString());
    }
    for (const [key, column] of (kind === 'shifts'
      ? [
          ['terminalId', 'terminal_id'],
          ['status', 'status'],
        ]
      : [
          ['actorUserId', 'actor_user_id'],
          ['operation', 'operation'],
        ]) as [string, string][])
      if (input[key] && input[key] !== 'ALL') {
        where.push(`${column}=?`);
        args.push(input[key]);
      }
    if (after) {
      where.push(`(${date}<? OR (${date}=? AND id<?))`);
      args.push(after.date, after.date, after.id);
    }
    const sql =
      kind === 'shifts'
        ? shiftSql
        : 'SELECT id,operation,entity_id AS entityId,actor_user_id AS actorUserId,actor_name AS actorName,created_at_utc AS createdAt FROM audit_actions';
    const limit = input.limit as number;
    args.push(limit + 1);
    const rows = this.db
      .prepare(
        sql +
          (where.length ? ' WHERE ' + where.join(' AND ') : '') +
          ` ORDER BY ${date} DESC,id DESC LIMIT ?`,
      )
      .all(...args) as Record<string, unknown>[];
    const items = rows.slice(0, limit),
      last = items.at(-1);
    return {
      items,
      nextCursor:
        rows.length > limit && last
          ? Buffer.from(
              JSON.stringify({
                filter,
                date: last[kind === 'shifts' ? 'openedAt' : 'createdAt'],
                id: last.id,
              }),
            ).toString('base64url')
          : null,
    };
  }
}
