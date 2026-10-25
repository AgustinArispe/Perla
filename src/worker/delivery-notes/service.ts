import { createHash, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { z } from 'zod';
import type { User } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import {
  DeliveryNoteCreateSchema,
  DeliveryNoteActionSchema,
  DeliveryNoteListSchema,
  DeliveryNoteSourcesSchema,
  deliveryNoteFeatures,
  type DeliveryNote,
  type DeliveryNoteCreate,
  type DeliveryNoteAction,
  type DeliveryNoteKind,
  type DeliveryNoteSnapshot,
  type DeliveryNoteSource,
} from '../../shared/delivery-notes';
import { FeatureService } from '../features/service';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const noteSelect = `SELECT n.*,COALESCE(s.status,p.status,t.status) source_status,r.number supersedes_number
  FROM delivery_notes n LEFT JOIN sales s ON s.id=n.sale_id
  LEFT JOIN purchases p ON p.id=n.purchase_id LEFT JOIN stock_transfers t ON t.id=n.transfer_id
  LEFT JOIN delivery_notes r ON r.id=n.supersedes_id`;
const sourceTables = {
  SALE: {
    table: 'sale_orders',
    column: 'sale_id',
    valid: "status='COMPLETED'",
    date: 'created_at_utc',
    recipient: "COALESCE(customer_name,'Consumidor final')",
  },
  PURCHASE: {
    table: 'purchases',
    column: 'purchase_id',
    valid: "status='RECEIVED'",
    date: 'received_at_utc',
    recipient: 'supplier_name',
  },
  TRANSFER: {
    table: 'stock_transfers',
    column: 'transfer_id',
    valid: "status IN ('IN_TRANSIT','RECEIVED')",
    date: 'dispatched_at_utc',
    recipient: '(SELECT name FROM locations WHERE id=to_location_id)',
  },
} as const;
type Row = {
  id: string;
  number: number;
  kind: DeliveryNoteKind;
  sale_id: string | null;
  purchase_id: string | null;
  transfer_id: string | null;
  status: DeliveryNote['status'];
  revision: number;
  created_at_utc: string;
  actor_name: string;
  snapshot_json: string;
  supersedes_id: string | null;
  source_status: string;
  supersedes_number: number | null;
  delivered_at_utc: string | null;
  delivered_by_name: string | null;
  delivery_reason: string | null;
  cancelled_at_utc: string | null;
  cancelled_by_name: string | null;
  cancel_reason: string | null;
};

export class DeliveryNoteService {
  private readonly features: FeatureService;
  constructor(private readonly db: Database.Database) {
    this.features = new FeatureService(db);
  }
  private allowed(kind: DeliveryNoteKind, actor: User, history = false) {
    if (!['OWNER', 'ADMIN', 'SUPERVISOR'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Tu perfil no puede gestionar remitos.');
    if (history && ['OWNER', 'ADMIN'].includes(actor.role)) return;
    if (!this.features.isEnabled(deliveryNoteFeatures[kind]))
      throw new DomainError('FORBIDDEN', 'Este tipo de remito está desactivado para el negocio.');
    if (!history && kind === 'PURCHASE' && !this.features.isEnabled('SUPPLIERS_PURCHASES'))
      throw new DomainError('FORBIDDEN', 'Proveedores y compras está desactivado.');
    if (!history && kind === 'TRANSFER' && !this.features.isEnabled('LOCATIONS_TRANSFERS'))
      throw new DomainError('FORBIDDEN', 'Ubicaciones y traslados está desactivado.');
  }
  sources(raw: z.input<typeof DeliveryNoteSourcesSchema>, actor: User): DeliveryNoteSource[] {
    const input = DeliveryNoteSourcesSchema.parse(raw);
    this.allowed(input.kind, actor);
    const s = sourceTables[input.kind];
    return this.db
      .prepare(
        `SELECT id,number,${s.date} date,${s.recipient} recipient,status FROM ${s.table} WHERE ${s.valid}
      AND NOT EXISTS(SELECT 1 FROM delivery_notes n WHERE n.${s.column}=${s.table}.id AND n.status<>'CANCELLED')
      ${input.number ? 'AND number=@number' : ''} ORDER BY number DESC LIMIT 30`,
      )
      .all(input.number ? { number: input.number } : {}) as DeliveryNoteSource[];
  }
  private row(id: string): Row {
    const row = this.db.prepare(`${noteSelect} WHERE n.id=?`).get(id) as Row | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'El remito no existe.');
    return row;
  }
  private render(row: Row): DeliveryNote {
    const sourceId = (row.sale_id ?? row.purchase_id ?? row.transfer_id)!;
    return {
      id: row.id,
      number: row.number,
      kind: row.kind,
      sourceId,
      supersedesNumber: row.supersedes_number,
      status: row.status,
      sourceStatus: row.source_status,
      revision: row.revision,
      createdAt: row.created_at_utc,
      actorName: row.actor_name,
      deliveredAt: row.delivered_at_utc,
      deliveredBy: row.delivered_by_name,
      deliveryReason: row.delivery_reason,
      cancelledAt: row.cancelled_at_utc,
      cancelledBy: row.cancelled_by_name,
      cancelReason: row.cancel_reason,
      snapshot: JSON.parse(row.snapshot_json) as DeliveryNoteSnapshot,
    };
  }
  detail(id: string, actor: User): DeliveryNote {
    const row = this.row(id);
    this.allowed(row.kind, actor, true);
    return this.render(row);
  }
  list(raw: z.input<typeof DeliveryNoteListSchema>, actor: User) {
    const input = DeliveryNoteListSchema.parse(raw);
    if (!['OWNER', 'ADMIN', 'SUPERVISOR'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Tu perfil no puede consultar remitos.');
    const kinds = (['SALE', 'PURCHASE', 'TRANSFER'] as const).filter(
      (k) =>
        (!input.kind || input.kind === k) &&
        (actor.role !== 'SUPERVISOR' || this.features.isEnabled(deliveryNoteFeatures[k])),
    );
    if (!kinds.length) return { items: [], total: 0 };
    const where = `n.kind IN (${kinds.map(() => '?').join(',')})${input.status ? ' AND n.status=?' : ''}`;
    const args = [...kinds, ...(input.status ? [input.status] : [])];
    const total = (
      this.db.prepare(`SELECT count(*) n FROM delivery_notes n WHERE ${where}`).get(...args) as {
        n: number;
      }
    ).n;
    const rows = this.db
      .prepare(`${noteSelect} WHERE ${where} ORDER BY n.number DESC LIMIT ? OFFSET ?`)
      .all(...args, input.limit, input.offset) as Row[];
    return { items: rows.map((row) => this.render(row)), total };
  }
  create(raw: DeliveryNoteCreate, actor: User): DeliveryNote {
    const input = DeliveryNoteCreateSchema.parse(raw);
    this.allowed(input.kind, actor);
    const work = () => {
      const payloadHash = hash(input);
      const retry = this.db
        .prepare('SELECT id,payload_hash FROM delivery_notes WHERE operation_key=?')
        .get(input.operationKey) as { id: string; payload_hash: string } | undefined;
      if (retry) {
        if (retry.payload_hash !== payloadHash)
          throw new DomainError('VALIDATION', 'La clave de emisión ya se usó con otros datos.');
        return this.detail(retry.id, actor);
      }
      const s = sourceTables[input.kind];
      const source = this.db
        .prepare(`SELECT id,number,${s.date} date,status FROM ${s.table} WHERE id=? AND ${s.valid}`)
        .get(input.sourceId) as { number: number; date: string; status: string } | undefined;
      if (!source)
        throw new DomainError('VALIDATION', 'El documento de origen no existe o está anulado.');
      const existing = this.db
        .prepare(`SELECT number FROM delivery_notes WHERE ${s.column}=? AND status<>'CANCELLED'`)
        .get(input.sourceId) as { number: number } | undefined;
      if (existing)
        throw new DomainError(
          'VALIDATION',
          `El documento ya tiene el remito N.º ${existing.number}. Consultalo en el historial.`,
        );
      const superseded = this.db
        .prepare(
          `SELECT id FROM delivery_notes WHERE ${s.column}=? AND status='CANCELLED' ORDER BY number DESC LIMIT 1`,
        )
        .get(input.sourceId) as { id: string } | undefined;
      if (
        input.kind === 'SALE' &&
        this.db
          .prepare(
            "SELECT 1 FROM sales WHERE document_type='RETURN' AND original_sale_id=? LIMIT 1",
          )
          .get(input.sourceId)
      )
        throw new DomainError(
          'VALIDATION',
          'La venta tiene devoluciones. Revisá la entrega antes de emitir un remito.',
        );
      let origin: string;
      let destination = input.address || input.recipient;
      let items: DeliveryNoteSnapshot['items'];
      if (input.kind === 'SALE') {
        items = this.db
          .prepare(
            'SELECT id sourceItemId,product_id productId,sku,name,unit,quantity_base quantityBase FROM sale_order_items WHERE sale_id=? ORDER BY position',
          )
          .all(input.sourceId) as typeof items;
        origin =
          (
            this.db
              .prepare(
                'SELECT l.name FROM locations l JOIN sale_orders s ON s.location_id=l.id WHERE s.id=?',
              )
              .get(input.sourceId) as { name: string } | undefined
          )?.name ?? 'Ubicación principal';
      } else if (input.kind === 'PURCHASE') {
        items = this.db
          .prepare(
            'SELECT id sourceItemId,product_id productId,sku,name,unit,quantity_base quantityBase FROM purchase_items WHERE purchase_id=? ORDER BY position',
          )
          .all(input.sourceId) as typeof items;
        origin = (
          this.db
            .prepare('SELECT supplier_name name FROM purchases WHERE id=?')
            .get(input.sourceId) as { name: string }
        ).name;
        const locations = this.db
          .prepare(
            "SELECT DISTINCT l.name FROM stock_movements m JOIN locations l ON l.id=m.location_id WHERE m.purchase_id=? AND m.kind='RECEIPT'",
          )
          .all(input.sourceId) as { name: string }[];
        destination = locations.map((l) => l.name).join(', ') || 'Recepción registrada';
      } else {
        items = this.db
          .prepare(
            'SELECT id sourceItemId,product_id productId,sku,product_name name,unit,dispatched_base quantityBase FROM stock_transfer_items WHERE transfer_id=? ORDER BY product_name,id',
          )
          .all(input.sourceId) as typeof items;
        const location = this.db
          .prepare(
            'SELECT f.name origin,t.name destination FROM stock_transfers s JOIN locations f ON f.id=s.from_location_id JOIN locations t ON t.id=s.to_location_id WHERE s.id=?',
          )
          .get(input.sourceId) as { origin: string; destination: string };
        origin = location.origin;
        destination = location.destination;
      }
      if (!items.length) throw new DomainError('VALIDATION', 'El documento no tiene artículos.');
      const businessName = (
        this.db.prepare('SELECT business_name name FROM business_settings WHERE id=1').get() as {
          name: string;
        }
      ).name;
      const snapshot: DeliveryNoteSnapshot = {
        businessName,
        sourceNumber: source.number,
        sourceDate: source.date,
        sourceStatus: source.status,
        origin,
        destination,
        recipient: input.recipient,
        address: input.address,
        reference: input.reference,
        note: input.note,
        items,
      };
      const number = (
        this.db.prepare('SELECT COALESCE(MAX(number),0)+1 n FROM delivery_notes').get() as {
          n: number;
        }
      ).n;
      const id = randomUUID();
      const now = new Date().toISOString();
      this.db
        .prepare(
          `INSERT INTO delivery_notes(id,number,kind,${s.column},operation_key,payload_hash,snapshot_json,status,created_at_utc,actor_user_id,actor_name,supersedes_id)
        VALUES(?,?,?,?,?,?,?,'ISSUED',?,?,?,?)`,
        )
        .run(
          id,
          number,
          input.kind,
          input.sourceId,
          input.operationKey,
          payloadHash,
          JSON.stringify(snapshot),
          now,
          actor.id,
          actor.name,
          superseded?.id ?? null,
        );
      return this.detail(id, actor);
    };
    return this.db.inTransaction ? work() : this.db.transaction(work).immediate();
  }
  act(raw: DeliveryNoteAction, actor: User, action: 'deliver' | 'cancel'): DeliveryNote {
    const input = DeliveryNoteActionSchema.parse(raw);
    const work = () => {
      const row = this.row(input.noteId);
      this.allowed(row.kind, actor, true);
      const prefix = action === 'deliver' ? 'delivery' : 'cancel';
      const payloadHash = hash(input);
      const prior = this.db
        .prepare(`SELECT id,${prefix}_hash hash FROM delivery_notes WHERE ${prefix}_key=?`)
        .get(input.operationKey) as { id: string; hash: string } | undefined;
      if (prior) {
        if (prior.id !== input.noteId || prior.hash !== payloadHash)
          throw new DomainError('VALIDATION', 'La clave ya se usó con otros datos.');
        return this.detail(prior.id, actor);
      }
      if (row.revision !== input.expectedRevision)
        throw new DomainError('REVISION_CONFLICT', 'El remito cambió. Actualizá el detalle.');
      if (row.status === 'CANCELLED')
        throw new DomainError('VALIDATION', 'El remito está anulado.');
      if (action === 'deliver') {
        if (row.status !== 'ISSUED')
          throw new DomainError('VALIDATION', 'La entrega ya está confirmada.');
        if (row.kind !== 'SALE')
          throw new DomainError(
            'VALIDATION',
            'La recepción se consulta en la compra o el traslado de origen.',
          );
        if (this.render(row).sourceStatus !== 'COMPLETED')
          throw new DomainError('VALIDATION', 'La venta de origen está anulada.');
        this.db
          .prepare(
            "UPDATE delivery_notes SET status='DELIVERED',revision=revision+1,delivered_at_utc=?,delivered_by=?,delivered_by_name=?,delivery_reason=?,delivery_key=?,delivery_hash=? WHERE id=?",
          )
          .run(
            new Date().toISOString(),
            actor.id,
            actor.name,
            input.reason,
            input.operationKey,
            payloadHash,
            row.id,
          );
      } else {
        this.db
          .prepare(
            "UPDATE delivery_notes SET status='CANCELLED',revision=revision+1,cancelled_at_utc=?,cancelled_by=?,cancelled_by_name=?,cancel_reason=?,cancel_key=?,cancel_hash=? WHERE id=?",
          )
          .run(
            new Date().toISOString(),
            actor.id,
            actor.name,
            input.reason,
            input.operationKey,
            payloadHash,
            row.id,
          );
      }
      return this.detail(row.id, actor);
    };
    return this.db.inTransaction ? work() : this.db.transaction(work).immediate();
  }
}
