import { expect, it } from 'vitest';
import { authorizedNavigation, navigation, navigationGroups } from '../../src/renderer/navigation';
it('administración conserva actividad cuando es su única área autorizada', () => {
  const entries = authorizedNavigation(new Set(['Caja', 'Actividad']));
  expect(entries.map((entry) => entry.title)).toEqual(['Caja', 'Actividad']);
  expect(entries.find((entry) => entry.title === 'Actividad')?.areas).toEqual([
    ['Actividad', 'Actividad'],
  ]);
});
it('resultados requiere autorización propia y vendedor conserva caja', () => {
  expect(authorizedNavigation(new Set(['Caja', 'Ayuda'])).map((entry) => entry.title)).toEqual([
    'Caja',
  ]);
  expect(
    authorizedNavigation(new Set(['Inicio', 'Caja', 'Stock', 'Actividad'])).some(
      (entry) => entry.title === 'Resultados',
    ),
  ).toBe(false);
});
it('cada destino histórico mantiene un acceso en los contenedores', () => {
  const targets = [
    'Inicio',
    'Caja',
    'Histórico',
    'Comprobantes',
    'Órdenes',
    'Remitos',
    'Productos',
    'Revisión',
    'Stock',
    'Reposición',
    'Controles',
    'Compras',
    'Proveedores',
    'Ubicaciones',
    'Clientes',
    'Agenda',
    'Promociones',
    'Turnos',
    'Resumen mensual',
    'Resumen semanal',
    'Configuración',
    'Usuarios',
    'Actividad',
    'Backups',
  ];
  const actual = new Set(
    authorizedNavigation(new Set(targets)).flatMap((entry) =>
      entry.areas.map(([target]) => target),
    ),
  );
  expect([...actual].sort()).toEqual(targets.sort());
});
it('separa preparación, remitos y administración sin duplicar subcategorías', () => {
  expect(navigationGroups).toEqual(['Ventas y caja', 'Mercadería', 'Gestión', 'Administración']);
  const pairs = navigation.flatMap((entry) =>
    entry.areas.map(([target, label]) => `${target}:${label}`),
  );
  expect(new Set(pairs).size).toBe(pairs.length);
  expect(navigation.find((entry) => entry.title === 'Inicio')?.group).toBe('Accesos');
  expect(navigation.find((entry) => entry.title === 'Órdenes para caja')?.areas).toEqual([
    ['Órdenes', 'Órdenes para caja'],
  ]);
  expect(navigation.find((entry) => entry.title === 'Remitos')?.areas).toEqual([
    ['Remitos', 'Remitos'],
  ]);
  expect(navigation.find((entry) => entry.title === 'Reposición')?.areas).toEqual([
    ['Reposición', 'Sugerencias'],
    ['Reposición', 'Pedidos'],
  ]);
  expect(
    navigation.find((entry) => entry.title === 'Compras')?.areas.map(([target]) => target),
  ).not.toContain('Reposición');
});
it('las funciones apagadas no dejan contenedores vacíos', () => {
  const entries = authorizedNavigation(new Set(['Caja', 'Órdenes']));
  expect(entries.map((entry) => entry.title)).toEqual(['Caja', 'Órdenes para caja']);
  expect(entries.some((entry) => entry.areas.length === 0)).toBe(false);
  expect(entries.every((entry) => entry.group === 'Ventas y caja')).toBe(true);
});
