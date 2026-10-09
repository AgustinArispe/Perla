import {ExportButton} from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatMoney, quantityInput } from '../../../domain/values';
import type { PurchaseDetail as Detail } from '../../../shared/purchases';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

export function PurchaseDetail({
  purchaseId,
  accountsEnabled = false,
  onClose,
}: {
  purchaseId: string;
  accountsEnabled?: boolean;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [reason, setReason] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const detail = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async () => unwrap(await api().purchases.detail(purchaseId)),
  });
  const preview = useQuery({
    queryKey: ['purchase-void-preview', purchaseId],
    queryFn: async () => unwrap(await api().purchases.previewVoid(purchaseId)),
    enabled: detail.data?.status === 'RECEIVED',
  });
  const account = useQuery({
    queryKey: ['supplier-account', detail.data?.supplierId],
    queryFn: async () =>
      unwrap(await api().supplierAccounts.detail(detail.data!.supplierId)),
    enabled: accountsEnabled && Boolean(detail.data?.supplierId),
    retry: false,
  });
  async function voidPurchase() {
    if (!reason.trim()) return;
    setConfirming(true);
    try {
      unwrap(await api().purchases.void({ purchaseId, operationKey: crypto.randomUUID(), reason }));
      await client.invalidateQueries({ queryKey: ['purchases'] });
      await client.invalidateQueries({ queryKey: ['supplier-account'] });
      await client.invalidateQueries({ queryKey: ['suppliers'] });
      await detail.refetch();
      setError('');
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setConfirming(false);
    }
  }
  const purchase = detail.data as Detail | undefined;
  const payable = account.data?.payables.find((item) => item.purchaseId === purchaseId);
  return (
    <Dialog
      title={purchase ? `Compra N.º ${purchase.number}` : 'Compra'}
      onClose={onClose}
      wide
      busy={confirming}
    >
      <div className="dialog-body purchase-detail"><ExportButton dataset="purchaseDetail" filters={{purchaseId}} />
        {detail.isPending && <p>Cargando compra…</p>}
        {detail.isError && <div className="alert error">{errorMessage(detail.error)}</div>}
        {purchase && (
          <>
            <div className="purchase-detail-hero">
              <div>
                <small>Proveedor</small>
                <strong>{purchase.supplierName}</strong>
              </div>
              <div>
                <small>Fecha</small>
                <strong>
                  {new Date(`${purchase.businessDate}T12:00:00`).toLocaleDateString('es-AR')}
                </strong>
              </div>
              <div>
                <small>Estado</small>
                <strong>{purchase.status === 'RECEIVED' ? 'Recibida' : 'Anulada'}</strong>
              </div>
              <div>
                <small>Total</small>
                <strong>{formatMoney(purchase.totalCents)}</strong>
              </div>
              {payable && (
                <div>
                  <small>Cuenta</small>
                  <strong>
                    {payable.status === 'OPEN'
                      ? `Pendiente ${formatMoney(payable.balanceCents)}`
                      : payable.status === 'PAID'
                        ? 'Pagada'
                        : 'Anulada'}
                  </strong>
                </div>
              )}
            </div>
            <div className="purchase-detail-lines">
              {purchase.items.map((item) => (
                <div key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.sku}</small>
                  </span>
                  <span>
                    {quantityInput(item.quantityBase, item.unit)} {item.unit === 'KG' ? 'kg' : 'u.'}
                  </span>
                  <span>{formatMoney(item.unitCostCents)}</span>
                  <strong>{formatMoney(item.subtotalCents)}</strong>
                </div>
              ))}
            </div>
            {purchase.status === 'VOIDED' &&
              purchase.events.find((event) => event.kind === 'VOIDED') && (
                <div className="purchase-void-audit">
                  <small>Anulada por</small>
                  <strong>
                    {purchase.events.find((event) => event.kind === 'VOIDED')?.actorName}
                  </strong>
                  <span>{purchase.events.find((event) => event.kind === 'VOIDED')?.reason}</span>
                  <time>
                    {new Date(
                      purchase.events.find((event) => event.kind === 'VOIDED')!.createdAt,
                    ).toLocaleString('es-AR')}
                  </time>
                </div>
              )}
            {purchase.status === 'RECEIVED' && (
              <div className="purchase-void-box">
                {preview.data?.reversible ? (
                  <>
                    <label className="field">
                      <span>Motivo de anulación</span>
                      <input value={reason} onChange={(event) => setReason(event.target.value)} />
                    </label>
                    <button
                      className="button danger"
                      disabled={reason.trim().length < 3 || confirming}
                      onClick={() => void voidPurchase()}
                    >
                      Anular compra
                    </button>
                  </>
                ) : preview.data ? (
                  <div className="alert info">
                    Esta compra necesita una corrección manual de stock.
                  </div>
                ) : null}
              </div>
            )}
            {error && <div className="alert error">{error}</div>}
          </>
        )}
      </div>
    </Dialog>
  );
}
