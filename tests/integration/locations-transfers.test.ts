import { randomUUID } from "node:crypto";
import { describe, expect, test } from "vitest";
import { openDatabase } from "../../src/worker/db/connection";
import { AuthService } from "../../src/worker/auth/service";
import { Application } from "../../src/worker/application";
import Database from "better-sqlite3";
import { migrate, MIGRATIONS } from "../../src/worker/db/migrations";

const password = "Prueba-Ubicaciones-2026!";

function fixture() {
  const db = openDatabase(":memory:");
  const auth = new AuthService(db);
  const grant = auth.bootstrap({ name: "Dueña", username: "jefe", password });
  const app = new Application(db, auth);
  db.prepare(
    "UPDATE business_features SET enabled=1 WHERE feature_key IN ('STOCK_CONTROL','LOCATIONS_TRANSFERS')",
  ).run();
  const product = app.dispatch(
    "products.save",
    {
      sku: "TRASLADO-01",
      barcode: null,
      name: "Langostinos",
      category: null,
      saleUnit: "UNIT",
      priceCents: 15_000,
      active: true,
      trackStock: true,
      minStockBase: 2,
    },
    grant.sessionToken,
  ) as { id: string; revision: number; priceCents: number };
  app.dispatch(
    "stock.opening",
    {
      productId: product.id,
      countedBase: 10,
      expectedRevision: 0,
      expectedProductRevision: product.revision,
      reason: "Conteo inicial",
      operationKey: randomUUID(),
    },
    grant.sessionToken,
  );
  return { db, app, token: grant.sessionToken, product };
}

describe("ubicaciones y traslados", () => {
  test("consulta existencias por origen sin mezclar depósitos y busca por nombre o código", () => {
    const f = fixture();
    try {
      const principal = (
        f.app.dispatch("locations.list", {}, f.token) as { id: string }[]
      )[0]!;
      const empty = f.app.dispatch(
        "locations.save",
        { name: "Reserva", code: "RESERVA", active: true },
        f.token,
      ) as { id: string };
      const search = (locationId: string, query: string) =>
        f.app.dispatch(
          "locations.inventory",
          { locationId, query, limit: 30 },
          f.token,
        ) as { items: { quantityBase: number }[]; total: number };
      expect(search(principal.id, "Langostinos").items[0]?.quantityBase).toBe(
        10,
      );
      expect(search(empty.id, "TRASLADO-01").items[0]?.quantityBase).toBe(0);
      expect(search(principal.id, "inexistente").total).toBe(0);
      expect(() => search(randomUUID(), "")).toThrow();
    } finally {
      f.db.close();
    }
  });
  test("conserva saldos y terminales al actualizar una base anterior", () => {
    const db = new Database(":memory:");
    try {
      db.pragma("foreign_keys=ON");
      migrate(db, MIGRATIONS.slice(0, 21));
      db.prepare(
        "INSERT INTO products(id,sku,barcode,name,search_name,category,sale_unit,price_cents,active,track_stock,stock_initialized,min_stock_base,revision,created_at_utc,updated_at_utc) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      ).run(
        "p",
        "P-1",
        null,
        "Pescado",
        "pescado",
        null,
        "UNIT",
        1000,
        1,
        1,
        1,
        0,
        1,
        "now",
        "now",
      );
      db.prepare(
        "INSERT INTO inventory_balances(product_id,quantity_base,revision) VALUES (?,?,?)",
      ).run("p", 17, 3);
      db.prepare(
        "INSERT INTO terminals(id,name,active,revision,created_at_utc,updated_at_utc) VALUES (?,?,1,1,?,?)",
      ).run("t", "Caja anterior", "now", "now");
      migrate(db);
      const principal = (
        db.prepare("SELECT id FROM locations WHERE is_default=1").get() as {
          id: string;
        }
      ).id;
      expect(
        db
          .prepare(
            "SELECT quantity_base,revision FROM location_inventory_balances WHERE location_id=? AND product_id=?",
          )
          .get(principal, "p"),
      ).toEqual({ quantity_base: 17, revision: 3 });
      expect(
        db
          .prepare(
            "SELECT location_id FROM terminal_locations WHERE terminal_id=?",
          )
          .get("t"),
      ).toEqual({ location_id: principal });
    } finally {
      db.close();
    }
  });
  test("migra el stock existente a una ubicación principal", () => {
    const f = fixture();
    try {
      const location = f.db
        .prepare("SELECT id,name,is_default FROM locations WHERE is_default=1")
        .get();
      expect(location).toMatchObject({
        name: "Ubicación principal",
        is_default: 1,
      });
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM location_inventory_balances WHERE product_id=?",
          )
          .get(f.product.id),
      ).toEqual({ quantity_base: 10 });
    } finally {
      f.db.close();
    }
  });

  test("despacha y recibe con diferencia sin duplicar stock al reintentar", () => {
    const f = fixture();
    try {
      const origin = (
        f.app.dispatch("locations.list", {}, f.token) as { id: string }[]
      )[0]!;
      const destination = f.app.dispatch(
        "locations.save",
        { name: "Mostrador", code: "MOSTRADOR", active: true },
        f.token,
      ) as { id: string };
      const operationKey = randomUUID();
      const input = {
        operationKey,
        fromLocationId: origin.id,
        toLocationId: destination.id,
        note: "",
        items: [{ productId: f.product.id, quantityBase: 4 }],
      };
      const first = f.app.dispatch("transfers.dispatch", input, f.token) as {
        id: string;
        status: string;
      };
      expect(f.app.dispatch("transfers.dispatch", input, f.token)).toEqual(
        first,
      );
      expect(first.status).toBe("IN_TRANSIT");
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM location_inventory_balances WHERE location_id=? AND product_id=?",
          )
          .get(origin.id, f.product.id),
      ).toEqual({ quantity_base: 6 });

      const receiveKey = randomUUID();
      const received = f.app.dispatch(
        "transfers.receive",
        {
          transferId: first.id,
          operationKey: receiveKey,
          items: [{ productId: f.product.id, receivedBase: 3 }],
        },
        f.token,
      ) as { status: string; items: { differenceBase: number }[] };
      expect(
        f.app.dispatch(
          "transfers.receive",
          {
            transferId: first.id,
            operationKey: receiveKey,
            items: [{ productId: f.product.id, receivedBase: 3 }],
          },
          f.token,
        ),
      ).toEqual(received);
      expect(received).toMatchObject({
        status: "RECEIVED",
        items: [{ differenceBase: 1 }],
      });
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM location_inventory_balances WHERE location_id=? AND product_id=?",
          )
          .get(destination.id, f.product.id),
      ).toEqual({ quantity_base: 3 });
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM inventory_balances WHERE product_id=?",
          )
          .get(f.product.id),
      ).toEqual({ quantity_base: 9 });
      const current = f.app.dispatch(
        "products.get",
        { productId: f.product.id },
        f.token,
      ) as { revision: number; priceCents: number };
      f.app.dispatch(
        "sales.complete",
        {
          checkoutKey: randomUUID(),
          locationId: destination.id,
          lines: [
            {
              lineId: randomUUID(),
              productId: f.product.id,
              quantityBase: 1,
              expectedProductRevision: current.revision,
              expectedPriceCents: current.priceCents,
            },
          ],
          discount: { type: "NONE" },
          payments: [{ method: "CASH", amountCents: current.priceCents }],
        },
        f.token,
      );
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM location_inventory_balances WHERE location_id=? AND product_id=?",
          )
          .get(destination.id, f.product.id),
      ).toEqual({ quantity_base: 2 });
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM inventory_balances WHERE product_id=?",
          )
          .get(f.product.id),
      ).toEqual({ quantity_base: 8 });
    } finally {
      f.db.close();
    }
  });

  test("cancelar un traslado repone el origen una sola vez", () => {
    const f = fixture();
    try {
      const origin = (
        f.app.dispatch("locations.list", {}, f.token) as { id: string }[]
      )[0]!;
      const destination = f.app.dispatch(
        "locations.save",
        { name: "Cámara", code: "CAMARA", active: true },
        f.token,
      ) as { id: string };
      const transfer = f.app.dispatch(
        "transfers.dispatch",
        {
          operationKey: randomUUID(),
          fromLocationId: origin.id,
          toLocationId: destination.id,
          items: [{ productId: f.product.id, quantityBase: 2 }],
        },
        f.token,
      ) as { id: string };
      const cancel = {
        transferId: transfer.id,
        operationKey: randomUUID(),
        reason: "No se envía",
      };
      const first = f.app.dispatch("transfers.cancel", cancel, f.token);
      expect(f.app.dispatch("transfers.cancel", cancel, f.token)).toEqual(
        first,
      );
      expect(
        f.db
          .prepare(
            "SELECT quantity_base FROM inventory_balances WHERE product_id=?",
          )
          .get(f.product.id),
      ).toEqual({ quantity_base: 10 });
    } finally {
      f.db.close();
    }
  });

  test("los lotes conservan su identidad y registran la diferencia durante el traslado", () => {
    const f = fixture();
    try {
      f.db
        .prepare(
          "UPDATE business_features SET enabled=1 WHERE feature_key='LOTS'",
        )
        .run();
      f.app.dispatch("lots.enable", { productId: f.product.id }, f.token);
      f.app.dispatch(
        "lots.reconcile",
        {
          productId: f.product.id,
          operationKey: randomUUID(),
          lots: [{ code: "MAR-01", expiresOn: "2027-12-31", quantityBase: 10 }],
        },
        f.token,
      );
      const origin = (
        f.app.dispatch("locations.list", {}, f.token) as { id: string }[]
      )[0]!;
      const destination = f.app.dispatch(
        "locations.save",
        { name: "Puesto costa", code: "COSTA", active: true },
        f.token,
      ) as { id: string };
      const transfer = f.app.dispatch(
        "transfers.dispatch",
        {
          operationKey: randomUUID(),
          fromLocationId: origin.id,
          toLocationId: destination.id,
          items: [{ productId: f.product.id, quantityBase: 4 }],
        },
        f.token,
      ) as { id: string };
      f.app.dispatch(
        "transfers.receive",
        {
          transferId: transfer.id,
          operationKey: randomUUID(),
          items: [{ productId: f.product.id, receivedBase: 3 }],
        },
        f.token,
      );
      const lot = f.db
        .prepare(
          "SELECT id,quantity_base FROM inventory_lots WHERE code='MAR-01'",
        )
        .get() as { id: string; quantity_base: number };
      expect(lot.quantity_base).toBe(9);
      expect(
        f.db
          .prepare(
            "SELECT location_id,quantity_base FROM location_lot_balances WHERE lot_id=? ORDER BY location_id",
          )
          .all(lot.id),
      ).toEqual(
        expect.arrayContaining([
          { location_id: origin.id, quantity_base: 6 },
          { location_id: destination.id, quantity_base: 3 },
        ]),
      );
      expect(
        f.db
          .prepare(
            "SELECT dispatched_base,received_base FROM stock_transfer_item_lots",
          )
          .get(),
      ).toEqual({ dispatched_base: 4, received_base: 3 });
    } finally {
      f.db.close();
    }
  });
});
