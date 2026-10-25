export const navigationGroups = [
  'Ventas y caja',
  'Mercadería',
  'Gestión',
  'Administración',
] as const;

export const navigation = [
  { title: 'Inicio', icon: 'chart', group: 'Accesos', areas: [['Inicio', 'Inicio']] },
  { title: 'Caja', icon: 'cash', group: 'Ventas y caja', areas: [['Caja', 'Caja']] },
  {
    title: 'Órdenes para caja',
    icon: 'stock',
    group: 'Ventas y caja',
    areas: [['Órdenes', 'Órdenes para caja']],
  },
  {
    title: 'Ventas',
    icon: 'history',
    group: 'Ventas y caja',
    areas: [
      ['Histórico', 'Historial'],
      ['Comprobantes', 'Comprobantes'],
    ],
  },
  { title: 'Remitos', icon: 'arrow', group: 'Ventas y caja', areas: [['Remitos', 'Remitos']] },
  {
    title: 'Turnos',
    icon: 'clock',
    group: 'Ventas y caja',
    areas: [
      ['Turnos', 'Historial'],
      ['Controles', 'Diferencias de caja'],
    ],
  },
  {
    title: 'Productos',
    icon: 'box',
    group: 'Mercadería',
    areas: [
      ['Productos', 'Catálogo'],
      ['Revisión', 'Revisión'],
    ],
  },
  {
    title: 'Stock',
    icon: 'stock',
    group: 'Mercadería',
    areas: [
      ['Stock', 'Existencias'],
      ['Controles', 'Conteos'],
      ['Controles', 'Vencimientos'],
    ],
  },
  {
    title: 'Reposición',
    icon: 'stock',
    group: 'Mercadería',
    areas: [
      ['Reposición', 'Sugerencias'],
      ['Reposición', 'Pedidos'],
    ],
  },
  {
    title: 'Compras',
    icon: 'stock',
    group: 'Mercadería',
    areas: [
      ['Compras', 'Recibir'],
      ['Compras', 'Historial'],
      ['Proveedores', 'Proveedores'],
    ],
  },
  {
    title: 'Ubicaciones',
    icon: 'arrow',
    group: 'Mercadería',
    areas: [['Ubicaciones', 'Ubicaciones']],
  },
  { title: 'Clientes', icon: 'users', group: 'Gestión', areas: [['Clientes', 'Clientes']] },
  {
    title: 'Cobros y pagos',
    icon: 'clock',
    group: 'Gestión',
    areas: [['Agenda', 'Cobros y pagos']],
  },
  { title: 'Promociones', icon: 'tag', group: 'Gestión', areas: [['Promociones', 'Promociones']] },
  {
    title: 'Resultados',
    icon: 'chart',
    group: 'Gestión',
    areas: [
      ['Resumen mensual', 'Mensual'],
      ['Resumen semanal', 'Semanal'],
    ],
  },
  {
    title: 'Configuración',
    icon: 'settings',
    group: 'Administración',
    areas: [['Configuración', 'Configuración']],
  },
  { title: 'Usuarios', icon: 'users', group: 'Administración', areas: [['Usuarios', 'Usuarios']] },
  {
    title: 'Actividad',
    icon: 'activity',
    group: 'Administración',
    areas: [['Actividad', 'Actividad']],
  },
  {
    title: 'Copias de seguridad',
    icon: 'upload',
    group: 'Administración',
    areas: [['Backups', 'Copias de seguridad']],
  },
] as const;

export function authorizedNavigation(allowed: ReadonlySet<string>) {
  return navigation
    .map((entry) => ({ ...entry, areas: entry.areas.filter(([target]) => allowed.has(target)) }))
    .filter((entry) => entry.areas.length > 0);
}
