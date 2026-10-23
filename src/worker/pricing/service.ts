import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import { PriceConfirmSchema, PricePreviewSchema, type PriceChangeBatch, type PriceConfirmInput, type PricePreview, type PricePreviewInput } from '../../shared/pricing';
import { MAX_MONEY } from '../../domain/values';
import type { CatalogRepository } from '../products/repository';

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export class PriceChangeService {
  constructor(private readonly db: Database.Database, private readonly catalog: CatalogRepository) {}

  preview(raw: PricePreviewInput): PricePreview {
    const input = PricePreviewSchema.parse(raw);
    const items = input.productIds.map((id) => {
      const product = this.catalog.get(id);
      const after = input.change.type === 'FIXED'
        ? input.change.priceCents
        : Number((BigInt(product.priceCents) * BigInt(10000 + input.change.basisPoints) + 5000n) / 10000n);
      if (!Number.isSafeInteger(after) || after < 1 || after > MAX_MONEY)
        throw new DomainError('VALIDATION', `El nuevo precio de ${product.name} queda fuera del rango permitido.`);
      return { productId: product.id, name: product.name, beforeCents: product.priceCents, afterCents: after, expectedRevision: product.revision };
    });
    const now = Date.now();
    const result: PricePreview = {
      previewToken: randomUUID(),
      expiresAt: new Date(now + 15 * 60_000).toISOString(),
      change: input.change,
      items,
    };
    this.db.prepare("DELETE FROM price_change_batches WHERE record_type='PREVIEW' AND expires_at_ms<?").run(now);
    this.db.prepare("INSERT INTO price_change_batches(record_type,id,input_json,result_json,expires_at_ms) VALUES ('PREVIEW',?,?,?,?)").run(
      result.previewToken,
      JSON.stringify(input),
      JSON.stringify(result),
      now + 15 * 60_000,
    );
    return result;
  }

  confirm(raw: PriceConfirmInput, actor: User): PriceChangeBatch {
    const input = PriceConfirmSchema.parse(raw);
    const payloadHash = digest(input);
    return this.db.transaction(() => {
      const replay = this.db.prepare('SELECT id,payload_hash FROM price_change_applications WHERE operation_key=?').get(input.operationKey) as { id: string; payload_hash: string } | undefined;
      if (replay) {
        if (replay.payload_hash !== payloadHash) throw new DomainError('IDEMPOTENCY_CONFLICT', 'La clave ya corresponde a otro cambio de precios.');
        return this.get(replay.id);
      }
      const stored = this.db.prepare('SELECT result_json,expires_at_ms FROM price_change_previews WHERE id=?').get(input.previewToken) as { result_json: string; expires_at_ms: number } | undefined;
      if (!stored || stored.expires_at_ms < Date.now()) throw new DomainError('VALIDATION', 'La vista previa venció. Volvé a revisar los precios.');
      const preview = JSON.parse(stored.result_json) as PricePreview;
      for (const item of preview.items) {
        const product = this.catalog.get(item.productId);
        if (product.revision !== item.expectedRevision || product.priceCents !== item.beforeCents)
          throw new DomainError('REVISION_CONFLICT', `${product.name} cambió después de la vista previa. No se modificó ningún precio.`);
      }
      const id = randomUUID();
      const now = new Date().toISOString();
      this.db.prepare('INSERT INTO price_change_batches(id,operation_key,payload_hash,change_json,item_count,actor_user_id,actor_name,created_at_utc,source_preview_id) VALUES (?,?,?,?,?,?,?,?,?)').run(
        id, input.operationKey, payloadHash, JSON.stringify(preview.change), preview.items.length, actor.id, actor.name, now, input.previewToken,
      );
      const insert = this.db.prepare('INSERT INTO price_change_items VALUES (?,?,?,?,?,?,?)');
      for (const item of preview.items) {
        const update = this.db.prepare('UPDATE products SET price_cents=?,revision=revision+1,updated_at_utc=? WHERE id=? AND revision=? AND price_cents=?').run(item.afterCents, now, item.productId, item.expectedRevision, item.beforeCents);
        if (update.changes !== 1) throw new DomainError('REVISION_CONFLICT', `${item.name} cambió. No se modificó ningún precio.`);
        insert.run(id, item.productId, item.name, item.beforeCents, item.afterCents, item.expectedRevision, item.expectedRevision + 1);
      }
      return this.get(id);
    }).immediate();
  }

  get(id: string): PriceChangeBatch {
    const batch = this.db.prepare('SELECT id,operation_key AS operationKey,item_count AS itemCount,created_at_utc AS createdAt FROM price_change_applications WHERE id=?').get(id) as Omit<PriceChangeBatch, 'items'> | undefined;
    if (!batch) throw new DomainError('NOT_FOUND', 'No se encontró el cambio de precios.');
    const items = this.db.prepare('SELECT product_id AS productId,product_name AS name,before_cents AS beforeCents,after_cents AS afterCents,before_revision AS expectedRevision FROM price_change_items WHERE batch_id=? ORDER BY product_name,product_id').all(id) as PriceChangeBatch['items'];
    return { ...batch, items };
  }
}
