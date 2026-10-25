import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '../../../shared/auth';
import type { Product } from '../../../shared/catalog';
import type { PreparedOrder, PreparedOrderCreate } from '../../../shared/prepared-orders';
import { formatMoney, parseQuantity } from '../../../domain/values';
import { formatStock } from '../../../domain/inventory';
import { api, unwrap, errorMessage } from '../../api';
import { PageHeading } from '../../components/PageHeader';
import { Dialog } from '../../components/Dialog';
import { PerlaLoading } from '../../components/PerlaLoading';
import { ProductSearch } from '../checkout/ProductSearch';
import '../delivery-notes/delivery-notes.css';

export function PreparedOrdersPage({ enabled, user }: { enabled: boolean; user: User }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<PreparedOrder['status']>('READY');
  const [number, setNumber] = useState('');
  const [search, setSearch] = useState(false);
  const [lines, setLines] = useState<{ product: Product; quantity: string; lineId: string }[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const [checkoutKey, setCheckoutKey] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PreparedOrderCreate | null>(null);
  const [selected, setSelected] = useState<PreparedOrder | null>(null);
  const orders = useQuery({
    queryKey: ['prepared-orders', status, number],
    queryFn: () =>
      api()
        .preparedOrders.list({ status, ...(Number(number) > 0 ? { number: Number(number) } : {}) })
        .then(unwrap),
  });
  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const input = pending ?? {
        operationKey,
        customerName: name,
        note,
        body: {
          checkoutKey,
          discount: { type: 'NONE' as const },
          lines: lines.map((line) => ({
            lineId: line.lineId,
            productId: line.product.id,
            quantityBase: parseQuantity(line.quantity, line.product.saleUnit),
            expectedProductRevision: line.product.revision,
            expectedPriceCents: line.product.priceCents,
          })),
        },
      };
      setPending(input);
      const result = await api().preparedOrders.create(input);
      if (!result.ok) {
        setError(result.error.message);
        setPending(result.error.retryable ? input : null);
        return;
      }
      setPending(null);
      setSelected(result.value);
      setLines([]);
      setName('');
      setNote('');
      setOperationKey(crypto.randomUUID());
      setCheckoutKey(crypto.randomUUID());
      await Promise.all([
        orders.refetch(),
        client.invalidateQueries({ queryKey: ['prepared-order-history'] }),
      ]);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading className="page-heading">
        <div>
          <h1>Órdenes para caja</h1>
          <p>Prepará el pedido y entregá su número al cliente para pagar en caja.</p>
        </div>
      </PageHeading>
      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}
      {enabled && (
        <section className="catalog-card">
          <form onSubmit={(e) => void create(e)} style={{ padding: 20 }}>
            <h2>Preparar orden sin cobrar</h2>
            <fieldset className="delivery-note-form" disabled={busy || Boolean(pending)}>
              <label>
                Cliente o referencia
                <input
                  required
                  minLength={2}
                  maxLength={160}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                Observaciones
                <textarea value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
              </label>
              <button type="button" className="button secondary" onClick={() => setSearch(true)}>
                Agregar artículo
              </button>
              {lines.map((line, index) => (
                <div className="receipt-queue-row" key={line.lineId}>
                  <div>
                    <strong>{line.product.name}</strong>
                    <small>
                      {formatMoney(line.product.priceCents)} /{' '}
                      {line.product.saleUnit === 'KG' ? 'kg' : 'unidad'}
                    </small>
                  </div>
                  <label>
                    Cantidad de {line.product.name}
                    <input
                      required
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((current) =>
                          current.map((l, i) =>
                            i === index ? { ...l, quantity: e.target.value } : l,
                          ),
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    Quitar
                  </button>
                </div>
              ))}
            </fieldset>
            <button className="button primary" disabled={busy || !lines.length}>
              {busy ? 'Preparando…' : pending ? 'Reintentar preparación' : 'Enviar orden a caja'}
            </button>
            {pending && (
              <p>
                Reintentá con los mismos datos o consultá el historial antes de preparar otra orden.
              </p>
            )}
          </form>
        </section>
      )}
      {!enabled && (
        <p className="alert">
          La preparación está desactivada. Las órdenes pendientes se pueden cobrar en Caja o
          cancelar.
        </p>
      )}
      <section className="catalog-card">
        <div className="delivery-note-filters">
          <label>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="READY">Pendientes de cobro</option>
              <option value="PAID">Cobradas</option>
              <option value="CANCELLED">Canceladas</option>
            </select>
          </label>
          <label>
            Número de orden
            <input
              type="number"
              min="1"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
          <button className="button secondary" onClick={() => void orders.refetch()}>
            Actualizar
          </button>
        </div>
        {orders.isPending && <PerlaLoading size="panel" label="Cargando órdenes…" />}
        {orders.isError && <p className="alert error">{errorMessage(orders.error)}</p>}
        {!orders.isPending && !orders.isError && !orders.data?.items.length && (
          <p className="empty-state">No hay órdenes para estos filtros.</p>
        )}
        {orders.data?.items.map((order) => (
          <div className="receipt-queue-row" key={order.id}>
            <div>
              <strong>
                Orden N.º {order.number} · {order.customerName}
              </strong>
              <small>
                {order.preparedBy} · {formatMoney(order.quote.totalCents)}
              </small>
            </div>
            <button className="button secondary" onClick={() => setSelected(order)}>
              Ver orden
            </button>
          </div>
        ))}
        {Boolean(orders.data?.total && orders.data.total > orders.data.items.length) && (
          <p>
            Se muestran las últimas 30 de {orders.data?.total}. Buscá una orden anterior por su
            número.
          </p>
        )}
      </section>
      {search && (
        <ProductSearch
          weightOnly={false}
          onClose={() => setSearch(false)}
          onSelect={(product) => {
            setLines((current) =>
              current.some((l) => l.product.id === product.id)
                ? current
                : [...current, { product, quantity: '1', lineId: crypto.randomUUID() }],
            );
            setSearch(false);
          }}
        />
      )}
      {selected && (
        <PreparedOrderPrint
          order={selected}
          user={user}
          onClose={() => {
            setSelected(null);
            void orders.refetch();
          }}
        />
      )}
    </>
  );
}
export function PreparedOrderPrint({
  order,
  user,
  onClose,
}: {
  order: PreparedOrder;
  user: User;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [key] = useState(() => crypto.randomUUID());
  async function cancel(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      unwrap(
        await api().preparedOrders.cancel({
          orderId: order.id,
          expectedRevision: order.revision,
          operationKey: key,
          reason,
        }),
      );
      onClose();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  }
  return createPortal(
    <Dialog
      title="Orden para caja"
      className="receipt-dialog delivery-note-dialog"
      wide
      busy={busy}
      onClose={onClose}
    >
      <article className="receipt-preview delivery-note-print">
        <header>
          <strong>Orden N.º {order.number}</strong>
          <span>
            {order.status === 'READY'
              ? 'PENDIENTE DE PAGO — PRESENTAR EN CAJA'
              : order.status === 'PAID'
                ? `COBRADA · VENTA N.º ${order.saleNumber}`
                : 'CANCELADA'}
          </span>
        </header>
        <p>
          Cliente: {order.customerName}
          <br />
          Preparó: {order.preparedBy}
          <br />
          Fecha:{' '}
          {new Intl.DateTimeFormat('es-AR', {
            dateStyle: 'short',
            timeStyle: 'short',
            timeZone: 'America/Argentina/Buenos_Aires',
          }).format(new Date(order.createdAt))}
          <br />
          Ubicación: {order.locationName}
        </p>
        <table>
          <thead>
            <tr>
              <th>Artículo</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td>{item.name}</td>
                <td>{formatStock(item.quantityBase, item.unit)}</td>
                <td>{formatMoney(item.unitPriceCents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Total a cobrar: <strong>{formatMoney(order.quote.totalCents)}</strong>
        </p>
        {order.note && <p>{order.note}</p>}
        <footer>Orden interna. No acredita pago ni es válida como factura.</footer>
      </article>
      <div className="no-print">
        {error && <p className="alert error">{error}</p>}
        {cancelling && (
          <form onSubmit={(e) => void cancel(e)}>
            <label>
              Motivo de cancelación
              <input
                required
                minLength={3}
                maxLength={240}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button className="button primary" disabled={busy}>
              Confirmar cancelación
            </button>
          </form>
        )}
      </div>
      <div className="dialog-footer no-print">
        <button className="button secondary" onClick={onClose} disabled={busy}>
          Cerrar
        </button>
        <button className="button primary" onClick={() => window.print()}>
          Imprimir orden
        </button>
        {order.status === 'READY' && (user.name === order.preparedBy || user.role !== 'SELLER') && (
          <button className="button secondary" onClick={() => setCancelling(true)}>
            Cancelar orden
          </button>
        )}
      </div>
    </Dialog>,
    document.body,
  );
}
