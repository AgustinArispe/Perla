import { PerlaLoading } from '../../components/PerlaLoading';
import { PageHeading } from '../../components/PageHeader';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SaleReceipt } from '../../../shared/receipts';
import { formatMoney } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { ReceiptPrint } from './ReceiptPrint';

export function ReceiptQueue() {
  const [selected, setSelected] = useState<SaleReceipt | null>(null);
  const receipts = useQuery({
    queryKey: ['receipt-queue'],
    queryFn: async () => unwrap(await api().receipts.list({ status: 'PENDING' })),
    retry: false,
  });
  return (
    <>
      <PageHeading className="page-heading">
        <div>
          <h1>Comprobantes</h1>
          <p>Ventas listas para imprimir</p>
        </div>
      </PageHeading>
      {receipts.isError && <div className="alert error">{errorMessage(receipts.error)}</div>}
      <section className="catalog-card">
        {receipts.isPending && <PerlaLoading size="panel" label="Cargando comprobantes…" />}
        {!receipts.isPending && !receipts.data?.items.length && (
          <div className="empty-state">
            <h2>No hay comprobantes pendientes</h2>
            <p>Al elegir imprimir desde una venta, el comprobante queda disponible acá.</p>
          </div>
        )}
        {receipts.data?.items.map((receipt) => (
          <div className="receipt-queue-row" key={receipt.id}>
            <div>
              <strong>Venta N.º {receipt.saleNumber}</strong>
              <small>
                {receipt.snapshot.sale.items.length} productos ·{' '}
                {formatMoney(receipt.snapshot.sale.totalCents)}
              </small>
            </div>
            <button className="button primary small" onClick={() => setSelected(receipt)}>
              Imprimir
            </button>
          </div>
        ))}
      </section>
      {selected && (
        <ReceiptPrint
          receipt={selected}
          onClose={() => {
            setSelected(null);
            void receipts.refetch();
          }}
        />
      )}
    </>
  );
}
