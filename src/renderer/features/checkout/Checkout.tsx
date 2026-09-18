import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
export type LeaveGuard = (() => Promise<void>) | null;
export function Checkout({
  user,
  registerLeaveGuard,
}: {
  user: User;
  registerLeaveGuard: (guard: LeaveGuard) => void;
}) {
  const client = useQueryClient();
  const [controller] = useState(
    () =>
      new CheckoutController(api(), user.id, localStorage, () => void client.invalidateQueries()),
  );
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const [code, setCode] = useState(''),
    [error, setError] = useState(''),
    [weightOnly, setWeightOnly] = useState(false);
  const scanner = useRef<HTMLInputElement>(null);
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
    if (state.mode === 'SCAN') scanner.current?.focus();
  }, [state.mode, state.body, state.error, state.pendingScans]);
  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const mode = controller.getSnapshot().mode;
      if (mode !== 'SCAN') return;
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
      <div className="page-heading checkout-heading">
        <div>
          <span className="eyebrow">PUNTO DE VENTA</span>
          <h1>Caja</h1>
        </div>
        <span className="checkout-save-state">
          {state.unsaved ? 'Guardando borrador…' : 'Borrador al día'}
        </span>
      </div>
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
          <div className="checkout-scan">
            <label htmlFor="scanner">Escanear código</label>
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
                Producto por kilo · F6
              </button>
              <span>
                {state.pendingScans
                  ? `${state.pendingScans} lecturas pendientes`
                  : ready
                    ? 'Escaneo listo'
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
                  <th>Precio</th>
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
                      <td>
                        {formatMoney(line.expectedPriceCents)}
                        {unit === 'KG' && <small>/ kg</small>}
                      </td>
                      <td>
                        <strong>
                          {totals?.lines[index]
                            ? formatMoney(totals.lines[index]!.grossCents)
                            : '—'}
                        </strong>
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
              <dt>Descuento</dt>
              <dd>{totals ? formatMoney(totals.discountCents) : '—'}</dd>
            </div>
          </dl>
          <button
            className="button secondary"
            disabled={!editable}
            onClick={() => controller.modal('DISCOUNT')}
          >
            Cambiar descuento · F4
          </button>
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
      {state.mode === 'SEARCH' && (
        <ProductSearch
          weightOnly={weightOnly}
          onClose={() => controller.closeModal()}
          onSelect={(product) => controller.selectProduct(product)}
        />
      )}
      {state.mode === 'DISCOUNT' && (
        <DiscountDialog
          discount={state.body.discount}
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
      {paymentOpen && totals && (
        <PaymentDialog
          totalCents={totals.totalCents}
          role={user.role}
          busy={state.mode === 'BUSY'}
          backendError={state.error}
          onClose={() => controller.closeModal()}
          onConfirm={(payments, override) => controller.pay(payments, override)}
        />
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
