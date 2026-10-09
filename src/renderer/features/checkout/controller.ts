import type { BochaApi } from '../../../shared/contracts';
import type { DraftRecord, Product } from '../../../shared/catalog';
import { DraftBodySchema } from '../../../shared/catalog';
import {
  CheckoutSchema,
  type CheckoutInput,
  type PaymentInput,
  type SaleDetail,
  type SaleQuote,
} from '../../../shared/sales';
import { calculateSale } from '../../../domain/sale';
import { ScanQueue } from '../../../domain/scan-queue';
import { DraftWriter } from './draft-writer';
import { unwrap, errorMessage } from '../../api';
type Body = DraftRecord['body'];
type Mode =
  | 'LOADING'
  | 'SCAN'
  | 'RECOVER'
  | 'SEARCH'
  | 'DISCOUNT'
  | 'WEIGHT'
  | 'EDIT'
  | 'PAYMENT'
  | 'CANCEL'
  | 'BUSY'
  | 'UNCERTAIN'
  | 'ERROR';
const empty = (): Body => ({
  checkoutKey: crypto.randomUUID(),
  lines: [],
  discount: { type: 'NONE' },
});
const SCANNER_CACHE_MS = 2_000;
const SCANNER_CACHE_LIMIT = 256;
export interface CheckoutState {
  body: Body;
  products: Record<string, Product>;
  mode: Mode;
  error: string;
  saveError: string;
  unsaved: boolean;
  pendingScans: number;
  recovery: DraftRecord | null;
  weightProduct: Product | null;
  editingLineId: string | null;
  lastSale: SaleDetail | null;
  pendingSale: CheckoutInput | null;
  busyOrigin: Mode | null;
  quote: SaleQuote | null;
  quoteLoading: boolean;
  catalogReviewRequired: boolean;
}
export class CheckoutController {
  private state: CheckoutState = {
    body: empty(),
    products: {},
    mode: 'LOADING',
    error: '',
    saveError: '',
    unsaved: false,
    pendingScans: 0,
    recovery: null,
    weightProduct: null,
    editingLineId: null,
    lastSale: null,
    pendingSale: null,
    busyOrigin: null,
    quote: null,
    quoteLoading: false,
    catalogReviewRequired: false,
  };
  private loadGeneration = 0;
  private readonly listeners = new Set<() => void>();
  private readonly writer: DraftWriter;
  private readonly queue: ScanQueue;
  private readonly barcodeCache = new Map<string, { product: Product; readAt: number }>();
  private weightResolve: ((grams: number | null) => void) | null = null;
  private quoteTimer: ReturnType<typeof setTimeout> | null = null;
  private quoteGeneration = 0;
  private disposed = false;
  private readonly storageKey: string;
  constructor(
    private readonly backend: BochaApi,
    userId: string,
    private readonly storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    private readonly onSale: () => void = () => {},
  ) {
    this.storageKey = `bocha.checkout.pending.v1.${userId}`;
    this.writer = new DraftWriter(backend.checkout, () =>
      this.patch({ unsaved: this.writer.unsaved, saveError: this.writer.error }),
    );
    this.queue = new ScanQueue(
      async (code, current) => {
        const cached = code.startsWith('@') ? undefined : this.barcodeCache.get(code);
        const product =
          cached && Date.now() - cached.readAt <= SCANNER_CACHE_MS
            ? cached.product
            : unwrap(
                code.startsWith('@')
                  ? await backend.products.get(code.slice(1))
                  : await backend.products.findByBarcode(code),
              );
        if (!code.startsWith('@')) this.cacheBarcode(code, product);
        if (!current() || this.disposed) return;
        let quantity = 1;
        if (product.saleUnit === 'KG') {
          this.patch({ mode: 'WEIGHT', weightProduct: product, editingLineId: null });
          const grams = await new Promise<number | null>(
            (resolve) => (this.weightResolve = resolve),
          );
          this.weightResolve = null;
          if (grams === null || !current() || this.disposed) return;
          quantity = grams;
        }
        this.add(product, quantity);
        if (!this.disposed) this.patch({ mode: 'SCAN', weightProduct: null });
      },
      () => this.patch({ pendingScans: this.queue.pending }),
    );
  }
  private cacheBarcode(code: string, product: Product): void {
    if (this.barcodeCache.size >= SCANNER_CACHE_LIMIT) {
      const oldest = this.barcodeCache.keys().next().value;
      if (oldest) this.barcodeCache.delete(oldest);
    }
    this.barcodeCache.set(code, { product, readAt: Date.now() });
  }
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = () => this.state;
  private patch(patch: Partial<CheckoutState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  private change(body: Body): void {
    this.patch({ body, error: '', quote: null });
    this.writer.update(body);
    this.scheduleQuote();
  }
  private scheduleQuote(): void {
    if (this.quoteTimer) clearTimeout(this.quoteTimer);
    if (!this.state.body.lines.length) {
      this.patch({ quote: null, quoteLoading: false });
      return;
    }
    this.quoteTimer = setTimeout(() => void this.refreshQuote(true).catch(() => {}), 90);
  }
  async refreshQuote(silent = false): Promise<SaleQuote> {
    const generation = ++this.quoteGeneration;
    const body = this.state.body;
    this.patch({ quoteLoading: true });
    try {
      const quoteMethod = this.backend.sales?.quote;
      const response = quoteMethod ? await quoteMethod(body) : null;
      if (
        response &&
        !response.ok &&
        ['REVISION_CONFLICT', 'INACTIVE'].includes(response.error.code) &&
        !this.disposed &&
        generation === this.quoteGeneration &&
        body === this.state.body
      ) {
        this.barcodeCache.clear();
        this.patch({ catalogReviewRequired: true });
      }
      const quote = response
        ? unwrap(response)
        : (() => {
            const local = calculateSale(this.saleLines(), body.discount);
            return {
              quoteHash: '',
              ...local,
              lines: local.lines.map((line, index) => ({
                ...line,
                lineId: body.lines[index]!.lineId,
              })),
              promotions: [],
            } satisfies SaleQuote;
          })();
      if (!this.disposed && generation === this.quoteGeneration && body === this.state.body)
        this.patch({ quote, quoteLoading: false, catalogReviewRequired: false });
      return quote;
    } catch (failure) {
      if (!this.disposed && generation === this.quoteGeneration)
        this.patch({
          quote: null,
          quoteLoading: false,
          ...(silent ? {} : { error: errorMessage(failure) }),
        });
      throw failure;
    }
  }
  async initialize(): Promise<void> {
    this.disposed = false;
    const generation = ++this.loadGeneration;
    this.patch({ mode: 'LOADING', error: '' });
    try {
      const raw = this.storage.getItem(this.storageKey);
      const pending = raw ? CheckoutSchema.parse(JSON.parse(raw)) : null;
      const record = unwrap(await this.backend.checkout.getDraft());
      if (this.disposed || generation !== this.loadGeneration) return;
      this.writer.reset(record);
      if (pending) {
        await this.hydrate(
          record?.body ??
            DraftBodySchema.parse({
              checkoutKey: pending.checkoutKey,
              lines: pending.lines,
              discount: pending.discount,
            }),
        );
        if (this.disposed || generation !== this.loadGeneration) return;
        this.patch({ mode: 'UNCERTAIN', pendingSale: pending });
        await this.checkPending();
      } else if (record?.body.lines.length) this.patch({ mode: 'RECOVER', recovery: record });
      else this.patch({ body: record?.body ?? empty(), mode: 'SCAN' });
    } catch (error) {
      this.patch({ mode: 'ERROR', error: errorMessage(error) });
    }
  }
  private async hydrate(body: Body): Promise<void> {
    const products: Record<string, Product> = {};
    await Promise.all(
      [...new Set(body.lines.map((l) => l.productId))].map(async (id) => {
        const result = await this.backend.products.get(id);
        if (result.ok) products[id] = result.value;
      }),
    );
    this.patch({ body, products, quote: null });
    this.scheduleQuote();
  }
  async recover(): Promise<void> {
    if (!this.state.recovery) return;
    const record = this.state.recovery;
    await this.hydrate(record.body);
    this.patch({ mode: 'SCAN', recovery: null });
  }
  private add(product: Product, quantity: number): void {
    const lines = [...this.state.body.lines];
    const found =
      product.saleUnit === 'UNIT'
        ? lines.findIndex(
            (l) =>
              l.productId === product.id &&
              l.expectedProductRevision === product.revision &&
              l.expectedPriceCents === product.priceCents,
          )
        : -1;
    if (found >= 0)
      lines[found] = { ...lines[found]!, quantityBase: lines[found]!.quantityBase + quantity };
    else
      lines.push({
        lineId: crypto.randomUUID(),
        productId: product.id,
        quantityBase: quantity,
        expectedProductRevision: product.revision,
        expectedPriceCents: product.priceCents,
        nameSnapshot: product.name,
        unitSnapshot: product.saleUnit,
      });
    const body = DraftBodySchema.parse({ ...this.state.body, lines });
    this.patch({ products: { ...this.state.products, [product.id]: product }, lastSale: null });
    this.change(body);
  }
  scan(code: string): void {
    if (this.state.mode !== 'SCAN') return;
    const text = code.trim();
    if (!text) return;
    if (text.length > 64) {
      this.patch({ error: 'El código supera 64 caracteres.' });
      return;
    }
    this.patch({ error: '' });
    void this.queue.enqueue(text).catch((error) => {
      this.patch({ error: errorMessage(error), mode: 'SCAN' });
    });
  }
  selectProduct(product: Product): void {
    this.patch({ mode: 'SCAN' });
    this.scan(`@${product.id}`);
  }
  modal(mode: 'SEARCH' | 'DISCOUNT' | 'CANCEL'): void {
    if (this.state.mode === 'SCAN' && !this.queue.pending) this.patch({ mode, error: '' });
  }
  closeModal(): void {
    if (['BUSY', 'UNCERTAIN', 'RECOVER', 'LOADING', 'ERROR'].includes(this.state.mode)) return;
    if (this.weightResolve) {
      this.weightResolve(null);
      this.weightResolve = null;
    }
    const wasPayment = this.state.mode === 'PAYMENT';
    this.patch({ mode: 'SCAN', weightProduct: null, editingLineId: null, error: '' });
    if (wasPayment) this.writer.resumeAutosave();
  }
  confirmWeight(grams: number): void {
    if (this.state.editingLineId) {
      this.setQuantity(this.state.editingLineId, grams);
      this.closeModal();
    } else if (this.weightResolve) {
      this.weightResolve(grams);
      this.patch({ mode: 'SCAN', weightProduct: null });
    }
  }
  edit(lineId: string): void {
    if (this.state.mode !== 'SCAN' || this.queue.pending) return;
    const line = this.state.body.lines.find((l) => l.lineId === lineId);
    if (!line) return;
    const product = this.state.products[line.productId];
    if ((line.unitSnapshot ?? product?.saleUnit) === 'KG' && product)
      this.patch({
        mode: 'WEIGHT',
        weightProduct: { ...product, priceCents: line.expectedPriceCents },
        editingLineId: lineId,
      });
    else this.patch({ mode: 'EDIT', editingLineId: lineId });
  }
  setQuantity(lineId: string, quantity: number): void {
    const body = DraftBodySchema.parse({
      ...this.state.body,
      lines: this.state.body.lines.map((l) =>
        l.lineId === lineId ? { ...l, quantityBase: quantity } : l,
      ),
    });
    const line = body.lines.find((l) => l.lineId === lineId);
    if (
      line &&
      (line.unitSnapshot ?? this.state.products[line.productId]?.saleUnit) === 'KG' &&
      quantity > 99999
    )
      throw new Error('El peso supera 99.999 gramos.');
    this.change(body);
  }
  remove(lineId: string): void {
    if (this.state.mode !== 'SCAN') return;
    this.change({
      ...this.state.body,
      lines: this.state.body.lines.filter((l) => l.lineId !== lineId),
    });
  }
  applyDiscount(discount: Body['discount']): void {
    const next = DraftBodySchema.shape.discount.parse(discount);
    if (this.state.body.lines.length) calculateSale(this.saleLines(), next);
    else if (next.type === 'FIXED' && next.amountCents)
      throw new Error('Agregá productos antes de aplicar un monto fijo.');
    this.change({ ...this.state.body, discount: next });
    this.closeModal();
  }
  private saleLines() {
    return this.state.body.lines.map((l) => ({
      unit: l.unitSnapshot ?? this.state.products[l.productId]?.saleUnit ?? 'UNIT',
      priceCents: l.expectedPriceCents,
      quantityBase: l.quantityBase,
    }));
  }
  totals() {
    if (!this.state.body.lines.length)
      return { subtotalCents: 0, discountCents: 0, totalCents: 0, lines: [] };
    return this.state.quote ?? calculateSale(this.saleLines(), this.state.body.discount);
  }
  stale(): boolean {
    if (this.state.body.lines.length && this.state.catalogReviewRequired) return true;
    return this.state.body.lines.some((l) => {
      const p = this.state.products[l.productId];
      return (
        !p ||
        !p.active ||
        p.priceCents !== l.expectedPriceCents ||
        p.revision !== l.expectedProductRevision ||
        (l.unitSnapshot !== undefined && l.unitSnapshot !== p.saleUnit)
      );
    });
  }
  async refreshPrices(): Promise<void> {
    if (this.state.mode !== 'SCAN' || this.queue.pending) return;
    this.patch({ mode: 'BUSY', busyOrigin: 'SCAN' });
    try {
      const body = this.state.body;
      const products: Record<string, Product> = {};
      for (const line of body.lines) {
        const p = unwrap(await this.backend.products.get(line.productId));
        if (!p.active) throw new Error(`${p.name} está inactivo. Retiralo del carrito.`);
        if (p.saleUnit !== (line.unitSnapshot ?? this.state.products[line.productId]?.saleUnit))
          throw new Error(`${p.name} cambió de unidad. Retiralo y agregalo nuevamente.`);
        products[p.id] = p;
      }
      this.barcodeCache.clear();
      this.patch({ products, catalogReviewRequired: false });
      this.change({
        ...body,
        lines: body.lines.map((l) => {
          const p = products[l.productId]!;
          return {
            ...l,
            expectedProductRevision: p.revision,
            expectedPriceCents: p.priceCents,
            nameSnapshot: p.name,
            unitSnapshot: p.saleUnit,
          };
        }),
      });
    } finally {
      this.patch({ mode: 'SCAN' });
    }
  }
  async openPayment(): Promise<void> {
    if (this.state.mode !== 'SCAN') return;
    await this.queue.flush();
    if (this.state.mode !== 'SCAN') return;
    if (!this.state.body.lines.length || this.stale())
      throw new Error('Revisá los productos antes de cobrar.');
    await this.refreshQuote(false);
    this.patch({ mode: 'PAYMENT', error: '' });
  }
  async pay(
    payments: PaymentInput[],
    negativeStockOverride?: { reason: string },
    customer?: { customerId: string; onAccountCents: number },
  ): Promise<void> {
    if (this.state.mode !== 'PAYMENT') return;
    this.patch({ mode: 'BUSY', busyOrigin: 'PAYMENT', error: '' });
    try {
      const draftRevision = await this.writer.checkoutRevision();
      const input = CheckoutSchema.parse({
        ...this.state.body,
        payments,
        ...(customer ? customer : {}),
        ...(this.state.quote?.quoteHash ? { expectedQuoteHash: this.state.quote.quoteHash } : {}),
        ...(draftRevision ? { expectedDraftRevision: draftRevision } : {}),
        ...(negativeStockOverride ? { negativeStockOverride } : {}),
      });
      this.storage.setItem(this.storageKey, JSON.stringify(input));
      this.patch({ pendingSale: input });
      await this.sendPending(false);
    } catch (error) {
      this.patch({
        mode: this.state.pendingSale ? 'UNCERTAIN' : 'PAYMENT',
        error: errorMessage(error),
      });
    }
  }
  private async sendPending(retry: boolean): Promise<void> {
    const input = this.state.pendingSale;
    if (!input) return;
    this.patch({ mode: 'BUSY' });
    const result = await this.backend.sales.complete(input);
    if (result.ok) this.accepted(result.value);
    else if (retry || result.error.retryable) {
      this.patch({ mode: 'UNCERTAIN', error: result.error.message });
    } else {
      this.storage.removeItem(this.storageKey);
      await this.hydrate(this.state.body);
      this.patch({ pendingSale: null, mode: 'SCAN', error: result.error.message });
      this.writer.resumeAutosave();
    }
  }
  private accepted(sale: SaleDetail): void {
    try {
      this.storage.removeItem(this.storageKey);
    } catch {
      /* Result is already confirmed; recovery will find this same sale. */
    }
    this.writer.reset(null);
    this.patch({
      body: empty(),
      products: {},
      mode: 'SCAN',
      pendingSale: null,
      recovery: null,
      lastSale: sale,
      quote: null,
      quoteLoading: false,
      catalogReviewRequired: false,
      error: '',
    });
    this.onSale();
  }
  async checkPending(): Promise<void> {
    const input = this.state.pendingSale;
    if (!input || this.state.mode !== 'UNCERTAIN') return;
    this.patch({ mode: 'BUSY', busyOrigin: 'UNCERTAIN' });
    let sale: SaleDetail | null;
    try {
      sale = unwrap(await this.backend.sales.findByCheckoutKey(input.checkoutKey));
    } catch (error) {
      this.patch({ mode: 'UNCERTAIN', error: errorMessage(error) });
      return;
    }
    if (sale) this.accepted(sale);
    else
      this.patch({
        mode: 'UNCERTAIN',
        error: 'La venta todavía no figura guardada. Consultá o reintentá con los mismos datos.',
      });
  }
  async retryPending(): Promise<void> {
    if (this.state.mode !== 'UNCERTAIN') return;
    try {
      await this.sendPending(true);
    } catch (error) {
      this.patch({ mode: 'UNCERTAIN', error: errorMessage(error) });
    }
  }
  async resumePending(): Promise<void> {
    const input = this.state.pendingSale;
    if (!input || this.state.mode !== 'UNCERTAIN') return;
    this.patch({ mode: 'BUSY', busyOrigin: 'UNCERTAIN' });
    try {
      const result = unwrap(await this.backend.sales.findByCheckoutKey(input.checkoutKey));
      if (result) {
        this.accepted(result);
        return;
      }
      await this.hydrate(this.state.body);
      this.storage.removeItem(this.storageKey);
      this.patch({ pendingSale: null, mode: 'SCAN', error: '' });
    } catch (error) {
      this.patch({ mode: 'UNCERTAIN', error: errorMessage(error) });
    }
  }
  async cancel(): Promise<void> {
    if (this.state.mode !== 'CANCEL' && this.state.mode !== 'RECOVER') return;
    this.patch({ mode: 'BUSY', busyOrigin: 'CANCEL' });
    try {
      this.queue.cancel();
      await this.writer.flush();
      unwrap(await this.backend.checkout.cancelDraft(this.writer.revision));
      this.writer.reset(null);
      this.patch({
        body: empty(),
        products: {},
        mode: 'SCAN',
        recovery: null,
        lastSale: null,
        quote: null,
        quoteLoading: false,
        error: '',
      });
    } catch (error) {
      this.patch({ mode: 'CANCEL', error: errorMessage(error) });
    }
  }
  beforeLeave = async (): Promise<void> => {
    if (!['SCAN', 'RECOVER', 'ERROR'].includes(this.state.mode))
      throw new Error('Confirmá el resultado de la venta antes de salir.');
    if (this.queue.pending) throw new Error('Esperá a que terminen las lecturas antes de salir.');
    const mode = this.state.mode;
    this.patch({ mode: 'BUSY', busyOrigin: mode });
    try {
      await this.writer.flush();
    } finally {
      this.patch({ mode });
    }
  };
  dispose(): void {
    this.disposed = true;
    this.loadGeneration++;
    this.queue.cancel();
    if (this.quoteTimer) clearTimeout(this.quoteTimer);
    this.quoteGeneration++;
    this.barcodeCache.clear();
    this.weightResolve?.(null);
    this.writer.dispose();
    this.listeners.clear();
  }
}
