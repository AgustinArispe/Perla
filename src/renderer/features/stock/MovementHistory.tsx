import { PerlaLoading } from '../../components/PerlaLoading';
import {ExportButton} from '../../components/ExportButton';
import { useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import type { StockBalance, StockMovement } from '../../../shared/stock';
import { formatStock } from '../../../domain/inventory';
import { api, errorMessage, unwrap } from '../../api';
import { Dialog } from '../../components/Dialog';

const labels: Record<StockMovement['kind'], string> = {
  OPENING: 'Conteo inicial',
  RECEIPT: 'Ingreso',
  WASTE: 'Merma',
  ADJUSTMENT: 'Conteo / ajuste',
  SALE: 'Venta',
  VOID: 'Anulación',
};
const date = new Intl.DateTimeFormat('es-AR', {
  timeZone: 'America/Argentina/Buenos_Aires',
  dateStyle: 'short',
  timeStyle: 'short',
});
export function MovementHistory({
  balance,
  onClose,
}: {
  balance: StockBalance;
  onClose: () => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pages, setPages] = useState<(string | undefined)[]>([undefined]);
  const cursor = pages.at(-1);
  const movements = useQuery({
    queryKey: ['stock', 'movements', balance.productId, from, to, cursor],
    queryFn: async () =>
      unwrap(
        await api().stock.movements({
          productId: balance.productId,
          limit: 20,
          ...(from ? { fromDate: from } : {}),
          ...(to ? { toDate: to } : {}),
          ...(cursor ? { cursor } : {}),
        }),
      ),
    retry: false,
    placeholderData: keepPreviousData,
  });
  return (
    <Dialog title={`Movimientos · ${balance.name}`} onClose={onClose} wide>
      <div className="dialog-body">
        <div className="movement-filters"><ExportButton dataset="movements" filters={{productId:balance.productId,...(from?{fromDate:from}:{}),...(to?{toDate:to}:{})}} />
          <label className="field">
            Desde
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPages([undefined]);
              }}
            />
          </label>
          <label className="field">
            Hasta
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPages([undefined]);
              }}
            />
          </label>
        </div>
        {movements.isError && (
          <div className="alert error" role="alert">
            {errorMessage(movements.error)}
          </div>
        )}
        <div className="preview-table">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Movimiento</th>
                <th>Motivo</th>
                <th className="numeric">Cantidad</th>
                <th className="numeric">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movements.data?.items.map((item) => (
                <tr key={item.id}>
                  <td className="movement-date">{date.format(new Date(item.createdAt))}</td>
                  <td>{labels[item.kind]}</td>
                  <td>{item.reason}</td>
                  <td className={`numeric ${item.deltaBase < 0 ? 'negative-value' : ''}`}>
                    {item.deltaBase > 0 ? '+' : ''}
                    {formatStock(item.deltaBase, balance.unit)}
                  </td>
                  <td className="numeric">{formatStock(item.balanceAfterBase, balance.unit)}</td>
                </tr>
              ))}
              {!movements.isError && !movements.data?.items.length && (
                <tr>
                  <td colSpan={5} className="empty-table">
                    {movements.isPending
                      ? (<PerlaLoading size="compact" label="Cargando movimientos…" />)
                      : 'Sin movimientos en este período.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="subtle-note">
          {movements.data?.total ?? 0} movimientos · Horario de Argentina
        </p>
      </div>
      <div className="dialog-footer">
        <button
          className="button secondary"
          disabled={pages.length === 1 || movements.isFetching}
          onClick={() => setPages(pages.slice(0, -1))}
        >
          Anterior
        </button>
        <button
          className="button secondary"
          disabled={
            !movements.data?.nextCursor || movements.isFetching || movements.isPlaceholderData
          }
          onClick={() => setPages([...pages, movements.data!.nextCursor!])}
        >
          Siguiente
        </button>
        <button className="button primary" onClick={onClose}>
          Cerrar historial
        </button>
      </div>
    </Dialog>
  );
}
