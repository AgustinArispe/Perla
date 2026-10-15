import { PerlaLoading } from '../../components/PerlaLoading';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage, unwrap } from '../../api';
import { Icon } from '../../components/Icon';
import type { BusinessNotification } from '../../../shared/notifications';

const relative = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });
function timeLabel(value: string) {
  const minutes = Math.round((new Date(value).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  return new Date(value).toLocaleDateString('es-AR');
}

export function NotificationBell({
  onNavigate,
}: {
  onNavigate: (destination: BusinessNotification['destination']) => void | Promise<void>;
}) {
  const client = useQueryClient();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [selectionError, setSelectionError] = useState('');
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => unwrap(await api().notifications.list()),
    retry: false,
    refetchInterval: 30000,
  });
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector<HTMLButtonElement>('.notification-trigger')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  async function select(item: BusinessNotification) {
    try {
      setSelectionError('');
      if (!item.read) {
        unwrap(await api().notifications.markRead({ key: item.key, signature: item.signature }));
        await client.invalidateQueries({ queryKey: ['notifications'] });
      }
      await onNavigate(item.destination);
      setOpen(false);
    } catch (failure) {
      setSelectionError(errorMessage(failure));
    }
  }
  const kinds: Record<BusinessNotification['kind'], string> = {
    LOW_STOCK: 'Stock para reponer',
    EXPIRING_LOTS: 'Vencimientos',
    CASH_DIFFERENCE: 'Diferencias de caja',
    SALES_DROP: 'Evolución de ventas',
  };
  return (
    <div className="notification-root" ref={root}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={`Notificaciones${query.data?.unreadCount ? `, ${query.data.unreadCount} sin leer` : ''}`}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) void query.refetch();
        }}
      >
        <Icon name="bell" size={19} />
        {Boolean(query.data?.unreadCount) && <b>{Math.min(query.data!.unreadCount, 99)}</b>}
      </button>
      {open && (
        <section className="notification-popover" aria-label="Centro de avisos">
          <div className="notification-heading">
            <div>
              <span className="eyebrow">CENTRO DE AVISOS</span>
              <h2>Notificaciones</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Cerrar notificaciones"
              onClick={() => setOpen(false)}
            >
              <Icon name="close" size={18} />
            </button>
          </div>
          {query.isPending && <PerlaLoading size="inline" label="Buscando avisos…" />}
          {query.isError && <p className="notification-error">{errorMessage(query.error)}</p>}
          {query.data?.items.length === 0 && (
            <div className="notification-empty">
              <Icon name="check" size={22} />
              <strong>Sin avisos activos</strong>
            </div>
          )}
          <p>Sin leer indica lectura pendiente. Leer un aviso no resuelve su causa.</p>
          {selectionError && <p role="alert">{selectionError}</p>}
          <div className="notification-list">
            {(Object.keys(kinds) as BusinessNotification['kind'][]).map((kind) => {
              const items = query.data?.items.filter((item) => item.kind === kind) ?? [];
              if (!items.length) return null;
              return (
                <section key={kind} aria-label={kinds[kind]}>
                  <h3>{kinds[kind]}</h3>
                  <small>
                    {items.length} {items.length === 1 ? 'aviso activo' : 'avisos activos'} ·{' '}
                    {items.filter((item) => !item.read).length} sin leer
                  </small>
                  {items.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={`notification-item ${item.severity.toLowerCase()}${item.read ? ' read' : ''}`}
                      onClick={() => void select(item)}
                    >
                      <i aria-hidden="true" />
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                        <em>
                          {timeLabel(item.occurredAt)} · {item.read ? 'Leído' : 'Sin leer'} · Abrir
                          registros del grupo
                        </em>
                      </span>
                      <Icon name="arrow" size={16} />
                    </button>
                  ))}
                </section>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
