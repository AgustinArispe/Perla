import { PerlaLoading } from '../../components/PerlaLoading';
import type { Customer } from '../../../shared/customers';
import { CustomerForm } from '../customers/CustomerPage';
import { EntityPicker } from '../../components/EntityPicker';
import { unwrap } from '../../api';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '../../../shared/auth';
import { parseQuantity, formatMoney } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { CheckoutController } from './controller';
import { WeightDialog } from './WeightDialog';
import { DiscountDialog } from './DiscountDialog';
import { PaymentDialog } from './PaymentDialog';
import { ProductSearch } from './ProductSearch';
import { Dialog } from '../../components/Dialog';
import { api, errorMessage } from '../../api';
import { webValue } from '../../web-client';
import { scannerMayCapture } from './scanner-focus';
import { paymentLabels } from './PaymentDialog';
import type { PaymentInput } from '../../../shared/sales';
import type { SaleReceipt } from '../../../shared/receipts';
import { Icon } from '../../components/Icon';
import { ReceiptPrint } from '../receipts/ReceiptPrint';
import { ScannerTest } from '../settings/ScannerTest';
export type LeaveGuard = (() => Promise<void>) | null;
export function Checkout({
  user,
  registerLeaveGuard,
  customersEnabled = false,
  customerCreditEnabled = false,
}: {
  user: User;
  registerLeaveGuard: (guard: LeaveGuard) => void;
  customersEnabled?: boolean;
  customerCreditEnabled?: boolean;
}) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const client = useQueryClient();
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => webValue<{ paymentMethods: PaymentInput['method'][] }>('/settings'),
    enabled: !window.bocha,
    retry: false,
  });
  const paymentMethods = window.bocha
    ? (Object.keys(paymentLabels) as PaymentInput['method'][])
    : settings.data?.paymentMethods;
  const [controller] = useState(
    () =>
      new CheckoutController(api(), user.id, localStorage, () => void client.invalidateQueries()),
  );
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const customerSaleKey = useRef(state.body.checkoutKey);
  useEffect(() => {
    if (customerSaleKey.current !== state.body.checkoutKey) {
      customerSaleKey.current = state.body.checkoutKey;
      setCustomer(null);
    }
  }, [state.body.checkoutKey]);
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [weightOnly, setWeightOnly] = useState(false),
    [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [lastScan, setLastScan] = useState<Date | null>(null);
  const [scannerTestOpen, setScannerTestOpen] = useState(false);
  const scanner = useRef<HTMLInputElement>(null);
  const preparedReceiptFor = useRef<string | null>(null);
  const receiptWasOpen = useRef(false);
  useLayoutEffect(() => {
    if (receipt) {
      receiptWasOpen.current = true;
      return;
    }
    if (!receiptWasOpen.current) return;
    receiptWasOpen.current = false;
    if (state.mode === 'SCAN' && scannerMayCapture(document, scanner.current)) {
      // Native modal restoration can leave a previously disabled input focused
      // without an active editing context. Renew it before the next USB scan.
      scanner.current?.blur();
      scanner.current?.focus();
    }
  }, [receipt, state.mode]);
  const run = useCallback((promise: Promise<unknown>) => {
    setError('');
    void promise.catch((failure) => setError(errorMessage(failure)));
  }, []);
  useEffect(() => {
    registerLeaveGuard(controller.beforeLeave);
    void controller.initialize();
    return () => {
      registerLeaveGuard(null);
      controller.dispose();
    };
  }, [controller, registerLeaveGuard]);
  useEffect(() => {
    if (state.mode === 'SCAN' && scannerMayCapture(document, scanner.current))
      scanner.current?.focus();
  }, [state.mode, state.body, state.error, state.pendingScans]);
  useEffect(() => {
    function focusScanner() {
      if (controller.getSnapshot().mode === 'SCAN' && scannerMayCapture(document, scanner.current))
        scanner.current?.focus();
    }
    window.addEventListener('focus', focusScanner);
    window.addEventListener('click', focusScanner);
    return () => {
      window.removeEventListener('focus', focusScanner);
      window.removeEventListener('click', focusScanner);
    };
  }, [controller]);
  useEffect(() => {
    const sale = state.lastSale;
    if (!sale || preparedReceiptFor.current === sale.id) return;
    preparedReceiptFor.current = sale.id;
    void api()
      .receipts.create({ saleId: sale.id, format: 'THERMAL_80' })
      .then((result) => {
        if (result.ok) setReceipt(result.value);
        else setError(result.error.message);
      })
      .catch((failure) => setError(errorMessage(failure)));
  }, [state.lastSale]);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const mode = controller.getSnapshot().mode;
      if (mode !== 'SCAN' || !scannerMayCapture(document, scanner.current)) return;
      if (event.key === 'F2') {
        event.preventDefault();
        scanner.current?.focus();
      } else if (event.key === 'F3' || event.key === 'F6') {
        event.preventDefault();
        setWeightOnly(event.key === 'F6');
        controller.modal('SEARCH');
      } else if (event.key === 'F4') {
        event.preventDefault();
        controller.modal('DISCOUNT');
      } else if (event.key === 'F8') {
        event.preventDefault();
        run(controller.openPayment());
      }
    }
    window.addEventListener('keydown', keyboard);
    return () => window.removeEventListener('keydown', keyboard);
  }, [controller, run]);
  let totals: ReturnType<CheckoutController['totals']> | null = null,
    quoteError = '';
  try {
    totals = controller.totals();
  } catch (failure) {
    quoteError = errorMessage(failure);
  }
  const ready = state.mode === 'SCAN';
  const editable = ready && !state.pendingScans;
  const stale = controller.stale();
  const editing = state.body.lines.find((l) => l.lineId === state.editingLineId);
  const paymentOpen =
    state.mode === 'PAYMENT' || (state.mode === 'BUSY' && state.busyOrigin === 'PAYMENT');
  return (
    <>
      <h1 className="sr-only">Caja</h1>
      {state.lastSale && (
        <div className="sale-confirmed" role="status">
          <strong>Venta guardada · N.º {state.lastSale.number}</strong>
          <span>
            {formatMoney(state.lastSale.totalCents)} · Vuelto{' '}
            {formatMoney(state.lastSale.payments.reduce((sum, p) => sum + p.changeCents, 0))}
          </span>
        </div>
      )}
      {(error || state.error || state.saveError || quoteError) && (
        <div className="alert error" role="alert">
          {error || state.error || state.saveError || quoteError}
        </div>
      )}
      {state.saveError && (
        <button className="button secondary" onClick={() => run(controller.beforeLeave())}>
          Reintentar guardado
        </button>
      )}
      {state.mode === 'ERROR' && (
        <button className="button secondary" onClick={() => run(controller.initialize())}>
          Recuperar conexión de Caja
        </button>
      )}
      {state.pendingSale && (state.mode === 'UNCERTAIN' || state.mode === 'BUSY') && (
        <div className="pending-sale">
          <h2>Venta pendiente de confirmar</h2>
          <p>Consultá el resultado antes de iniciar otra venta.</p>
          <div className="pending-actions">
            <button
              className="button secondary"
              disabled={state.mode === 'BUSY'}
              onClick={() => run(controller.checkPending())}
            >
              Consultar venta
            </button>
            <button
              className="button primary"
              disabled={state.mode === 'BUSY'}
              onClick={() => run(controller.retryPending())}
            >
              Reintentar misma venta
            </button>
            <button
              className="button secondary"
              disabled={state.mode === 'BUSY'}
              onClick={() => run(controller.resumePending())}
            >
              Volver a revisar carrito
            </button>
          </div>
        </div>
      )}
      <div className="checkout-layout">
        <section className="checkout-cart">
          <div className={`checkout-scan${ready ? ' scanner-ready' : ''}`}>
            <div className="checkout-scan-heading">
              <label htmlFor="scanner">Escanear código</label>
              <span className="checkout-save-state">
                {state.unsaved ? 'Guardando borrador…' : 'Borrador al día'}
              </span>
            </div>
            <div className="scanner-field">
              <input
                id="scanner"
                ref={scanner}
                aria-label="Escanear código"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={!ready}
                autoComplete="off"
                spellCheck={false}
                maxLength={128}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const captured = event.currentTarget.value;
                    setCode('');
                    if (captured.trim()) setLastScan(new Date());
                    controller.scan(captured);
                  }
                }}
                placeholder="Código de barras + Enter"
              />
              <span>F2</span>
            </div>
            <div className="checkout-tools">
              <button
                className="button secondary"
                disabled={!editable}
                onClick={() => {
                  setWeightOnly(false);
                  controller.modal('SEARCH');
                }}
              >
                <Icon name="search" size={18} />
                Buscar producto · F3
              </button>
              <button
                className="button secondary"
                disabled={!editable}
                onClick={() => {
                  setWeightOnly(true);
                  controller.modal('SEARCH');
                }}
              >
                <Icon name="box" size={18} />
                Producto por kilo · F6
              </button>
            </div>
            <div className="checkout-diagnostics" role="status">
              <button
                className="button quiet checkout-scanner-diagnostic"
                disabled={!ready}
                onClick={() => setScannerTestOpen(true)}
              >
                {lastScan ? 'Probar conexión de nuevo' : 'Probar conexión del lector'}
              </button>
              <span>
                {state.pendingScans
                  ? `${state.pendingScans} lecturas pendientes`
                  : ready
                    ? lastScan
                      ? `Lector OK · Última lectura ${lastScan.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Listo para escanear'
                    : 'Escaneo suspendido'}
              </span>
            </div>
          </div>
          <div className="checkout-lines">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th className="checkout-line-price">Precio</th>
                  <th>Importe</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {state.body.lines.map((line, index) => {
                  const p = state.products[line.productId],
                    name = line.nameSnapshot ?? p?.name ?? 'Producto no disponible',
                    unit = line.unitSnapshot ?? p?.saleUnit ?? 'UNIT';
                  return (
                    <tr key={line.lineId}>
                      <td>
                        <strong>{name}</strong>
                        <small>
                          {p?.barcode ?? p?.sku ?? ''}
                          {unit === 'KG' ? ' · Porción' : ''}
                          <span className="checkout-line-inline-price">
                            {' · '}
                            {formatMoney(line.expectedPriceCents)}
                            {unit === 'KG' ? ' / kg' : ''}
                          </span>
                        </small>
                      </td>
                      <td>
                        <div className="cart-quantity">
                          {unit === 'UNIT' && (
                            <button
                              className="button secondary small"
                              disabled={!editable || line.quantityBase <= 1}
                              aria-label={`Restar ${name}`}
                              onClick={() =>
                                controller.setQuantity(line.lineId, line.quantityBase - 1)
                              }
                            >
                              −
                            </button>
                          )}
                          <button
                            className="quantity-button"
                            disabled={!editable}
                            aria-label={`Cambiar cantidad de ${name}`}
                            onClick={() => controller.edit(line.lineId)}
                          >
                            {unit === 'UNIT'
                              ? String(line.quantityBase)
                              : formatStock(line.quantityBase, 'KG')}
                          </button>
                          {unit === 'UNIT' && (
                            <button
                              className="button secondary small"
                              disabled={!editable}
                              aria-label={`Sumar ${name}`}
                              onClick={() => {
                                try {
                                  controller.setQuantity(line.lineId, line.quantityBase + 1);
                                } catch (failure) {
                                  setError(errorMessage(failure));
                                }
                              }}
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="checkout-line-price">
                        {formatMoney(line.expectedPriceCents)}
                        {unit === 'KG' && <small>/ kg</small>}
                      </td>
                      <td>
                        <strong>
                          {totals?.lines[index] ? formatMoney(totals.lines[index]!.netCents) : '—'}
                        </strong>
                        {totals?.lines[index]?.discountCents ? (
                          <small className="checkout-line-saving">
                            Antes {formatMoney(totals.lines[index]!.grossCents)}
                          </small>
                        ) : null}
                      </td>
                      <td>
                        <button
                          className="button secondary small"
                          disabled={!editable}
                          aria-label={`Quitar ${name}`}
                          onClick={() => controller.remove(line.lineId)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!state.body.lines.length && (
              <div className="cart-empty">
                <h2>Empezá una venta</h2>
                <p>Escaneá un producto o buscalo por nombre.</p>
              </div>
            )}
          </div>
        </section>
        <aside className="checkout-totals">
          <h2>Venta en curso</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{totals ? formatMoney(totals.subtotalCents) : '—'}</dd>
            </div>
            <div>
              <dt>{state.quote?.promotions.length ? 'Promociones' : 'Descuento'}</dt>
              <dd>{totals ? formatMoney(totals.discountCents) : '—'}</dd>
            </div>
          </dl>
          {state.quote?.promotions.length ? (
            <div className="checkout-promotions" role="status">
              <div>
                <Icon name="tag" size={18} />
                <strong>Ahorrás {formatMoney(state.quote.discountCents)}</strong>
              </div>
              {state.quote.promotions.map((promotion) => (
                <span key={`${promotion.promotionId}:${promotion.revision}`}>{promotion.name}</span>
              ))}
            </div>
          ) : state.quoteLoading && state.body.discount.type === 'NONE' ? (
            <PerlaLoading size="inline" label="Buscando promociones…" />
          ) : null}
          <button
            className="button secondary"
            disabled={!editable}
            onClick={() => controller.modal('DISCOUNT')}
          >
            {state.body.discount.type === 'NONE'
              ? 'Descuento manual · F4'
              : 'Cambiar descuento · F4'}
          </button>
          {customersEnabled && (
            <button
              className="button secondary checkout-customer-button"
              disabled={!editable}
              onClick={() => setCustomerOpen(true)}
            >
              <Icon name="users" size={18} />
              {customer?.name ?? 'Elegir cliente'}
            </button>
          )}
          {customer && (
            <small className="checkout-customer-credit">
              {customer.creditEnabled
                ? `Cuenta disponible ${formatMoney(customer.availableCents)}`
                : 'Cliente sin cuenta corriente'}
            </small>
          )}
          <div className="checkout-total">
            <span>Total</span>
            <strong>{totals ? formatMoney(totals.totalCents) : '—'}</strong>
          </div>
          {stale && (
            <div className="stale-cart">
              <p>Hay productos que cambiaron. Revisá precios o retiralos del carrito.</p>
              <button
                className="button secondary"
                disabled={!editable}
                onClick={() => run(controller.refreshPrices())}
              >
                Actualizar precios
              </button>
            </div>
          )}
          <button
            className="button primary checkout-pay"
            disabled={!editable || !state.body.lines.length || stale || !totals}
            onClick={() => run(controller.openPayment())}
          >
            <Icon name="check" size={22} />
            Cobrar · F8
          </button>
          <button
            className="button secondary"
            disabled={!editable || !state.body.lines.length}
            onClick={() => controller.modal('CANCEL')}
          >
            Cancelar venta en curso
          </button>
        </aside>
      </div>
      {customerOpen && (
        <Dialog title="Cliente de la venta" onClose={() => setCustomerOpen(false)}>
          <div className="checkout-modal">
            <button
              type="button"
              className="button secondary"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCreateCustomerOpen(true)}
            >
              <Icon name="plus" size={18} /> Nuevo cliente
            </button>
            <EntityPicker
              label="Cliente"
              queryKey="customers"
              value={customer}
              onChange={(item) => {
                setCustomer(item);
                setCustomerOpen(false);
              }}
              load={async (query) =>
                unwrap(
                  await api().customers.search({
                    query,
                    activeOnly: true,
                    limit: 30,
                  }),
                ).items
              }
              detail={(item) =>
                item.creditEnabled
                  ? `Disponible ${formatMoney(item.availableCents)}`
                  : (item.phone ?? 'Sin cuenta corriente')
              }
            />
            <button
              type="button"
              className="button quiet"
              onClick={() => {
                setCustomer(null);
                setCustomerOpen(false);
              }}
            >
              Consumidor final
            </button>
          </div>
        </Dialog>
      )}
      {createCustomerOpen && (
        <CustomerForm
          customer={null}
          canManageCredit={
            customerCreditEnabled && (user.role === 'OWNER' || user.role === 'ADMIN')
          }
          onClose={() => setCreateCustomerOpen(false)}
          onSaved={async (item) => {
            setCustomer(item);
            setCreateCustomerOpen(false);
            setCustomerOpen(false);
            await client.invalidateQueries({ queryKey: ['customers'] });
          }}
        />
      )}
      {state.mode === 'SEARCH' && (
        <ProductSearch
          weightOnly={weightOnly}
          onClose={() => controller.closeModal()}
          onSelect={(product) => controller.selectProduct(product)}
        />
      )}
      {scannerTestOpen && (
        <Dialog title="Probar lector" onClose={() => setScannerTestOpen(false)}>
          <ScannerTest compact onVerified={setLastScan} />
        </Dialog>
      )}
      {state.mode === 'DISCOUNT' && (
        <DiscountDialog
          discount={state.body.discount}
          automaticDiscountCents={
            state.body.discount.type === 'NONE' ? (state.quote?.discountCents ?? 0) : 0
          }
          automaticPromotionNames={state.quote?.promotions.map((promotion) => promotion.name) ?? []}
          onClose={() => controller.closeModal()}
          onApply={(discount) => controller.applyDiscount(discount)}
        />
      )}
      {state.mode === 'WEIGHT' && state.weightProduct && (
        <WeightDialog
          product={state.weightProduct}
          initialGrams={editing?.quantityBase ?? null}
          onClose={() => controller.closeModal()}
          onConfirm={(grams) => controller.confirmWeight(grams)}
        />
      )}
      {state.mode === 'EDIT' && editing && (
        <QuantityDialog
          quantity={editing.quantityBase}
          onClose={() => controller.closeModal()}
          onConfirm={(quantity) => {
            controller.setQuantity(editing.lineId, quantity);
            controller.closeModal();
          }}
        />
      )}
      {paymentOpen && totals && paymentMethods && (
        <PaymentDialog
          paymentMethods={paymentMethods}
          totalCents={totals.totalCents}
          role={user.role}
          busy={state.mode === 'BUSY'}
          backendError={state.error}
          customersEnabled={customersEnabled}
          customerCreditEnabled={customerCreditEnabled}
          initialCustomer={customer}
          onCustomerChange={setCustomer}
          onClose={() => controller.closeModal()}
          onConfirm={(payments, override, customer) => controller.pay(payments, override, customer)}
        />
      )}
      {paymentOpen && !paymentMethods && (
        <Dialog title="Cobrar venta" onClose={() => controller.closeModal()}>
          <div className="checkout-modal">
            {settings.error ? (
              <>
                <p role="alert">{errorMessage(settings.error)}</p>
                <button className="button primary" onClick={() => void settings.refetch()}>
                  Reintentar
                </button>
              </>
            ) : (
              <PerlaLoading size="compact" label="Cargando medios de pago…" />
            )}
          </div>
        </Dialog>
      )}
      {state.mode === 'RECOVER' && (
        <Dialog title="Carrito guardado" onClose={() => {}}>
          <div className="checkout-modal">
            <p>Tenés una venta en preparación con {state.recovery?.body.lines.length} renglones.</p>
            <div className="dialog-actions">
              <button className="button secondary" onClick={() => run(controller.cancel())}>
                Descartar carrito
              </button>
              <button className="button primary" onClick={() => run(controller.recover())}>
                Recuperar carrito
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {(state.mode === 'CANCEL' || (state.mode === 'BUSY' && state.busyOrigin === 'CANCEL')) && (
        <Dialog
          title="Cancelar venta en curso"
          busy={state.mode === 'BUSY'}
          onClose={() => controller.closeModal()}
        >
          <div className="checkout-modal">
            <p>Se retirarán los productos de este carrito.</p>
            {state.error && (
              <div className="alert error" role="alert">
                {state.error}
              </div>
            )}
            <div className="dialog-actions">
              <button
                className="button secondary"
                disabled={state.mode === 'BUSY'}
                onClick={() => controller.closeModal()}
              >
                Volver
              </button>
              <button
                className="button primary"
                disabled={state.mode === 'BUSY'}
                onClick={() => run(controller.cancel())}
              >
                Confirmar cancelación
              </button>
            </div>
          </div>
        </Dialog>
      )}
      {receipt && <ReceiptPrint receipt={receipt} onClose={() => setReceipt(null)} />}
    </>
  );
}
function QuantityDialog({
  quantity,
  onClose,
  onConfirm,
}: {
  quantity: number;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}) {
  const [value, setValue] = useState(String(quantity)),
    [error, setError] = useState('');
  return (
    <Dialog title="Modificar cantidad" onClose={onClose}>
      <form
        className="checkout-modal"
        onSubmit={(event) => {
          event.preventDefault();
          try {
            onConfirm(parseQuantity(value, 'UNIT'));
          } catch (failure) {
            setError(errorMessage(failure));
          }
        }}
      >
        <label className="field">
          Cantidad
          <input
            inputMode="numeric"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            autoFocus
          />
        </label>
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <button className="button primary">Guardar cantidad · Enter</button>
      </form>
    </Dialog>
  );
}
