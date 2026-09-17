import type Database from 'better-sqlite3';
import { DraftBodySchema, SaveDraftSchema } from '../shared/catalog';
import type { DraftRecord, SaveDraftInput } from '../shared/catalog';
import { DomainError } from '../shared/errors';

export class DraftRepository {
  constructor(private readonly db: Database.Database) {}
  get(userId?: string): DraftRecord | null {
    const row = this.db
      .prepare('SELECT * FROM checkout_drafts WHERE id=?')
      .get(userId ?? 'main') as
      { body_json: string; revision: number; updated_at_utc: string } | undefined;
    return row
      ? {
          body: DraftBodySchema.parse(JSON.parse(row.body_json)),
          revision: row.revision,
          updatedAt: row.updated_at_utc,
        }
      : null;
  }
  save(raw: SaveDraftInput, userId?: string): DraftRecord {
    const input = SaveDraftSchema.parse(raw);
    return this.db
      .transaction(() => {
        const current = this.get(userId);
        if ((current?.revision ?? 0) !== input.expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recuperá la versión guardada antes de reemplazarlo.',
          );
        const now = new Date().toISOString();
        this.db
          .prepare(
            'INSERT INTO checkout_drafts (id,owner_user_id,revision,body_json,updated_at_utc) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision, body_json=excluded.body_json, updated_at_utc=excluded.updated_at_utc',
          )
          .run(
            userId ?? 'main',
            userId ?? null,
            input.expectedRevision + 1,
            JSON.stringify(input.body),
            now,
          );
        return this.get(userId)!;
      })
      .immediate();
  }
  cancel(expectedRevision: number, userId: string): null {
    return this.db
      .transaction(() => {
        const draft = this.get(userId);
        if ((draft?.revision ?? 0) !== expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'El borrador cambió. Recuperalo antes de cancelar.',
          );
        this.db.prepare('DELETE FROM checkout_drafts WHERE id=?').run(userId);
        return null;
      })
      .immediate();
  }
}
