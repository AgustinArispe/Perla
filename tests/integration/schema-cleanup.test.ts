import Database from 'better-sqlite3';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { migrate, MIGRATIONS } from '../../src/worker/db/migrations';
import { openDatabase } from '../../src/worker/db/connection';
import { AuthService } from '../../src/worker/auth/service';
import { WorkspaceControlService } from '../../src/worker/control/workspace';

const legacyMigrations = MIGRATIONS.filter((migration) => migration.version <= 30);
const profileSql = `INSERT INTO printer_profiles VALUES
  ('legacy-printer',NULL,'Caja principal','THERMAL_80','MANUAL','Perla','¡Gracias!',1,3,'2026-10-01','2026-10-02')`;

test('migra v30 con respaldo y conserva preferencias, usuarios, sesiones y perfiles históricos', () => {
  const directory = mkdtempSync(join(tmpdir(), 'perla-schema-cleanup-'));
  const path = join(directory, 'pos.sqlite');
  const authDb = openDatabase(':memory:');
  let db = new Database(path);
  try {
    db.pragma('foreign_keys=ON');
    migrate(db, legacyMigrations);
    // Build authentic hashes and sessions with the current auth schema, then seed v30.
    const auth = new AuthService(authDb);
    const owner = auth.bootstrap({
      name: 'Jefe',
      username: 'jefe',
      password: 'Prueba-Control-2026!',
    });
    const supervisor = auth.saveUser(owner.sessionToken, {
      name: 'Supervisor',
      username: 'super',
      password: 'Prueba-Control-2026!',
      role: 'SUPERVISOR',
      active: true,
    });
    const insertUser = db.prepare(
      `INSERT INTO users(id,username,name,role,active,password_hash,revision,created_at_utc,updated_at_utc,system_admin)
       VALUES (@id,@username,@name,@role,@active,@password_hash,@revision,@created_at_utc,@updated_at_utc,@system_admin)`,
    );
    for (const user of authDb.prepare('SELECT * FROM users').all()) insertUser.run(user);
    const insertSession = db.prepare(
      `INSERT INTO auth_sessions(token_hash,user_id,user_revision,expires_at_ms,last_seen_ms)
       VALUES (@token_hash,@user_id,@user_revision,@expires_at_ms,@last_seen_ms)`,
    );
    for (const session of authDb.prepare('SELECT * FROM auth_sessions').all())
      insertSession.run(session);
    db.prepare('INSERT INTO workspace_preferences VALUES (?,?)').run(owner.user.id, 'Stock');
    db.exec(profileSql);
    const originalProfile = db.prepare('SELECT * FROM printer_profiles').get();
    const users = db.prepare('SELECT * FROM users ORDER BY id').all() as { id: string }[];
    const sessions = db.prepare('SELECT * FROM auth_sessions').all();
    db.close();
    db = openDatabase(path);
    migrate(db);
    expect(db.prepare('SELECT * FROM users ORDER BY id').all()).toEqual(
      users.map((user) => ({
        ...user,
        business_unit_id: null,
        start_module: user.id === owner.user.id ? 'Stock' : null,
      })),
    );
    expect(db.prepare('SELECT * FROM auth_sessions').all()).toEqual(sessions);
    expect(new AuthService(db).requireUser(owner.sessionToken)).toEqual(owner.user);
    const service = new WorkspaceControlService(db);
    expect(service.execute('preference', {}, owner.user)).toEqual({
      start: { start_module: 'Stock' },
    });
    expect(service.execute('preference', {}, supervisor)).toEqual({ start: undefined });
    service.execute('savePreference', { start: 'Productos' }, supervisor);
    expect(service.execute('preference', {}, supervisor)).toEqual({
      start: { start_module: 'Productos' },
    });
    expect(service.execute('preference', {}, owner.user)).toEqual({
      start: { start_module: 'Stock' },
    });
    expect(() =>
      service.execute('savePreference', { start: 'Resumen mensual' }, supervisor),
    ).toThrow();
    const archived = db
      .prepare(
        "SELECT value_json FROM app_settings WHERE key='legacy.printer_profiles.legacy-printer'",
      )
      .get() as { value_json: string };
    expect(JSON.parse(archived.value_json)).toEqual(originalProfile);
    expect(
      db
        .prepare(
          "SELECT COUNT(*) n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        )
        .get(),
    ).toEqual({ n: 63 });
    expect(db.pragma('integrity_check', { simple: true })).toBe('ok');
    expect(db.pragma('foreign_key_check')).toEqual([]);
    const backups = readdirSync(join(directory, 'migration-backups'));
    expect(backups).toHaveLength(1);
    const backup = new Database(join(directory, 'migration-backups', backups[0]!), {
      readonly: true,
    });
    try {
      expect(backup.prepare('SELECT * FROM printer_profiles').get()).toEqual(originalProfile);
      expect(backup.prepare('SELECT start_module FROM workspace_preferences').get()).toEqual({
        start_module: 'Stock',
      });
      expect(backup.pragma('integrity_check', { simple: true })).toBe('ok');
    } finally {
      backup.close();
    }
  } finally {
    authDb.close();
    if (db.open) db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('un conflicto al archivar revierte toda la limpieza sin perder las tablas originales', () => {
  const db = new Database(':memory:');
  try {
    migrate(db, legacyMigrations);
    db.exec(profileSql);
    db.prepare('INSERT INTO app_settings(key,value_json) VALUES (?,?)').run(
      'legacy.printer_profiles.legacy-printer',
      'valor anterior',
    );
    expect(() => migrate(db)).toThrow();
    expect(db.prepare('SELECT COUNT(*) n FROM printer_profiles').get()).toEqual({ n: 1 });
    expect(db.prepare('SELECT COUNT(*) n FROM workspace_preferences').get()).toEqual({ n: 0 });
    expect(db.prepare('SELECT MAX(version) version FROM schema_migrations').get()).toEqual({
      version: 30,
    });
    expect(
      (db.pragma('table_info(users)') as { name: string }[]).some(
        (column) => column.name === 'start_module',
      ),
    ).toBe(false);
    expect(db.prepare('SELECT value_json FROM app_settings').get()).toEqual({
      value_json: 'valor anterior',
    });
  } finally {
    db.close();
  }
});
