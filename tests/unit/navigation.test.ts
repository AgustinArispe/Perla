import { expect, it } from 'vitest';
import { authorizedNavigation } from '../../src/renderer/navigation';
it('administración conserva actividad cuando es su única área autorizada', () => {
  const entries = authorizedNavigation(new Set(['Caja', 'Actividad']));
  expect(entries.map((entry) => entry.title)).toEqual(['Caja', 'Administración']);
  expect(entries.find((entry) => entry.title === 'Administración')?.areas).toEqual([
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
