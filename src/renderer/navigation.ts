export const navigation = [
  { title: 'Inicio', icon: 'chart', group: 'Trabajo diario', areas: [['Inicio', 'Inicio']] },
  { title: 'Caja', icon: 'cash', group: 'Trabajo diario', areas: [['Caja', 'Caja']] },
  {
    title: 'Ventas',
    icon: 'history',
    group: 'Trabajo diario',
    areas: [
      ['Histórico', 'Historial'],
      ['Comprobantes', 'Comprobantes'],
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
      ['Reposición', 'Reponer'],
      ['Controles', 'Conteos'],
      ['Controles', 'Vencimientos'],
    ],
  },
  {
    title: 'Compras',
    icon: 'stock',
    group: 'Mercadería',
    areas: [
      ['Compras', 'Recibir'],
      ['Compras', 'Historial'],
      ['Reposición', 'Pedidos'],
      ['Proveedores', 'Proveedores'],
    ],
  },
  {
    title: 'Ubicaciones',
    icon: 'arrow',
    group: 'Mercadería',
    areas: [['Ubicaciones', 'Ubicaciones']],
  },
  { title: 'Clientes', icon: 'users', group: 'Negocio', areas: [['Clientes', 'Clientes']] },
  {
    title: 'Cobros y pagos',
    icon: 'clock',
    group: 'Negocio',
    areas: [['Agenda', 'Cobros y pagos']],
  },
  { title: 'Promociones', icon: 'tag', group: 'Negocio', areas: [['Promociones', 'Promociones']] },
  {
    title: 'Turnos',
    icon: 'clock',
    group: 'Negocio',
    areas: [
      ['Turnos', 'Historial'],
      ['Controles', 'Diferencias de caja'],
    ],
  },
  {
    title: 'Resultados',
    icon: 'chart',
    group: 'Negocio',
    areas: [
      ['Resumen mensual', 'Mensual'],
      ['Resumen semanal', 'Semanal'],
    ],
  },
  {
    title: 'Administración',
    icon: 'settings',
    group: 'Administración',
    areas: [
      ['Configuración', 'Configuración'],
      ['Usuarios', 'Usuarios'],
      ['Actividad', 'Actividad'],
      ['Backups', 'Copias'],
    ],
  },
] as const;

export function authorizedNavigation(allowed: ReadonlySet<string>) {
  return navigation
    .map((entry) => ({ ...entry, areas: entry.areas.filter(([target]) => allowed.has(target)) }))
    .filter((entry) => entry.areas.length > 0);
}
