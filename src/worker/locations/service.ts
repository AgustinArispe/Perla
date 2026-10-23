import { normalizeSearch } from "../../domain/values";
import { createHash, randomUUID } from "node:crypto";
import type Database from "better-sqlite3";
import type { User } from "../../shared/auth";
import { DomainError } from "../../shared/errors";
import {
  LocationSaveSchema,
  TransferCancelSchema,
  TransferDispatchSchema,
  TransferListSchema,
  TransferReceiveSchema,
  type Location,
  type LocationSaveInput,
  type StockTransfer,
  type TransferCancelInput,
  type TransferDispatchInput,
  type TransferReceiveInput,
} from "../../shared/locations";
import { TerminalLocationSchema } from "../../shared/locations";
import { stockState } from "../../domain/inventory";
import type {
  LocationSummary,
  LocationSummaryRequest,
} from "../../shared/location-reports";
import { CatalogRepository } from "../products/repository";
import { StockRepository } from "../stock/repository";

const hash = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class LocationTransferService {
  private readonly ledger: StockRepository;
  constructor(
    private readonly db: Database.Database,
    private readonly catalog: CatalogRepository,
  ) {
    this.ledger = new StockRepository(db);
  }

  inventory(input: {
    locationId: string;
    query: string;
    limit: number;
    offset: number;
  }): import("../../shared/locations").LocationInventory {
    this.location(input.locationId);
    const pattern = `%${normalizeSearch(input.query).replace(/[\\%_]/g, (value) => `\\${value}`)}%`;
    const where =
      "p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND (p.search_name LIKE ? ESCAPE '\\' OR bocha_search(p.sku) LIKE ? ESCAPE '\\' OR p.barcode LIKE ? ESCAPE '\\' OR p.internal_barcode LIKE ? ESCAPE '\\')";
    const total = (
      this.db
        .prepare(`SELECT COUNT(*) total FROM products p WHERE ${where}`)
        .get(pattern, pattern, pattern, pattern) as { total: number }
    ).total;
    const items = this.db
      .prepare(
        `SELECT p.id AS productId,p.name,p.sku,p.barcode,p.sale_unit AS unit,COALESCE(b.quantity_base,0) AS quantityBase FROM products p LEFT JOIN location_inventory_balances b ON b.product_id=p.id AND b.location_id=? WHERE ${where} ORDER BY p.search_name,p.id LIMIT ? OFFSET ?`,
      )
      .all(
        input.locationId,
        pattern,
        pattern,
        pattern,
        pattern,
        input.limit,
        input.offset,
      ) as import("../../shared/locations").LocationInventory["items"];
    return { total, items };
  }

  listLocations(): Location[] {
    return (
      this.db
        .prepare(
          "SELECT id,name,code,active,is_default AS isDefault,revision FROM locations ORDER BY is_default DESC,name",
        )
        .all() as (Omit<Location, "active" | "isDefault"> & {
        active: number;
        isDefault: number;
      })[]
    ).map((row) => ({
      ...row,
      active: Boolean(row.active),
      isDefault: Boolean(row.isDefault),
    }));
  }

  summary(input: LocationSummaryRequest): LocationSummary {
    const rows = this.db
      .prepare(
        `SELECT l.id,l.name,l.active, EXISTS(SELECT 1 FROM terminal_locations tl JOIN terminals t ON t.id=tl.terminal_id WHERE tl.location_id=l.id AND t.active=1) hasTerminal,
      COALESCE((SELECT SUM(CASE WHEN s.status='COMPLETED' THEN s.total_cents ELSE 0 END) FROM sale_orders s WHERE s.location_id=l.id AND s.local_month=?),0)-
      COALESCE((SELECT SUM(r.total_cents) FROM sale_returns r JOIN sale_orders s ON s.id=r.sale_id WHERE r.status='CONFIRMED' AND s.location_id=l.id AND r.local_month=?),0) net,
      COALESCE((SELECT COUNT(*) FROM sale_orders s WHERE s.location_id=l.id AND s.local_month=? AND s.status='COMPLETED'),0) sales,
      COALESCE((SELECT SUM(CASE WHEN p.sale_unit='UNIT' THEN b.quantity_base ELSE 0 END) FROM location_inventory_balances b JOIN products p ON p.id=b.product_id WHERE b.location_id=l.id AND p.active=1 AND p.track_stock=1),0) units,
      COALESCE((SELECT SUM(CASE WHEN p.sale_unit='KG' THEN b.quantity_base ELSE 0 END) FROM location_inventory_balances b JOIN products p ON p.id=b.product_id WHERE b.location_id=l.id AND p.active=1 AND p.track_stock=1),0) grams,
      COALESCE((SELECT COUNT(*) FROM location_inventory_balances b JOIN products p ON p.id=b.product_id WHERE b.location_id=l.id AND p.active=1 AND p.track_stock=1 AND p.stock_initialized=1 AND b.quantity_base<=p.min_stock_base),0) low,
      COALESCE((SELECT COUNT(*) FROM stock_transfers t WHERE t.from_location_id=l.id AND t.status='IN_TRANSIT'),0) outgoing,
      COALESCE((SELECT COUNT(*) FROM stock_transfers t WHERE t.to_location_id=l.id AND t.status='IN_TRANSIT'),0) incoming
      FROM locations l ORDER BY l.is_default DESC,l.name`,
      )
      .safeIntegers(true)
      .all(input.month, input.month, input.month) as Record<
      string,
      bigint | string
    >[];
    const integer = (value: bigint | string | undefined) => {
      const number = Number(value ?? 0);
      if (!Number.isSafeInteger(number))
        throw new DomainError(
          "VALIDATION",
          "El resumen supera el rango permitido.",
        );
      return number;
    };
    const locations = rows.map((row) => {
      const netCents = integer(row.net),
        saleCount = integer(row.sales);
      return {
        id: String(row.id),
        name: String(row.name),
        active: Boolean(integer(row.active)),
        hasTerminal: Boolean(integer(row.hasTerminal)),
        netCents,
        saleCount,
        averageCents: saleCount ? Math.round(netCents / saleCount) : 0,
        quantityUnits: integer(row.units),
        quantityGrams: integer(row.grams),
        lowStockCount: integer(row.low),
        outgoingTransfers: integer(row.outgoing),
        incomingTransfers: integer(row.incoming),
      };
    });
    const netCents = locations.reduce((sum, row) => sum + row.netCents, 0),
      saleCount = locations.reduce((sum, row) => sum + row.saleCount, 0);
    return {
      month: input.month,
      total: {
        netCents,
        saleCount,
        averageCents: saleCount ? Math.round(netCents / saleCount) : 0,
        lowStockCount: locations.reduce(
          (sum, row) => sum + row.lowStockCount,
          0,
        ),
        inTransitCount: (
          this.db
            .prepare(
              "SELECT COUNT(*) n FROM stock_transfers WHERE status='IN_TRANSIT'",
            )
            .get() as { n: number }
        ).n,
      },
      locations,
    };
  }

  saveLocation(raw: LocationSaveInput): Location {
    const input = LocationSaveSchema.parse(raw);
    const now = new Date().toISOString();
    if (!input.id) {
      const id = randomUUID();
      try {
        this.db
          .prepare(
            "INSERT INTO locations(id,name,code,active,is_default,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,0,1,?,?)",
          )
          .run(id, input.name, input.code, Number(input.active), now, now);
      } catch {
        throw new DomainError(
          "VALIDATION",
          "Ya existe una ubicación con ese nombre o código.",
        );
      }
      return this.location(id);
    }
    const current = this.location(input.id);
    if (!input.expectedRevision || input.expectedRevision !== current.revision)
      throw new DomainError(
        "REVISION_CONFLICT",
        "La ubicación cambió. Actualizá antes de guardar.",
      );
    if (current.isDefault && !input.active)
      throw new DomainError(
        "VALIDATION",
        "La ubicación principal debe permanecer activa.",
      );
    try {
      const changed = this.db
        .prepare(
          "UPDATE locations SET name=?,code=?,active=?,revision=revision+1,updated_at_utc=? WHERE id=? AND revision=?",
        )
        .run(
          input.name,
          input.code,
          Number(input.active),
          now,
          input.id,
          input.expectedRevision,
        );
      if (!changed.changes)
        throw new DomainError(
          "REVISION_CONFLICT",
          "La ubicación cambió. Actualizá antes de guardar.",
        );
    } catch (error) {
      if (error instanceof DomainError) throw error;
      throw new DomainError(
        "VALIDATION",
        "Ya existe una ubicación con ese nombre o código.",
      );
    }
    return this.location(input.id);
  }

  assignTerminal(raw: unknown): Location {
    const input = TerminalLocationSchema.parse(raw);
    const location = this.location(input.locationId);
    if (!location.active)
      throw new DomainError("INACTIVE", "La ubicación está inactiva.");
    const terminal = this.db
      .prepare("SELECT id FROM terminals WHERE id=? AND active=1")
      .get(input.terminalId);
    if (!terminal)
      throw new DomainError(
        "NOT_FOUND",
        "No se encontró la terminal activa.",
      );
    this.db
      .prepare(
        "INSERT INTO terminal_locations(terminal_id,location_id,updated_at_utc) VALUES (?,?,?) ON CONFLICT(terminal_id) DO UPDATE SET location_id=excluded.location_id,updated_at_utc=excluded.updated_at_utc",
      )
      .run(input.terminalId, input.locationId, new Date().toISOString());
    return location;
  }

  dispatch(raw: TransferDispatchInput, actor: User): StockTransfer {
    const input = TransferDispatchSchema.parse(raw);
    const payloadHash = hash(input);
    const replay = this.replay(input.operationKey, payloadHash);
    if (replay) return replay;
    const work = () => {
      const second = this.replay(input.operationKey, payloadHash);
      if (second) return second;
      const from = this.location(input.fromLocationId);
      const to = this.location(input.toLocationId);
      if (!from.active || !to.active)
        throw new DomainError(
          "INACTIVE",
          "Origen y destino deben estar activos.",
        );
      const now = new Date().toISOString();
      const transferId = randomUUID();
      const number = (
        this.db
          .prepare("SELECT COALESCE(MAX(number),0)+1 n FROM stock_transfers")
          .get() as { n: number }
      ).n;
      this.db
        .prepare(
          "INSERT INTO stock_transfers(id,number,from_location_id,to_location_id,status,note,dispatched_by,dispatched_by_name,dispatched_at_utc,revision) VALUES (?,?,?,?,'IN_TRANSIT',?,?,?,?,1)",
        )
        .run(
          transferId,
          number,
          from.id,
          to.id,
          input.note,
          actor.id,
          actor.name,
          now,
        );
      for (const line of input.items) {
        const product = this.catalog.get(line.productId);
        if (!product.trackStock || !product.stockInitialized)
          throw new DomainError(
            "VALIDATION",
            `${product.name} necesita un conteo de stock antes de trasladarse.`,
          );
        const balance = this.ledger.balance(product.id, from.id);
        const available = balance?.quantity_base ?? 0;
        if (available < line.quantityBase)
          throw new DomainError(
            "INSUFFICIENT_STOCK",
            `No hay stock suficiente de ${product.name} en ${from.name}.`,
          );
        const itemId = randomUUID();
        const cost = this.db
          .prepare(
            "SELECT method,rate_micros_per_base rate FROM product_cost_states WHERE product_id=?",
          )
          .get(product.id) as { method: string; rate: number } | undefined;
        this.db
          .prepare(
            "INSERT INTO stock_transfer_items(id,transfer_id,product_id,sku,product_name,unit,dispatched_base,cost_method,cost_rate_micros_per_base) VALUES (?,?,?,?,?,?,?,?,?)",
          )
          .run(
            itemId,
            transferId,
            product.id,
            product.sku,
            product.name,
            product.saleUnit,
            line.quantityBase,
            cost?.method ?? null,
            cost?.rate ?? null,
          );
        this.dispatchLots(itemId, product.id, from.id, line.quantityBase);
        const next = available - line.quantityBase;
        this.ledger.appendWithinTransaction({
          productId: product.id,
          locationId: from.id,
          deltaBase: -line.quantityBase,
          nextBase: next,
          revision: (balance?.revision ?? 0) + 1,
          kind: "ADJUSTMENT",
          reason: `Traslado N.º ${number} despachado`,
          operationKey: `${input.operationKey}:${product.id}:OUT`,
          hash: payloadHash,
          result: {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit: product.saleUnit,
            quantityBase: next,
            minStockBase: product.minStockBase,
            initialized: true,
            trackStock: true,
            active: product.active,
            revision: (balance?.revision ?? 0) + 1,
            productRevision: product.revision,
            state: stockState(true, true, next, product.minStockBase),
          },
          transferId,
          transferItemId: itemId,
          timestamp: now,
        });
      }
      const result = this.detail(transferId);
      this.event(
        transferId,
        "DISPATCHED",
        input.operationKey,
        payloadHash,
        result,
        actor,
        now,
      );
      return result;
    };
    return this.db.inTransaction
      ? work()
      : this.db.transaction(work).immediate();
  }

  receive(raw: TransferReceiveInput, actor: User): StockTransfer {
    const input = TransferReceiveSchema.parse(raw);
    const payloadHash = hash(input);
    const replay = this.replay(input.operationKey, payloadHash);
    if (replay) return replay;
    const work = () => {
      const second = this.replay(input.operationKey, payloadHash);
      if (second) return second;
      const transfer = this.detail(input.transferId);
      if (transfer.status !== "IN_TRANSIT")
        throw new DomainError(
          "REVISION_CONFLICT",
          "El traslado ya no está en tránsito.",
        );
      if (
        input.items.length !== transfer.items.length ||
        new Set(input.items.map((i) => i.productId)).size !== input.items.length
      )
        throw new DomainError(
          "VALIDATION",
          "Informá la recepción de todos los productos una sola vez.",
        );
      const now = new Date().toISOString();
      for (const item of transfer.items) {
        const received = input.items.find(
          (line) => line.productId === item.productId,
        );
        if (!received)
          throw new DomainError(
            "VALIDATION",
            `Falta confirmar ${item.productName}.`,
          );
        if (received.receivedBase > item.dispatchedBase)
          throw new DomainError(
            "VALIDATION",
            `La cantidad recibida de ${item.productName} supera la despachada.`,
          );
        const product = this.catalog.get(item.productId);
        const balance = this.ledger.balance(
          item.productId,
          transfer.toLocationId,
        );
        const next = (balance?.quantity_base ?? 0) + received.receivedBase;
        this.db
          .prepare(
            "UPDATE stock_transfer_items SET received_base=?,difference_base=? WHERE id=?",
          )
          .run(
            received.receivedBase,
            item.dispatchedBase - received.receivedBase,
            item.id,
          );
        this.receiveLots(item.id, transfer.toLocationId, received.receivedBase);
        if (received.receivedBase > 0)
          this.ledger.appendWithinTransaction({
            productId: item.productId,
            locationId: transfer.toLocationId,
            deltaBase: received.receivedBase,
            nextBase: next,
            revision: (balance?.revision ?? 0) + 1,
            kind: "ADJUSTMENT",
            reason: `Traslado N.º ${transfer.number} recibido`,
            operationKey: `${input.operationKey}:${item.productId}:IN`,
            hash: payloadHash,
            result: {
              productId: product.id,
              name: product.name,
              sku: product.sku,
              barcode: product.barcode,
              unit: product.saleUnit,
              quantityBase: next,
              minStockBase: product.minStockBase,
              initialized: true,
              trackStock: true,
              active: product.active,
              revision: (balance?.revision ?? 0) + 1,
              productRevision: product.revision,
              state: stockState(true, true, next, product.minStockBase),
            },
            transferId: transfer.id,
            transferItemId: item.id,
            timestamp: now,
          });
      }
      this.db
        .prepare(
          "UPDATE stock_transfers SET status='RECEIVED',received_by=?,received_by_name=?,received_at_utc=?,revision=revision+1 WHERE id=? AND status='IN_TRANSIT'",
        )
        .run(actor.id, actor.name, now, transfer.id);
      const result = this.detail(transfer.id);
      this.event(
        transfer.id,
        "RECEIVED",
        input.operationKey,
        payloadHash,
        result,
        actor,
        now,
      );
      return result;
    };
    return this.db.inTransaction
      ? work()
      : this.db.transaction(work).immediate();
  }

  cancel(raw: TransferCancelInput, actor: User): StockTransfer {
    const input = TransferCancelSchema.parse(raw);
    const payloadHash = hash(input);
    const replay = this.replay(input.operationKey, payloadHash);
    if (replay) return replay;
    const work = () => {
      const second = this.replay(input.operationKey, payloadHash);
      if (second) return second;
      const transfer = this.detail(input.transferId);
      if (transfer.status !== "IN_TRANSIT")
        throw new DomainError(
          "REVISION_CONFLICT",
          "Solo se puede cancelar mercadería que sigue en tránsito.",
        );
      const now = new Date().toISOString();
      for (const item of transfer.items) {
        const product = this.catalog.get(item.productId);
        const balance = this.ledger.balance(
          item.productId,
          transfer.fromLocationId,
        );
        const next = (balance?.quantity_base ?? 0) + item.dispatchedBase;
        this.restoreLots(item.id, transfer.fromLocationId);
        this.ledger.appendWithinTransaction({
          productId: item.productId,
          locationId: transfer.fromLocationId,
          deltaBase: item.dispatchedBase,
          nextBase: next,
          revision: (balance?.revision ?? 0) + 1,
          kind: "ADJUSTMENT",
          reason: `Traslado N.º ${transfer.number} cancelado: ${input.reason}`,
          operationKey: `${input.operationKey}:${item.productId}:RESTORE`,
          hash: payloadHash,
          result: {
            productId: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit: product.saleUnit,
            quantityBase: next,
            minStockBase: product.minStockBase,
            initialized: true,
            trackStock: true,
            active: product.active,
            revision: (balance?.revision ?? 0) + 1,
            productRevision: product.revision,
            state: stockState(true, true, next, product.minStockBase),
          },
          transferId: transfer.id,
          transferItemId: item.id,
          timestamp: now,
        });
      }
      this.db
        .prepare(
          "UPDATE stock_transfers SET status='CANCELLED',cancelled_by=?,cancelled_by_name=?,cancelled_at_utc=?,cancel_reason=?,revision=revision+1 WHERE id=? AND status='IN_TRANSIT'",
        )
        .run(actor.id, actor.name, now, input.reason, transfer.id);
      const result = this.detail(transfer.id);
      this.event(
        transfer.id,
        "CANCELLED",
        input.operationKey,
        payloadHash,
        result,
        actor,
        now,
      );
      return result;
    };
    return this.db.inTransaction
      ? work()
      : this.db.transaction(work).immediate();
  }

  listTransfers(raw: unknown): StockTransfer[] {
    const input = TransferListSchema.parse(raw);
    const where = input.status === "ALL" ? "" : "WHERE status=?";
    const rows = this.db
      .prepare(
        `SELECT id FROM stock_transfers ${where} ORDER BY number DESC LIMIT ?`,
      )
      .all(
        ...(input.status === "ALL"
          ? [input.limit]
          : [input.status, input.limit]),
      ) as { id: string }[];
    return rows.map((row) => this.detail(row.id));
  }

  detail(id: string): StockTransfer {
    const row = this.db
      .prepare(
        `SELECT t.*,f.name from_name,d.name to_name FROM stock_transfers t JOIN locations f ON f.id=t.from_location_id JOIN locations d ON d.id=t.to_location_id WHERE t.id=?`,
      )
      .get(id) as Record<string, unknown> | undefined;
    if (!row)
      throw new DomainError("NOT_FOUND", "No se encontró el traslado.");
    const items = (
      this.db
        .prepare(
          "SELECT id,product_id,sku,product_name,unit,dispatched_base,received_base,difference_base,cost_method,cost_rate_micros_per_base FROM stock_transfer_items WHERE transfer_id=? ORDER BY product_name,id",
        )
        .all(id) as Record<string, unknown>[]
    ).map((item) => ({
      id: item.id as string,
      productId: item.product_id as string,
      sku: item.sku as string,
      productName: item.product_name as string,
      unit: item.unit as "UNIT" | "KG",
      dispatchedBase: item.dispatched_base as number,
      receivedBase: item.received_base as number | null,
      differenceBase: item.difference_base as number | null,
      costMethod: item.cost_method as string | null,
      costRateMicrosPerBase: item.cost_rate_micros_per_base as number | null,
    }));
    return {
      id: row.id as string,
      number: row.number as number,
      fromLocationId: row.from_location_id as string,
      fromLocationName: row.from_name as string,
      toLocationId: row.to_location_id as string,
      toLocationName: row.to_name as string,
      status: row.status as StockTransfer["status"],
      note: row.note as string,
      dispatchedByName: row.dispatched_by_name as string,
      dispatchedAt: row.dispatched_at_utc as string,
      receivedByName: row.received_by_name as string | null,
      receivedAt: row.received_at_utc as string | null,
      cancelledByName: row.cancelled_by_name as string | null,
      cancelledAt: row.cancelled_at_utc as string | null,
      cancelReason: row.cancel_reason as string | null,
      revision: row.revision as number,
      items,
    };
  }

  private location(id: string): Location {
    const row = this.db
      .prepare(
        "SELECT id,name,code,active,is_default AS isDefault,revision FROM locations WHERE id=?",
      )
      .get(id) as
      | (Omit<Location, "active" | "isDefault"> & {
          active: number;
          isDefault: number;
        })
      | undefined;
    if (!row)
      throw new DomainError("NOT_FOUND", "No se encontró la ubicación.");
    return {
      ...row,
      active: Boolean(row.active),
      isDefault: Boolean(row.isDefault),
    };
  }
  private replay(key: string, payloadHash: string): StockTransfer | undefined {
    const row = this.db
      .prepare(
        "SELECT payload_hash,result_json FROM stock_transfer_events WHERE operation_key=?",
      )
      .get(key) as { payload_hash: string; result_json: string } | undefined;
    if (!row) return;
    if (row.payload_hash !== payloadHash)
      throw new DomainError(
        "IDEMPOTENCY_CONFLICT",
        "La clave ya corresponde a otra operación de traslado.",
      );
    return JSON.parse(row.result_json) as StockTransfer;
  }
  private event(
    transferId: string,
    kind: "DISPATCHED" | "RECEIVED" | "CANCELLED",
    key: string,
    payloadHash: string,
    result: StockTransfer,
    actor: User,
    now: string,
  ) {
    this.db
      .prepare(
        "INSERT INTO stock_transfer_events(id,transfer_id,kind,operation_key,payload_hash,result_json,actor_user_id,actor_name,created_at_utc) VALUES (?,?,?,?,?,?,?,?,?)",
      )
      .run(
        randomUUID(),
        transferId,
        kind,
        key,
        payloadHash,
        JSON.stringify(result),
        actor.id,
        actor.name,
        now,
      );
  }
  private changeLot(locationId: string, lotId: string, delta: number) {
    const row = this.db
      .prepare(
        "SELECT quantity_base,revision FROM location_lot_balances WHERE location_id=? AND lot_id=?",
      )
      .get(locationId, lotId) as
      { quantity_base: number; revision: number } | undefined;
    const next = (row?.quantity_base ?? 0) + delta;
    if (next < 0)
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        "No hay cantidad suficiente del lote en el origen.",
      );
    this.db
      .prepare(
        "INSERT INTO location_lot_balances(location_id,lot_id,quantity_base,revision) VALUES (?,?,?,?) ON CONFLICT(location_id,lot_id) DO UPDATE SET quantity_base=excluded.quantity_base,revision=excluded.revision",
      )
      .run(locationId, lotId, next, (row?.revision ?? 0) + 1);
  }
  private dispatchLots(
    itemId: string,
    productId: string,
    locationId: string,
    quantity: number,
  ) {
    const enabled = this.db
      .prepare(
        "SELECT enabled,reconciled FROM lot_product_settings WHERE product_id=?",
      )
      .get(productId) as { enabled: number; reconciled: number } | undefined;
    if (!enabled?.enabled) return;
    if (!enabled.reconciled)
      throw new DomainError(
        "VALIDATION",
        "Distribuí los lotes actuales antes de trasladar el producto.",
      );
    const today = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Argentina/Buenos_Aires",
    }).format(new Date());
    const lots = this.db
      .prepare(
        `SELECT l.id,lb.quantity_base FROM inventory_lots l JOIN location_lot_balances lb ON lb.lot_id=l.id AND lb.location_id=? WHERE l.product_id=? AND l.status='ACTIVE' AND lb.quantity_base>0 AND (l.expires_on IS NULL OR l.expires_on>=?) ORDER BY l.expires_on IS NULL,l.expires_on,l.created_at_utc,l.id`,
      )
      .all(locationId, productId, today) as {
      id: string;
      quantity_base: number;
    }[];
    if (lots.reduce((sum, lot) => sum + lot.quantity_base, 0) < quantity)
      throw new DomainError(
        "INSUFFICIENT_STOCK",
        "No hay lotes disponibles suficientes en el origen.",
      );
    let remaining = quantity;
    for (const lot of lots) {
      if (!remaining) break;
      const moved = Math.min(remaining, lot.quantity_base);
      this.changeLot(locationId, lot.id, -moved);
      this.db
        .prepare(
          "INSERT INTO stock_transfer_item_lots(transfer_item_id,lot_id,dispatched_base) VALUES (?,?,?)",
        )
        .run(itemId, lot.id, moved);
      remaining -= moved;
    }
  }
  private receiveLots(itemId: string, locationId: string, received: number) {
    const rows = this.db
      .prepare(
        "SELECT lot_id,dispatched_base FROM stock_transfer_item_lots WHERE transfer_item_id=? ORDER BY rowid",
      )
      .all(itemId) as { lot_id: string; dispatched_base: number }[];
    let remaining = received;
    for (const row of rows) {
      const amount = Math.min(remaining, row.dispatched_base);
      const loss = row.dispatched_base - amount;
      this.db
        .prepare(
          "UPDATE stock_transfer_item_lots SET received_base=? WHERE transfer_item_id=? AND lot_id=?",
        )
        .run(amount, itemId, row.lot_id);
      if (amount) this.changeLot(locationId, row.lot_id, amount);
      if (loss)
        this.db
          .prepare(
            "UPDATE inventory_lots SET quantity_base=quantity_base-?,revision=revision+1,updated_at_utc=? WHERE id=? AND quantity_base>=?",
          )
          .run(loss, new Date().toISOString(), row.lot_id, loss);
      remaining -= amount;
    }
  }
  private restoreLots(itemId: string, locationId: string) {
    const rows = this.db
      .prepare(
        "SELECT lot_id,dispatched_base FROM stock_transfer_item_lots WHERE transfer_item_id=?",
      )
      .all(itemId) as { lot_id: string; dispatched_base: number }[];
    for (const row of rows)
      this.changeLot(locationId, row.lot_id, row.dispatched_base);
  }
}
