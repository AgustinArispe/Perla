import { EntityPicker } from "../../components/EntityPicker";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Product } from "../../../shared/catalog";
import type { PurchaseDraftBody, Supplier } from "../../../shared/purchases";
import {
  formatMoney,
  moneyInput,
  parseArs,
  parseQuantity,
  quantityInput,
} from "../../../domain/values";
import { purchaseLineSubtotal } from "../../../domain/purchases";
import { api, errorMessage, unwrap } from "../../api";
import { Icon } from "../../components/Icon";
import { addPurchaseProduct, updatePurchaseLine } from "./controller";
import { PurchaseDraftWriter } from "./draft-writer";
import { SupplierForm } from "./SupplierForm";
import { ProductForm } from "../products/ProductForm";
import {
  clearPendingPurchase,
  readPendingPurchase,
  writePendingPurchase,
} from "./pending";

function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}
function emptyDraft(): PurchaseDraftBody {
  return {
    receiptKey: crypto.randomUUID(),
    supplierId: null,
    businessDate: today(),
    lines: [],
  };
}

export function PurchaseDraft({
  lotsEnabled = false,
}: {
  lotsEnabled?: boolean;
}) {
  const client = useQueryClient();
  const scanRef = useRef<HTMLInputElement>(null);
  const [initialPending] = useState(readPendingPurchase);
  const [draft, setDraft] = useState<PurchaseDraftBody>(
    () => initialPending?.body ?? emptyDraft(),
  );
  const [, renderWriter] = useState(0);
  const hydrated = useRef(false);
  const [writer] = useState(
    () =>
      new PurchaseDraftWriter(api().purchases, () =>
        renderWriter((value) => value + 1),
      ),
  );
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [productErrors, setProductErrors] = useState<Record<string, string>>(
    {},
  );
  const [lineInputs, setLineInputs] = useState<Record<string, string>>({});
  const [scan, setScan] = useState("");
  const [pickedSupplier, setPickedSupplier] = useState<Supplier | null>(null);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const restored = useQuery({
    queryKey: ["purchase-draft"],
    queryFn: async () => unwrap(await api().purchases.getDraft()),
    retry: false,
  });
  const selectedSupplier = useQuery({
    queryKey: ["supplier", draft.supplierId],
    queryFn: async () => unwrap(await api().suppliers.get(draft.supplierId!)),
    enabled: Boolean(draft.supplierId),
    retry: false,
  });
  const lotStatuses = useQueries({
    queries: draft.lines.map((line) => ({
      queryKey: ["lots", line.productId],
      queryFn: async () => unwrap(await api().lots.status(line.productId)),
      enabled: lotsEnabled,
      retry: false,
      staleTime: 30_000,
    })),
  });
  useEffect(() => {
    if (!restored.isFetched || hydrated.current) return;
    hydrated.current = true;
    writer.reset(restored.data ?? null);
    const localIsNewer = Boolean(
      initialPending &&
      (!restored.data || initialPending.savedAt > restored.data.updatedAt),
    );
    if (localIsNewer) writer.update(initialPending!.body);
    else if (restored.data) {
      // La consulta hidrata un borrador persistido después del primer render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft(restored.data.body);
      writePendingPurchase(restored.data.body);
    }
  }, [initialPending, restored.data, restored.isFetched, writer]);
  useEffect(() => {
    writePendingPurchase(draft);
    if (hydrated.current) writer.update(draft);
  }, [draft, writer]);
  useEffect(() => () => writer.dispose(), [writer]);
  useEffect(() => {
    for (const line of draft.lines)
      if (!products[line.productId] && !productErrors[line.productId])
        void api()
          .products.get(line.productId)
          .then((result) => {
            if (result.ok) {
              setProducts((current) => ({
                ...current,
                [result.value.id]: result.value,
              }));
              setProductErrors((current) => {
                const next = { ...current };
                delete next[line.productId];
                return next;
              });
            } else
              setProductErrors((current) => ({
                ...current,
                [line.productId]: errorMessage(result.error),
              }));
          })
          .catch((failure) =>
            setProductErrors((current) => ({
              ...current,
              [line.productId]: errorMessage(failure),
            })),
          );
  }, [draft.lines, productErrors, products]);
  async function add(product: Product) {
    try {
      const cost =
        unwrap(await api().purchases.lastCost(product.id))?.unitCostCents ?? 0;
      setProducts((current) => ({ ...current, [product.id]: product }));
      setDraft((current) => addPurchaseProduct(current, product, cost));
      setLineInputs((current) => {
        const next = { ...current };
        delete next[`${product.id}:quantity`];
        if (!(product.id + ":cost" in current))
          next[`${product.id}:cost`] = moneyInput(cost);
        return next;
      });
      setError("");
      requestAnimationFrame(() => scanRef.current?.focus());
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  async function scanProduct() {
    if (!scan.trim()) return;
    try {
      const product = unwrap(await api().products.findByBarcode(scan.trim()));
      await add(product);
      setScan("");
      setError("");
    } catch (failure) {
      setError(errorMessage(failure));
      setScan("");
    }
  }
  async function saveCurrent() {
    writer.update(draft);
    await writer.flush();
    const saved = unwrap(await api().purchases.getDraft());
    if (!saved) throw new Error("No se pudo recuperar el borrador guardado.");
    return saved;
  }
  async function receive() {
    if (!draft.supplierId || !draft.lines.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await saveCurrent();
      let purchase;
      try {
        purchase = unwrap(
          await api().purchases.receive({
            ...saved.body,
            expectedDraftRevision: saved.revision,
          }),
        );
      } catch (failure) {
        const existing = unwrap(
          await api().purchases.findByReceiptKey(saved.body.receiptKey),
        );
        if (!existing) throw failure;
        purchase = existing;
      }
      setNotice(
        `Compra N.º ${purchase.number} recibida por ${formatMoney(purchase.totalCents)}.`,
      );
      const next = emptyDraft();
      writer.reset(null);
      clearPendingPurchase();
      setDraft(next);
      setProducts({});
      setProductErrors({});
      setLineInputs({});
      await client.invalidateQueries({ queryKey: ["purchases"] });
      requestAnimationFrame(() => scanRef.current?.focus());
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  const total = useMemo(
    () =>
      draft.lines.reduce((sum, line) => {
        const product = products[line.productId];
        return (
          sum +
          (product
            ? purchaseLineSubtotal(
                product.saleUnit,
                line.quantityBase,
                line.unitCostCents,
              )
            : 0)
        );
      }, 0),
    [draft.lines, products],
  );
  const missingCosts = draft.lines.some((line) => line.unitCostCents <= 0);
  const missingLots =
    lotsEnabled &&
    draft.lines.some((line, index) => {
      const status = lotStatuses[index]?.data;
      return status?.enabled && !line.lotCode?.trim();
    });
  return (
    <section className="purchase-receive">
      {notice && (
        <div className="notice" role="status">
          <Icon name="check" size={18} />
          {notice}
        </div>
      )}
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div className="purchase-top-grid">
        <div className="purchase-entry dashboard-panel">
          <div className="purchase-step">
            <span>1</span>
            <strong>Proveedor</strong>
          </div>
          <div className="supplier-picker">
            <EntityPicker
              label="Proveedor"
              queryKey="suppliers"
              value={pickedSupplier ?? selectedSupplier.data ?? null}
              onChange={(item) => {
                setPickedSupplier(item);
                setDraft((current) => ({
                  ...current,
                  supplierId: item?.id ?? null,
                }));
              }}
              load={async (query) =>
                unwrap(
                  await api().suppliers.search({
                    query,
                    status: "ACTIVE",
                    limit: 30,
                  }),
                ).items
              }
              detail={(item) => item.phone ?? ""}
            />

            <button
              className="button secondary"
              onClick={() => setSupplierOpen(true)}
            >
              <Icon name="plus" size={18} /> Nuevo
            </button>
          </div>
          <div className="purchase-step">
            <span>2</span>
            <strong>Productos</strong>
          </div>
          <label className="purchase-scan">
            <Icon name="search" size={20} />
            <input
              ref={scanRef}
              value={scan}
              onChange={(event) => setScan(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void scanProduct();
                }
              }}
              placeholder="Escanear código + Enter"
              autoFocus
            />
          </label>
          <EntityPicker<Product>
            label="Producto para comprar"
            queryKey="purchase-products"
            value={null}
            onChange={(product) => {
              if (product) void add(product);
            }}
            load={async (query) =>
              unwrap(
                await api().products.search({
                  query,
                  status: "ACTIVE",
                  activeOnly: true,
                  limit: 30,
                }),
              ).items
            }
            detail={(product) => product.barcode ?? product.sku}
          />
          <button
            className="button quiet purchase-new-product"
            type="button"
            onClick={() => setProductOpen(true)}
          >
            <Icon name="plus" size={17} /> Nuevo producto
          </button>
        </div>
        <aside className="purchase-summary">
          <small>
            {draft.lines.length}{" "}
            {draft.lines.length === 1 ? "producto" : "productos"}
          </small>
          <span>Total</span>
          <strong>{formatMoney(total)}</strong>
          {missingCosts && (
            <small className="purchase-cost-warning">
              Falta ingresar un costo
            </small>
          )}
          {missingLots && (
            <small className="purchase-cost-warning">
              Falta identificar un lote
            </small>
          )}
          <button
            className="button primary purchase-receive-button"
            disabled={
              !draft.supplierId ||
              !draft.lines.length ||
              missingCosts ||
              missingLots ||
              busy
            }
            onClick={() => void receive()}
          >
            {busy ? "Recibiendo…" : "Recibir compra"}
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={() =>
              void saveCurrent()
                .then(() => setNotice("Borrador guardado."))
                .catch((failure) => setError(errorMessage(failure)))
            }
          >
            Guardar borrador
          </button>
          <small className="purchase-save-state" role="status">
            {writer.error
              ? writer.error
              : writer.unsaved
                ? "Guardando cambios…"
                : "Borrador guardado"}
          </small>
        </aside>
      </div>
      <div className="purchase-lines dashboard-panel">
        {draft.lines.length === 0 ? (
          <div className="empty-state purchase-empty">
            <Icon name="box" size={30} />
            <strong>Escaneá el primer producto</strong>
          </div>
        ) : (
          draft.lines.map((line, index) => {
            const product = products[line.productId];
            const productError = productErrors[line.productId];
            const lotStatus = lotStatuses[index]?.data;
            if (productError)
              return (
                <div
                  key={line.lineId}
                  className="purchase-line loading"
                  role="alert"
                >
                  <span>No se pudo recuperar el producto.</span>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      setProductErrors((current) => {
                        const next = { ...current };
                        delete next[line.productId];
                        return next;
                      })
                    }
                  >
                    Reintentar
                  </button>
                </div>
              );
            if (!product)
              return (
                <div key={line.lineId} className="purchase-line loading">
                  Cargando producto…
                </div>
              );
            return (
              <article className="purchase-line" key={line.lineId}>
                <div className="purchase-line-name">
                  <strong>{product.name}</strong>
                  <small>
                    {product.sku} ·{" "}
                    {product.saleUnit === "KG" ? "Por kilo" : "Por unidad"}
                  </small>
                </div>
                <label>
                  <span>Cantidad</span>
                  <input
                    inputMode="decimal"
                    value={
                      lineInputs[`${product.id}:quantity`] ??
                      quantityInput(line.quantityBase, product.saleUnit)
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      setLineInputs((current) => ({
                        ...current,
                        [`${product.id}:quantity`]: event.target.value,
                      }))
                    }
                    onBlur={(event) => {
                      try {
                        const value = parseQuantity(
                          event.target.value,
                          product.saleUnit,
                        );
                        setDraft((current) =>
                          updatePurchaseLine(current, product.id, {
                            quantityBase: value,
                          }),
                        );
                        setLineInputs((current) => ({
                          ...current,
                          [`${product.id}:quantity`]: quantityInput(
                            value,
                            product.saleUnit,
                          ),
                        }));
                      } catch {
                        setLineInputs((current) => ({
                          ...current,
                          [`${product.id}:quantity`]: quantityInput(
                            line.quantityBase,
                            product.saleUnit,
                          ),
                        }));
                      }
                    }}
                  />
                </label>
                <label>
                  <span>
                    Costo {product.saleUnit === "KG" ? "por kg" : "unitario"}
                  </span>
                  <input
                    inputMode="decimal"
                    className={line.unitCostCents <= 0 ? "invalid" : ""}
                    value={
                      lineInputs[`${product.id}:cost`] ??
                      moneyInput(line.unitCostCents)
                    }
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) =>
                      setLineInputs((current) => ({
                        ...current,
                        [`${product.id}:cost`]: event.target.value,
                      }))
                    }
                    onBlur={(event) => {
                      try {
                        const value = parseArs(event.target.value);
                        setDraft((current) =>
                          updatePurchaseLine(current, product.id, {
                            unitCostCents: value,
                          }),
                        );
                        setLineInputs((current) => ({
                          ...current,
                          [`${product.id}:cost`]: moneyInput(value),
                        }));
                      } catch {
                        setLineInputs((current) => ({
                          ...current,
                          [`${product.id}:cost`]: moneyInput(
                            line.unitCostCents,
                          ),
                        }));
                      }
                    }}
                  />
                </label>
                <strong className="purchase-line-total">
                  {formatMoney(
                    purchaseLineSubtotal(
                      product.saleUnit,
                      line.quantityBase,
                      line.unitCostCents,
                    ),
                  )}
                </strong>
                {lotStatus?.enabled && (
                  <div className="purchase-lot-fields">
                    <label>
                      <span>Lote</span>
                      <input
                        value={line.lotCode ?? ""}
                        placeholder="Código del proveedor"
                        onChange={(event) =>
                          setDraft((current) =>
                            updatePurchaseLine(current, product.id, {
                              lotCode: event.target.value,
                            }),
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Vencimiento</span>
                      <input
                        type="date"
                        value={line.expiresOn ?? ""}
                        onChange={(event) =>
                          setDraft((current) =>
                            updatePurchaseLine(current, product.id, {
                              expiresOn: event.target.value || null,
                            }),
                          )
                        }
                      />
                    </label>
                  </div>
                )}
                <button
                  className="icon-button"
                  aria-label={`Quitar ${product.name}`}
                  onClick={() =>
                    setDraft((current) =>
                      updatePurchaseLine(current, product.id, {
                        quantityBase: 0,
                      }),
                    )
                  }
                >
                  <Icon name="close" size={18} />
                </button>
              </article>
            );
          })
        )}
      </div>
      {supplierOpen && (
        <SupplierForm
          onClose={() => setSupplierOpen(false)}
          onSaved={(supplier: Supplier) => {
            setPickedSupplier(supplier);
            setSupplierOpen(false);
            setDraft((current) => ({ ...current, supplierId: supplier.id }));
            void client.invalidateQueries({ queryKey: ["suppliers"] });
          }}
        />
      )}
      {productOpen && (
        <ProductForm
          product={null}
          costsEnabled={false}
          onClose={() => setProductOpen(false)}
          onSaved={(product) => {
            setProductOpen(false);
            void client.invalidateQueries({ queryKey: ["products"] });
            void add(product);
          }}
        />
      )}
    </section>
  );
}
