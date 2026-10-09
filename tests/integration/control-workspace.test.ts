import { expect, test } from 'vitest';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { WorkspaceControlService } from '../../src/worker/control/workspace';

test('vistas privadas validan filtros, revisión y dueño; supervisor no recibe datos financieros', () => {
  const db = openDatabase(':memory:');
  try {
    const auth = new AuthService(db);
    const grant = auth.bootstrap({
      name: 'Jefe',
      username: 'jefe',
      password: 'Prueba-Control-2026!',
    });
    const owner = grant.user;
    const supervisor = auth.saveUser(grant.sessionToken, {
      name: 'Supervisor',
      username: 'super',
      password: 'Prueba-Control-2026!',
      role: 'SUPERVISOR',
      active: true,
    });
    const service = new WorkspaceControlService(db);
    const view = service.execute(
      'saveView',
      { name: 'Activos', module: 'products', filters: { statuses: ['ACTIVE'] } },
      owner,
    ) as { id: string; revision: number };
    expect(service.execute('views', { module: 'products' }, owner) as unknown[]).toHaveLength(1);
    expect(service.execute('views', { module: 'products' }, supervisor) as unknown[]).toHaveLength(
      0,
    );
    expect(() =>
      service.execute(
        'saveView',
        {
          id: view.id,
          expectedRevision: view.revision,
          name: 'Robada',
          module: 'products',
          filters: {},
        },
        supervisor,
      ),
    ).toThrow();
    expect(() =>
      service.execute('saveView', { name: 'Secretos', module: 'users', filters: {} }, supervisor),
    ).toThrow();
    expect(() =>
      service.execute(
        'saveView',
        { name: 'Filtro inválido', module: 'products', filters: { password: 'x' } },
        owner,
      ),
    ).toThrow();
    expect(() =>
      service.execute(
        'saveView',
        { id: view.id, expectedRevision: 99, name: 'Vieja', module: 'products', filters: {} },
        owner,
      ),
    ).toThrow();
    const home = service.execute('home', {}, supervisor) as { groups: { key: string }[] };
    expect(home.groups.some((g) => ['accounts', 'cash', 'prices'].includes(g.key))).toBe(false);
    service.execute('deleteView', { id: view.id, expectedRevision: view.revision }, owner);
    expect(service.execute('views', { module: 'products' }, owner)).toEqual([]);
  } finally {
    db.close();
  }
});
