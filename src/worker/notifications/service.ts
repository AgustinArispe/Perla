import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import type { BusinessNotification, NotificationInbox, NotificationMarkRead } from '../../shared/notifications';
import { NotificationMarkReadSchema } from '../../shared/notifications';
import { DomainError } from '../../shared/errors';
import { FeatureService } from '../features/service';
import { comparisonPeriods } from '../reports/period';

type ReadRow = { notification_key: string; signature: string };
const localDate = (now: Date) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
const plusDays = (value: string, days: number) => {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
const quantityLabel = (base: number, unit: 'UNIT' | 'KG') =>
  unit === 'KG'
    ? `${(base / 1000).toLocaleString('es-AR', { maximumFractionDigits: 3 })} kg`
    : `${base.toLocaleString('es-AR')} u.`;

export class NotificationService {
  private readonly features: FeatureService;
  constructor(private readonly db: Database.Database) {
    this.features = new FeatureService(db);
  }

  list(actor: User, now = new Date()): NotificationInbox {
    if (actor.role === 'SELLER') throw new DomainError('FORBIDDEN', 'Tu perfil no usa notificaciones de gestión.');
    const items: BusinessNotification[] = [];
    const flags = this.features.status().enabled;
    if (flags.STOCK_CONTROL) {
      const rows = this.db
        .prepare(
          `SELECT p.id,p.name,p.sale_unit unit,p.min_stock_base minimum,b.quantity_base quantity,
             COALESCE((SELECT MAX(m.created_at_utc) FROM stock_movements m WHERE m.product_id=p.id),p.updated_at_utc) changed
           FROM products p JOIN inventory_balances b ON b.product_id=p.id
           WHERE p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base
           ORDER BY b.quantity_base ASC,p.name ASC LIMIT 20`,
        )
        .all() as { id: string; name: string; unit: 'UNIT' | 'KG'; minimum: number; quantity: number; changed: string }[];
      for (const row of rows)
        items.push({
          key: `stock:${row.id}`,
          signature: `${row.quantity}:${row.minimum}`,
          kind: 'LOW_STOCK',
          severity: row.quantity <= 0 ? 'CRITICAL' : 'WARNING',
          title: row.quantity <= 0 ? `${row.name} sin stock` : `${row.name} con poco stock`,
          detail: `${quantityLabel(row.quantity, row.unit)} disponibles · mínimo ${quantityLabel(row.minimum, row.unit)}`,
          occurredAt: row.changed,
          destination: 'STOCK',
          read: false,
        });
    }
    if (flags.LOTS) {
      const today = localDate(now),
        limit = plusDays(today, 7);
      const row = this.db
        .prepare(
          `SELECT COUNT(*) count,MIN(expires_on) nearest,MAX(updated_at_utc) changed
           FROM inventory_lots
           WHERE status='ACTIVE' AND quantity_base>0 AND expires_on IS NOT NULL AND expires_on<=?`,
        )
        .get(limit) as { count: number; nearest: string | null; changed: string | null };
      if (row.count > 0)
        items.push({
          key: 'lots:expiring',
          signature: `${row.count}:${row.nearest}`,
          kind: 'EXPIRING_LOTS',
          severity: row.nearest! < today ? 'CRITICAL' : 'WARNING',
          title: `${row.count} ${row.count === 1 ? 'lote requiere' : 'lotes requieren'} revisión`,
          detail: row.nearest! < today ? 'Hay mercadería vencida con existencia.' : `Próximo vencimiento: ${row.nearest}`,
          occurredAt: row.changed ?? now.toISOString(),
          destination: 'LOTS',
          read: false,
        });
    }
    if (actor.role === 'OWNER' || actor.role === 'ADMIN') {
      const shifts = this.db
        .prepare(
          `SELECT s.id,t.name terminal,s.difference_cents difference,s.closed_at_utc closed
           FROM register_shifts s JOIN terminals t ON t.id=s.terminal_id
           WHERE s.status='CLOSED' AND s.difference_cents!=0
           ORDER BY s.closed_at_utc DESC LIMIT 5`,
        )
        .all() as { id: string; terminal: string; difference: number; closed: string }[];
      for (const row of shifts)
        items.push({
          key: `cash:${row.id}`,
          signature: String(row.difference),
          kind: 'CASH_DIFFERENCE',
          severity: 'WARNING',
          title: `Diferencia en ${row.terminal}`,
          detail: `${row.difference > 0 ? 'Sobrante' : 'Faltante'} de $ ${Math.abs(row.difference / 100).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
          occurredAt: row.closed,
          destination: 'SHIFTS',
          read: false,
        });
      const period = comparisonPeriods({ preset: 'WEEK' }, now);
      const totals = (from: string, to: string) =>
        this.db
          .prepare(
            `SELECT COUNT(*) count,COALESCE(SUM(total_cents),0) net FROM sale_orders
             WHERE status='COMPLETED' AND business_date BETWEEN ? AND ?`,
          )
          .get(from, to) as { count: number; net: number };
      const current = totals(period.from, period.to),
        previous = totals(period.previousFrom, period.previousTo);
      if (previous.count >= 5 && current.net * 100 < previous.net * 70)
        items.push({
          key: 'sales:weekly-drop',
          signature: `${period.to}:${current.net}:${previous.net}`,
          kind: 'SALES_DROP',
          severity: 'INFO',
          title: 'La semana viene por debajo de la anterior',
          detail: 'Revisá el comparativo antes de sacar conclusiones.',
          occurredAt: now.toISOString(),
          destination: 'DASHBOARD',
          read: false,
        });
    }
    const reads = this.db
      .prepare('SELECT notification_key,signature FROM notification_reads WHERE user_id=?')
      .all(actor.id) as ReadRow[];
    const signatures = new Map(reads.map((row) => [row.notification_key, row.signature]));
    for (const item of items) item.read = signatures.get(item.key) === item.signature;
    items.sort((a, b) => Number(a.read) - Number(b.read) || b.occurredAt.localeCompare(a.occurredAt) || a.key.localeCompare(b.key));
    return { unreadCount: items.filter((item) => !item.read).length, items, generatedAt: now.toISOString() };
  }

  markRead(raw: NotificationMarkRead, actor: User): NotificationInbox {
    const input = NotificationMarkReadSchema.parse(raw);
    const active = this.list(actor).items.find((item) => item.key === input.key && item.signature === input.signature);
    if (!active) throw new DomainError('REVISION_CONFLICT', 'El aviso cambió. Actualizá la bandeja.');
    this.db
      .prepare(
        `INSERT INTO notification_reads(user_id,notification_key,signature,read_at_utc) VALUES(?,?,?,?)
         ON CONFLICT(user_id,notification_key) DO UPDATE SET signature=excluded.signature,read_at_utc=excluded.read_at_utc`,
      )
      .run(actor.id, input.key, input.signature, new Date().toISOString());
    return this.list(actor);
  }
}
