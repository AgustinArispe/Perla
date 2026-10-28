import { CommercialControlService } from './commercial';
import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import { z } from 'zod';
import type { User } from '../../shared/auth';
import {
  SavedViewSchema,
  type SavedView,
  type ControlHome,
  type ControlPending,
} from '../../shared/control';
import { DomainError } from '../../shared/errors';
import { FeatureService } from '../features/service';
import { hasPermission } from '../../domain/permissions';
import { comparisonPeriods } from '../reports/period';
import { MonthlyReports } from '../reports/queries';
const operations: Record<string, string> = {
  products: 'products.save',
  stock: 'stock.search',
  purchases: 'purchases.list',
  suppliers: 'suppliers.search',
  inventory: 'locations.inventory',
  transfers: 'transfers.list',
  customers: 'customerAccounts.detail',
  promotions: 'promotions.list',
  sales: 'sales.list',
  shifts: 'shifts.list',
  users: 'users.list',
  audit: 'audit.list',
};
const idSchema = z.strictObject({ id: z.uuid(), expectedRevision: z.number().int().positive() });
type Row = {
  id: string;
  module: SavedView['module'];
  name: string;
  filters_json: string;
  dates: SavedView['dates'];
  revision: number;
};
export class WorkspaceControlService {
  constructor(private readonly db: Database.Database) {}
  private access(module: string, actor: User) {
    if (module === 'commercial' || module === 'agenda') {
      if (!['OWNER', 'ADMIN'].includes(actor.role))
        throw new DomainError('FORBIDDEN', 'La vista requiere perfil de jefe.');
      return;
    }
    const operation = operations[module];
    if (!operation || !hasPermission(actor.role, operation))
      throw new DomainError('FORBIDDEN', 'Tu perfil no tiene acceso a esta vista.');
    new FeatureService(this.db).assertOperation(operation, actor.role);
  }
  private row(row: Row): SavedView {
    return {
      id: row.id,
      module: row.module,
      name: row.name,
      filters: JSON.parse(row.filters_json),
      dates: row.dates,
      revision: row.revision,
    };
  }
  execute(action: string, raw: unknown, actor: User): unknown {
    if (actor.role === 'SELLER') throw new DomainError('FORBIDDEN', 'Tu perfil usa Caja.');
    if (action === 'preference') {
      z.strictObject({}).parse(raw);
      return {
        start: this.db
          .prepare('SELECT start_module FROM users WHERE id=? AND start_module IS NOT NULL')
          .get(actor.id) as { start_module: string } | undefined,
      };
    }
    if (action === 'savePreference') {
      const v = z
        .strictObject({
          start: z.enum(['Inicio', 'Caja', 'Productos', 'Stock', 'Compras', 'Resumen mensual']),
        })
        .parse(raw);
      if (v.start === 'Resumen mensual' && !['OWNER', 'ADMIN'].includes(actor.role))
        throw new DomainError('FORBIDDEN', 'No tenés permiso para esa página.');
      this.db.prepare('UPDATE users SET start_module=? WHERE id=?').run(v.start, actor.id);
      return v;
    }
    if (action === 'home') {
      z.strictObject({}).parse(raw);
      return this.home(actor);
    }
    if (action === 'views') {
      const { module } = z.strictObject({ module: z.string().max(40) }).parse(raw);
      this.access(module, actor);
      return (
        this.db
          .prepare('SELECT * FROM saved_views WHERE user_id=? AND module=? ORDER BY name,id')
          .all(actor.id, module) as Row[]
      ).map((r) => this.row(r));
    }
    if (action === 'saveView') {
      const input = SavedViewSchema.parse(raw);
      this.access(input.module, actor);
      if (input.module === 'commercial')
        new FeatureService(this.db).assertOperation(
          input.filters.view === 'rotation' ? 'stock.search' : 'costs.get',
          actor.role,
        );
      return this.db.transaction(() => {
        const now = new Date().toISOString();
        const id = input.id ?? randomUUID();
        if (input.id) {
          const old = this.db
            .prepare('SELECT * FROM saved_views WHERE id=? AND user_id=?')
            .get(id, actor.id) as Row | undefined;
          if (!old) throw new DomainError('NOT_FOUND', 'No se encontró la vista.');
          if (old.revision !== input.expectedRevision)
            throw new DomainError('REVISION_CONFLICT', 'La vista cambió. Volvé a abrirla.');
          this.db
            .prepare(
              'UPDATE saved_views SET module=?,name=?,filters_json=?,dates=?,revision=revision+1,updated_at_utc=? WHERE id=? AND user_id=?',
            )
            .run(
              input.module,
              input.name,
              JSON.stringify(input.filters),
              input.dates,
              now,
              id,
              actor.id,
            );
        } else {
          const count = (
            this.db.prepare('SELECT COUNT(*) n FROM saved_views WHERE user_id=?').get(actor.id) as {
              n: number;
            }
          ).n;
          if (count >= 30)
            throw new DomainError('VALIDATION', 'Tenés 30 vistas. Eliminá una para guardar otra.');
          this.db
            .prepare(
              'INSERT INTO saved_views(id,user_id,module,name,filters_json,dates,revision,created_at_utc,updated_at_utc) VALUES(?,?,?,?,?,?,1,?,?)',
            )
            .run(
              id,
              actor.id,
              input.module,
              input.name,
              JSON.stringify(input.filters),
              input.dates,
              now,
              now,
            );
        }
        return this.row(
          this.db
            .prepare('SELECT * FROM saved_views WHERE id=? AND user_id=?')
            .get(id, actor.id) as Row,
        );
      })();
    }
    if (action === 'deleteView') {
      const input = idSchema.parse(raw);
      const old = this.db
        .prepare('SELECT * FROM saved_views WHERE id=? AND user_id=?')
        .get(input.id, actor.id) as Row | undefined;
      if (!old) throw new DomainError('NOT_FOUND', 'No se encontró la vista.');
      this.access(old.module, actor);
      if (old.revision !== input.expectedRevision)
        throw new DomainError('REVISION_CONFLICT', 'La vista cambió.');
      this.db
        .prepare('DELETE FROM saved_views WHERE id=? AND user_id=? AND revision=?')
        .run(input.id, actor.id, input.expectedRevision);
      return { deleted: true };
    }
    if (action === 'applyView') {
      const { id } = z.strictObject({ id: z.uuid() }).parse(raw);
      const row = this.db
        .prepare('SELECT * FROM saved_views WHERE id=? AND user_id=?')
        .get(id, actor.id) as Row | undefined;
      if (!row) throw new DomainError('NOT_FOUND', 'No se encontró la vista.');
      this.access(row.module, actor);
      const view = this.row(row);
      if (view.module === 'commercial')
        new FeatureService(this.db).assertOperation(
          (view.filters as Record<string, unknown>).view === 'rotation'
            ? 'stock.search'
            : 'costs.get',
          actor.role,
        );
      if (view.dates !== 'FIXED') {
        const period = comparisonPeriods({ preset: view.dates }, new Date());
        view.filters = { ...view.filters, fromDate: period.from, toDate: period.to };
      }
      return view;
    }
    throw new DomainError('VALIDATION', 'Acción desconocida.');
  }
  private home(actor: User): ControlHome {
    const flags = new FeatureService(this.db).status().enabled;
    const groups: ControlPending[] = [];
    const add = (
      key: string,
      title: string,
      area: string,
      action: string,
      countSQL: string,
      rowsSQL: string,
    ) => {
      const total = (this.db.prepare(countSQL).get() as { n: number }).n;
      if (total > 0) {
        const sample = this.db.prepare(rowsSQL + ' LIMIT 3').all() as ControlPending['sample'];
        groups.push({ key, title, total, area, action, sample });
      }
    };
    if (flags.LOTS)
      add(
        'expiries',
        'Revisar vencimientos',
        'operations',
        'expiries',
        "SELECT COUNT(*) n FROM inventory_lots l JOIN location_lot_balances b ON b.lot_id=l.id WHERE l.status='ACTIVE' AND b.quantity_base>0 AND l.expires_on<=date('now','-3 hours','+7 days')",
        "SELECT l.id,p.name,l.expires_on detail,b.location_id locationId FROM inventory_lots l JOIN products p ON p.id=l.product_id JOIN location_lot_balances b ON b.lot_id=l.id WHERE l.status='ACTIVE' AND b.quantity_base>0 AND l.expires_on<=date('now','-3 hours','+7 days') ORDER BY l.expires_on,l.id",
      );
    if (flags.STOCK_CONTROL)
      add(
        'stock',
        'Revisar reposición',
        'replenishment',
        'suggest',
        `SELECT COUNT(*) n FROM products p JOIN location_inventory_balances b ON b.product_id=p.id JOIN locations loc ON loc.id=b.location_id WHERE loc.active=1 AND (loc.is_default=1 OR EXISTS(SELECT 1 FROM business_features WHERE feature_key='LOCATIONS_TRANSFERS' AND enabled=1)) AND p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base`,
        "SELECT p.id,p.name,b.location_id locationId,loc.name detail FROM products p JOIN location_inventory_balances b ON b.product_id=p.id JOIN locations loc ON loc.id=b.location_id WHERE loc.active=1 AND (loc.is_default=1 OR EXISTS(SELECT 1 FROM business_features WHERE feature_key='LOCATIONS_TRANSFERS' AND enabled=1)) AND p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base ORDER BY b.quantity_base,p.name",
      );
    if (actor.role === 'OWNER' || actor.role === 'ADMIN') {
      add(
        'cash',
        'Revisar diferencias de caja',
        'operations',
        'cashDifferences',
        "SELECT COUNT(*) n FROM register_shifts s WHERE s.status='CLOSED' AND s.difference_cents!=0 AND NOT EXISTS(SELECT 1 FROM control_cash_reviews r WHERE r.shift_id=s.id)",
        "SELECT s.id,t.name,'Diferencia pendiente' detail FROM register_shifts s JOIN terminals t ON t.id=s.terminal_id WHERE s.status='CLOSED' AND s.difference_cents!=0 AND NOT EXISTS(SELECT 1 FROM control_cash_reviews r WHERE r.shift_id=s.id) ORDER BY s.closed_at_utc DESC",
      );
      if (flags.CUSTOMERS || flags.SUPPLIER_ACCOUNTS) {
        const received = flags.CUSTOMERS
          ? (
              this.db
                .prepare(
                  "SELECT COUNT(*) n FROM customer_receivables WHERE status='OPEN' AND balance_cents>0",
                )
                .get() as { n: number }
            ).n
          : 0;
        const payable = flags.SUPPLIER_ACCOUNTS
          ? (
              this.db
                .prepare(
                  "SELECT COUNT(*) n FROM supplier_payables WHERE status='OPEN' AND balance_cents>0",
                )
                .get() as { n: number }
            ).n
          : 0;
        if (received + payable > 0)
          groups.push({
            key: 'accounts',
            title: 'Cobros y pagos pendientes',
            total: received + payable,
            area: 'operations',
            action: 'agenda',
            sample: [],
          });
      }
      if (flags.COSTS_MARGIN) {
        const prices = new CommercialControlService(this.db).priceSummary(actor);
        if (prices.total)
          groups.push({
            key: 'prices',
            title: 'Revisar precios',
            total: prices.total,
            area: 'commercial',
            action: 'prices',
            sample: prices.items.map((p) => ({
              id: p.productId,
              name: p.name,
              detail: 'Pendiente de revisión',
            })),
          });
      }
    }
    const now = new Date();
    const day = comparisonPeriods({ preset: 'TODAY' }, now).from;
    const reports = new MonthlyReports(this.db);
    const week = comparisonPeriods({ preset: 'WEEK' }, now);
    const overview =
      flags.MONTHLY_DASHBOARD && hasPermission(actor.role, 'dashboard.monthly')
        ? {
            businessDate: day,
            weekFrom: week.from,
            today: reports.currentTotals({ preset: 'TODAY' }, now),
            week: reports.currentTotals({ preset: 'WEEK' }, now),
            lastSaleDate: (
              this.db
                .prepare("SELECT MAX(business_date) date FROM sale_orders WHERE status='COMPLETED'")
                .get() as { date: string | null }
            ).date,
          }
        : null;
    const registers = this.db
      .prepare(
        `SELECT t.id,t.name,u.name operator,s.opened_at_utc openedAt
      FROM terminals t LEFT JOIN register_shifts s ON s.terminal_id=t.id AND s.status='OPEN'
      LEFT JOIN users u ON u.id=s.opened_by WHERE t.active=1 ORDER BY t.name,t.id`,
      )
      .all() as ControlHome['registers'];
    const balance = (table: string, enabled: boolean) =>
      enabled
        ? (this.db
            .prepare(
              `SELECT COALESCE(SUM(balance_cents),0) total,
          COALESCE(SUM(CASE WHEN due_on<? THEN balance_cents ELSE 0 END),0) overdue
          FROM ${table} WHERE status='OPEN' AND balance_cents>0`,
            )
            .get(day) as { total: number; overdue: number })
        : { total: 0, overdue: 0 };
    let accounts: ControlHome['accounts'] = null;
    if (['OWNER', 'ADMIN'].includes(actor.role) && (flags.CUSTOMERS || flags.SUPPLIER_ACCOUNTS)) {
      const receivable = balance('customer_receivables', flags.CUSTOMERS);
      const payable = balance('supplier_payables', flags.SUPPLIER_ACCOUNTS);
      accounts = {
        receivableCents: receivable.total,
        payableCents: payable.total,
        overdueReceivableCents: receivable.overdue,
        overduePayableCents: payable.overdue,
      };
    }
    return {
      groups: groups.slice(0, 5),
      preparedOrders: {
        enabled: flags.PREPARED_ORDERS,
        total: (
          this.db.prepare("SELECT COUNT(*) n FROM prepared_orders WHERE status='READY'").get() as {
            n: number;
          }
        ).n,
      },
      generatedAt: now.toISOString(),
      overview,
      registers,
      accounts,
    };
  }
}
