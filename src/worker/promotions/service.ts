import { randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import { PromotionSaveSchema, type Promotion, type PromotionSaveInput } from '../../shared/promotions';
import type { PromotionRule } from '../../domain/promotions';

export class PromotionService {
  constructor(private readonly db: Database.Database) {}
  save(raw: PromotionSaveInput, actor: User): Promotion {
    const input = PromotionSaveSchema.parse(raw);
    const productIds = input.type === 'COMBO_PRICE' ? input.components.map((item) => item.productId) : input.productIds;
    this.assertReferences('products', productIds, 'producto');
    this.assertReferences('product_categories', input.categoryIds, 'categoría');
    this.assertReferences('product_brands', input.brandIds, 'marca');
    const now = new Date().toISOString();
    const id = input.id ?? randomUUID();
    const rule = input.type === 'PERCENT' ? { basisPoints: input.basisPoints }
      : input.type === 'X_FOR_Y' ? { buyQuantity: input.buyQuantity, payQuantity: input.payQuantity }
      : input.type === 'QUANTITY_PRICE' ? { thresholdBase: input.thresholdBase, specialPriceCents: input.specialPriceCents }
      : { comboPriceCents: input.comboPriceCents, components: input.components };
    const targets = { productIds: input.productIds, categoryIds: input.categoryIds, brandIds: input.brandIds };
    if (input.id) {
      const result = this.db.prepare(`UPDATE promotions SET name=?,type=?,status=?,priority=?,starts_at_utc=?,ends_at_utc=?,rule_json=?,targets_json=?,revision=revision+1,actor_user_id=?,actor_name=?,updated_at_utc=? WHERE id=? AND revision=?`).run(input.name,input.type,input.status,input.priority,input.startsAt,input.endsAt,JSON.stringify(rule),JSON.stringify(targets),actor.id,actor.name,now,id,input.expectedRevision);
      if (result.changes !== 1) throw new DomainError('REVISION_CONFLICT','La promoción cambió. Actualizá antes de guardar.');
    } else this.db.prepare('INSERT INTO promotions VALUES (?,?,?,?,?,?,?,?,?,1,?,?,?,?)').run(id,input.name,input.type,input.status,input.priority,input.startsAt,input.endsAt,JSON.stringify(rule),JSON.stringify(targets),actor.id,actor.name,now,now);
    return this.get(id);
  }
  private assertReferences(table: 'products' | 'product_categories' | 'product_brands', ids: string[], label: string) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const count = (this.db.prepare(`SELECT COUNT(*) AS value FROM ${table} WHERE id IN (${unique.map(() => '?').join(',')})`).get(...unique) as { value: number }).value;
    if (count !== unique.length)
      throw new DomainError('VALIDATION', `Hay un ${label} que ya no está disponible.`);
  }
  get(id: string): Promotion {
    const row = this.db.prepare('SELECT * FROM promotions WHERE id=?').get(id) as {
      id: string; name: string; type: PromotionSaveInput['type']; status: PromotionSaveInput['status']; priority: number;
      starts_at_utc: string | null; ends_at_utc: string | null; rule_json: string; targets_json: string;
      revision: number; actor_name: string; created_at_utc: string; updated_at_utc: string;
    } | undefined;
    if (!row) throw new DomainError('NOT_FOUND','La promoción no existe.');
    const rule = JSON.parse(row.rule_json), targets = JSON.parse(row.targets_json);
    return { id: row.id, revision: row.revision, createdAt: row.created_at_utc, updatedAt: row.updated_at_utc, actorName: row.actor_name, input: { id: row.id, expectedRevision: row.revision, name: row.name, type: row.type, status: row.status, priority: row.priority, startsAt: row.starts_at_utc, endsAt: row.ends_at_utc, ...targets, ...rule } as PromotionSaveInput };
  }
  list(): Promotion[] { return (this.db.prepare('SELECT id FROM promotions ORDER BY status,name,id').all() as {id:string}[]).map((r)=>this.get(r.id)); }
  activeRules(productIds: string[], now: string): PromotionRule[] {
    const products = new Map((this.db.prepare(`SELECT id,category_id,brand_id FROM products WHERE id IN (${productIds.map(()=>'?').join(',') || "''"})`).all(...productIds) as {id:string;category_id:string|null;brand_id:string|null}[]).map((p)=>[p.id,p]));
    const result: PromotionRule[] = [];
    for (const { id } of this.db.prepare("SELECT id FROM promotions WHERE status='ACTIVE' AND (starts_at_utc IS NULL OR starts_at_utc<=?) AND (ends_at_utc IS NULL OR ends_at_utc>?) ORDER BY priority DESC,id").all(now,now) as {id:string}[]) {
      const promo=this.get(id), input=promo.input, targets=input.type==='COMBO_PRICE' ? input.components.map(c=>c.productId) : [...input.productIds,...productIds.filter(pid=>{const p=products.get(pid);return (p?.category_id&&input.categoryIds.includes(p.category_id))||(p?.brand_id&&input.brandIds.includes(p.brand_id));})];
      if (input.type!=='COMBO_PRICE' && !targets.some(id=>products.has(id))) continue;
      const common={id:promo.id,name:input.name,revision:promo.revision,priority:input.priority,productIds:[...new Set(targets)]};
      if(input.type==='PERCENT') result.push({...common,type:input.type,basisPoints:input.basisPoints});
      else if(input.type==='X_FOR_Y') result.push({...common,type:input.type,buyQuantity:input.buyQuantity,payQuantity:input.payQuantity});
      else if(input.type==='QUANTITY_PRICE') result.push({...common,type:input.type,thresholdBase:input.thresholdBase,specialPriceCents:input.specialPriceCents});
      else result.push({...common,type:input.type,comboPriceCents:input.comboPriceCents,components:input.components});
    }
    return result;
  }
}
