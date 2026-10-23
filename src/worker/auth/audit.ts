import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
export function recordAudit(
  db: Database.Database,
  actor: User,
  operation: string,
  entityId: string | null,
): void {
  if (!db.inTransaction) throw new Error('La auditoría requiere una transacción.');
  db.prepare(
    'INSERT INTO audit_events(id,operation,entity_id,actor_user_id,actor_name,created_at_utc) VALUES (?,?,?,?,?,?)',
  ).run(randomUUID(), operation, entityId, actor.id, actor.name, new Date().toISOString());
}
