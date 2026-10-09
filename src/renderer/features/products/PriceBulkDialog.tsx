import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Product } from '../../../shared/catalog';
import type { PricePreview } from '../../../shared/pricing';
import { formatMoney, parseArs } from '../../../domain/values';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

export function PriceBulkDialog({ products, onClose, onSaved }: { products: Product[]; onClose: () => void; onSaved: () => void }) {
  const client = useQueryClient();
  const [type, setType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [value, setValue] = useState('10');
  const [preview, setPreview] = useState<PricePreview | null>(null);
  const [error, setError] = useState('');
  const review = useMutation({
    mutationFn: async () => unwrap(await api().pricing.preview({
      productIds: products.map((product) => product.id),
      change: type === 'PERCENT'
        ? { type, basisPoints: Math.round(Number(value.replace(',', '.')) * 100) }
        : { type, priceCents: parseArs(value) },
    })),
    onSuccess: (result) => { setPreview(result); setError(''); },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const confirm = useMutation({
    mutationFn: async () => unwrap(await api().pricing.confirm({ previewToken: preview!.previewToken, operationKey: crypto.randomUUID() })),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['products'] });
      onSaved();
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  const busy = review.isPending || confirm.isPending;
  return (
    <Dialog title="Actualizar precios" onClose={onClose} busy={busy} wide className="price-bulk-dialog">
      <div className="dialog-body">
        {error && <div className="alert error">{error}</div>}
        {!preview ? (
          <>
            <div className="price-bulk-count"><strong>{products.length}</strong><span>{products.length === 1 ? 'producto seleccionado' : 'productos seleccionados'}</span></div>
            <div className="segmented-control" role="group" aria-label="Tipo de cambio">
              <button className={type === 'PERCENT' ? 'active' : ''} onClick={() => setType('PERCENT')}>Porcentaje</button>
              <button className={type === 'FIXED' ? 'active' : ''} onClick={() => setType('FIXED')}>Precio fijo</button>
            </div>
            <label className="field">
              {type === 'PERCENT' ? 'Cambio porcentual' : 'Nuevo precio'}
              <div className="input-affix">
                {type === 'FIXED' && <span>$</span>}
                <input data-dialog-focus inputMode="decimal" value={value} onChange={(event) => setValue(event.target.value)} />
                {type === 'PERCENT' && <span>%</span>}
              </div>
            </label>
            <div className="dialog-actions">
              <button className="button secondary" onClick={onClose}>Cancelar</button>
              <button className="button primary" disabled={busy || !value.trim()} onClick={() => review.mutate()}>Revisar cambios</button>
            </div>
          </>
        ) : (
          <>
            <div className="price-preview-list">
              {preview.items.map((item) => (
                <article key={item.productId}>
                  <strong>{item.name}</strong>
                  <span>{formatMoney(item.beforeCents)}</span>
                  <span aria-hidden="true">→</span>
                  <strong>{formatMoney(item.afterCents)}</strong>
                </article>
              ))}
            </div>
            <div className="dialog-actions">
              <button className="button secondary" disabled={busy} onClick={() => setPreview(null)}>Volver</button>
              <button className="button primary" disabled={busy} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Actualizando…' : 'Confirmar precios'}</button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
