import { PageHeading } from '../../components/PageHeader';
import { PerlaLoading } from '../../components/PerlaLoading';
import { useQuery } from '@tanstack/react-query';
import type { ControlHome as HomeData, ControlPending } from '../../../shared/control';
import { useState } from 'react';
import { controlValue } from './client';
import { errorMessage } from '../../api';
import { Icon } from '../../components/Icon';
import { formatMoney } from '../../../domain/values';
import { homePriorities } from './home-priorities';

type OpenHome = (area: string, action: string, id?: string, locationId?: string) => void;
function PendingGroup({ group, onOpen }: { group: ControlPending; onOpen: OpenHome }) {
  return (
    <details className="home-pending">
      <summary>
        <span className="home-pending-count">{group.total.toLocaleString('es-AR')}</span>
        <span className="home-pending-copy">
          <strong>{group.title}</strong>
          <small>{pendingContext(group)}</small>
        </span>
        <Icon name="arrow" size={18} />
      </summary>
      <div className="home-pending-body">
        {group.sample.slice(0, 3).map((item) => (
          <button
            className="control-pending-item"
            key={item.id + (item.locationId ?? '')}
            onClick={() => onOpen(group.area, group.action, item.id, item.locationId)}
          >
            <span>
              <strong>{item.name}</strong>
              <small>
                {/^\d{4}-\d{2}-\d{2}$/.test(item.detail)
                  ? 'Vence ' + dateLabel(item.detail)
                  : item.detail}
              </small>
            </span>
            <Icon name="arrow" size={16} />
          </button>
        ))}
        {!group.sample.length && <p>Abrí el listado para revisar el detalle.</p>}
        <button className="button secondary small" onClick={() => onOpen(group.area, group.action)}>
          Ver todos <Icon name="arrow" size={16} />
        </button>
      </div>
    </details>
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(
    new Date(value + 'T12:00:00'),
  );
}
function pendingContext(group: ControlPending) {
  if (group.action === 'expiries')
    return 'Lotes con stock que vencieron o vencen en los próximos 7 días';
  if (group.action === 'cashDifferences') return 'Cierres con diferencias que todavía no revisaste';
  if (group.area === 'replenishment')
    return 'Necesidades por producto y ubicación, según el stock mínimo';
  if (group.area === 'commercial') return 'Productos con precios o costos pendientes de revisión';
  return 'Obligaciones abiertas de clientes y proveedores';
}
export function ControlHome({
  onOpen,
  stockEnabled,
  owner,
}: {
  onOpen: (area: string, action: string, id?: string, locationId?: string) => void;
  stockEnabled: boolean;
  owner: boolean;
}) {
  const home = useQuery({
    queryKey: ['control-home'],
    queryFn: () => controlValue<HomeData>('workspace', 'home'),
    retry: false,
    refetchInterval: 60000,
  });
  const data = home.data;
  const overview = data?.overview;
  const { priority, planned } = homePriorities(data?.groups ?? []);
  const first = priority[0];
  const orderCount = data?.preparedOrders?.total ?? 0;
  const openRegisters = data?.registers.filter((register) => register.openedAt).length ?? 0;
  return (
    <div className="home-workspace">
      <PageHeading className="page-heading home-heading">
        <div>
          <span className="home-kicker">La libreta del negocio</span>
          <h1>Inicio</h1>
          <p>Qué atender ahora, cómo viene el día y qué podés dejar planificado.</p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary"
            onClick={() => void home.refetch()}
            disabled={home.isFetching}
          >
            {home.isFetching ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button className="button primary" onClick={() => onOpen('module', 'Caja')}>
            <Icon name="cash" size={18} />
            Vender
          </button>
        </div>
      </PageHeading>
      {home.isPending && <PerlaLoading label="Preparando el resumen de tu negocio…" />}
      {home.isError && (
        <div className="alert error" role="alert">
          {errorMessage(home.error)}{' '}
          <button className="button secondary" onClick={() => void home.refetch()}>
            Reintentar
          </button>
        </div>
      )}
      {data && (
        <section className="home-next-step" aria-label="Próxima acción">
          <div>
            <span className="home-kicker">
              {first
                ? 'Primero lo importante'
                : orderCount
                  ? 'El mostrador sigue'
                  : 'Tu próximo paso'}
            </span>
            <h2>
              {first?.title ??
                (orderCount
                  ? `${orderCount} ${orderCount === 1 ? 'orden lista' : 'órdenes listas'} para cobrar`
                  : openRegisters
                    ? 'Todo listo para seguir atendiendo'
                    : 'Prepará la caja para empezar')}
            </h2>
            <p>
              {first
                ? pendingContext(first)
                : orderCount
                  ? 'Pedidos preparados que todavía no registran un pago.'
                  : openRegisters
                    ? `${openRegisters} ${openRegisters === 1 ? 'caja abierta' : 'cajas abiertas'}. Los controles de rutina quedan más abajo.`
                    : 'Elegí tu terminal, abrí el turno y empezá a registrar ventas.'}
            </p>
          </div>
          <button
            className="button primary"
            onClick={() =>
              first
                ? onOpen(first.area, first.action)
                : onOpen('module', orderCount ? 'Órdenes' : 'Caja')
            }
          >
            {first ? 'Revisar ahora' : orderCount ? 'Abrir órdenes' : 'Atender en caja'}{' '}
            <Icon name="arrow" size={16} />
          </button>
        </section>
      )}
      {overview && (
        <section className="home-day" aria-label="Ventas de hoy y de la semana">
          <div className="home-day-main">
            <div className="home-day-label">
              <span>Vendido hoy</span>
              <time dateTime={overview.businessDate}>{dateLabel(overview.businessDate)}</time>
            </div>
            <strong className="home-day-amount">{formatMoney(overview.today.netCents)}</strong>
            <dl className="home-day-details">
              <div>
                <dt>Ventas completadas</dt>
                <dd>{overview.today.saleCount.toLocaleString('es-AR')}</dd>
              </div>
              <div>
                <dt>Ticket promedio</dt>
                <dd>{overview.today.saleCount ? formatMoney(overview.today.averageCents) : '—'}</dd>
              </div>
            </dl>
            <p>Importe neto: ventas menos devoluciones.</p>
            {overview.today.saleCount === 0 && (
              <p className="home-day-context">
                {overview.today.netCents !== 0
                  ? 'Hoy no se completaron ventas. El neto refleja devoluciones registradas hoy.'
                  : overview.lastSaleDate
                    ? 'Todavía no hubo ventas hoy. Los números se actualizan cuando registres un cobro.'
                    : 'Todavía no hay ventas registradas. Abrí Caja para registrar tu primera venta.'}
              </p>
            )}
          </div>
          <div className="home-week">
            <h2>Esta semana</h2>
            <span>
              {dateLabel(overview.weekFrom)} al {dateLabel(overview.businessDate)}
            </span>
            <strong>{formatMoney(overview.week.netCents)}</strong>
            <p>{overview.week.saleCount.toLocaleString('es-AR')} ventas completadas</p>
            {overview.lastSaleDate && (
              <small>Última venta registrada: {dateLabel(overview.lastSaleDate)}</small>
            )}
            {!overview.lastSaleDate && (
              <small>Tus ventas aparecerán acá cuando empieces a vender.</small>
            )}
            <button className="text-button" onClick={() => onOpen('module', 'Resumen mensual')}>
              Ver resultados <Icon name="arrow" size={16} />
            </button>
          </div>
        </section>
      )}
      {data && (
        <div className="home-columns">
          <section className="panel home-attention" aria-label="Pendientes del negocio">
            <div className="home-section-heading">
              <h2>Prioridades de la jornada</h2>
              <span>
                {priority.length
                  ? `${priority.length} ${priority.length === 1 ? 'área' : 'áreas'}`
                  : 'Al día'}
              </span>
            </div>
            {priority.length > 1 && (
              <p className="home-attention-context">
                Vencimientos y diferencias de caja primero. Abrí cada área para revisar sus
                registros.
              </p>
            )}
            {!priority.length && (
              <div className="home-clear">
                <Icon name="check" size={24} />
                <strong>Sin alertas prioritarias</strong>
                <p>
                  No hay avisos prioritarios en los controles activos. Las tareas de catálogo y
                  reposición siguen en la planificación.
                </p>
              </div>
            )}
            {priority.map((group) => (
              <PendingGroup key={group.key} group={group} onOpen={onOpen} />
            ))}
            {stockEnabled && (
              <div className="home-attention-footer">
                <button
                  className="button secondary"
                  onClick={() => onOpen('operations', 'countSessions')}
                >
                  <Icon name="stock" size={17} />
                  Hacer conteo
                </button>
              </div>
            )}
            {planned.length > 0 && (
              <details className="home-planning">
                <summary>
                  <span>
                    <strong>Planificar el resto</strong>
                    <small>
                      Reposición, cuentas y precios · {planned.length}{' '}
                      {planned.length === 1 ? 'área' : 'áreas'}
                    </small>
                  </span>
                  <Icon name="arrow" size={16} />
                </summary>
                <p>Son revisiones de rutina, no tareas que debas resolver todas hoy.</p>
                {planned.map((group) => (
                  <PendingGroup key={group.key} group={group} onOpen={onOpen} />
                ))}
              </details>
            )}
          </section>
          <div className="home-side">
            {(data.preparedOrders?.enabled || orderCount > 0) && (
              <section className="panel home-orders" aria-label="Órdenes para cobrar">
                <div className="home-section-heading">
                  <h2>Del pedido al cobro</h2>
                  <span>{orderCount} pendientes</span>
                </div>
                <p>
                  {orderCount
                    ? 'Recuperá los pedidos preparados desde Caja para registrar el pago.'
                    : 'No hay órdenes esperando un pago. Podés preparar el próximo pedido sin ocupar la caja.'}
                </p>
                <button className="text-button" onClick={() => onOpen('module', 'Órdenes')}>
                  Ver órdenes para caja <Icon name="arrow" size={16} />
                </button>
              </section>
            )}
            <section className="panel home-registers" aria-label="Estado de las cajas">
              <div className="home-section-heading">
                <h2>Tus cajas</h2>
                <span>
                  {openRegisters} {openRegisters === 1 ? 'abierta' : 'abiertas'}
                </span>
              </div>
              {data.registers.slice(0, 4).map((register) => (
                <div className="home-register" key={register.id}>
                  <span>
                    <strong>{register.name}</strong>
                    <small>{register.operator ?? 'Sin turno abierto'}</small>
                  </span>
                  <span className={register.openedAt ? 'pill good' : 'pill'}>
                    {register.openedAt ? 'Abierta' : 'Cerrada'}
                  </span>
                </div>
              ))}
              {!data.registers.length && (
                <p>No hay cajas activas. Revisá las terminales en Configuración.</p>
              )}
              {data.registers.length > 4 && (
                <small>Mostrando 4 de {data.registers.length} cajas activas.</small>
              )}
              <button className="text-button" onClick={() => onOpen('module', 'Caja')}>
                Ir a Caja <Icon name="arrow" size={16} />
              </button>
            </section>
            {owner && data.accounts && (
              <section className="panel home-accounts" aria-label="Saldos pendientes">
                <h2>Cobros y pagos</h2>
                <dl>
                  <div>
                    <dt>Te deben clientes</dt>
                    <dd>{formatMoney(data.accounts.receivableCents)}</dd>
                  </div>
                  <div>
                    <dt>Debés a proveedores</dt>
                    <dd>{formatMoney(data.accounts.payableCents)}</dd>
                  </div>
                </dl>
                {(data.accounts.overdueReceivableCents > 0 ||
                  data.accounts.overduePayableCents > 0) && (
                  <p className="home-overdue">
                    Con vencimiento pasado:{' '}
                    {[
                      data.accounts.overdueReceivableCents > 0
                        ? `${formatMoney(data.accounts.overdueReceivableCents)} por cobrar`
                        : null,
                      data.accounts.overduePayableCents > 0
                        ? `${formatMoney(data.accounts.overduePayableCents)} por pagar`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' y ')}
                    .
                  </p>
                )}
                <small>Saldos abiertos actuales; no son ventas de hoy.</small>
                <button className="text-button" onClick={() => onOpen('operations', 'agenda')}>
                  Revisar cuentas <Icon name="arrow" size={16} />
                </button>
              </section>
            )}
          </div>
        </div>
      )}
      {data && (
        <p className="home-updated">
          Actualizado{' '}
          {new Date(data.generatedAt).toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · Se actualiza cada minuto
        </p>
      )}
    </div>
  );
}

export function WorkspacePreference({ owner }: { owner: boolean }) {
  const [start, setStart] = useState('Inicio');
  const [saved, setSaved] = useState(false);
  const [preferenceError, setPreferenceError] = useState('');
  return (
    <details className="panel">
      <summary>Página al ingresar</summary>
      <div className="movement-filters">
        <label className="field">
          Abrir
          <select
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              setSaved(false);
            }}
          >
            {[
              'Inicio',
              'Caja',
              'Productos',
              'Stock',
              'Compras',
              ...(owner ? ['Resumen mensual'] : []),
            ].map((page) => (
              <option key={page} value={page}>
                {page === 'Resumen mensual' ? 'Resultados' : page}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          onClick={() => {
            void controlValue('workspace', 'savePreference', { start })
              .then(() => setSaved(true))
              .catch((e) => setPreferenceError(errorMessage(e)));
          }}
        >
          Guardar preferencia
        </button>
        {saved && <span role="status">Guardado</span>}
        {preferenceError && <div role="alert">{preferenceError}</div>}
      </div>
    </details>
  );
}
