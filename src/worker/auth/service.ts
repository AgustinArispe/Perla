import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type Database from 'better-sqlite3';
import {
  BootstrapSchema,
  LoginSchema,
  UserSaveSchema,
  ChangePasswordSchema,
} from '../../shared/auth';
import type {
  BootstrapInput,
  LoginInput,
  UserSaveInput,
  ChangePasswordInput,
  User,
  AuthStatus,
} from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import { hasPermission } from '../../domain/permissions';
import { hashPassword, verifyPassword } from './password';
import { recordAudit } from './audit';
export interface SessionGrant {
  user: User;
  sessionToken: string;
}
const publicColumns =
  'id,username,name,role,active,revision,created_at_utc AS createdAt,updated_at_utc AS updatedAt';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
export class AuthService {
  private readonly dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(
    private readonly db: Database.Database,
    private readonly options: { idleTimeoutMs?: number; singleSession?: boolean } = {},
  ) {}
  private user(id: string): User {
    const row = this.db.prepare(`SELECT ${publicColumns} FROM users WHERE id=?`).get(id) as
      (Omit<User, 'active'> & { active: number }) | undefined;
    if (!row) throw new DomainError('NOT_FOUND', 'La cuenta no existe.');
    return { ...row, active: Boolean(row.active) };
  }
  status(token: string | null): AuthStatus {
    let user: User | null = null;
    try {
      user = this.requireUser(token);
    } catch (error) {
      if (!(error instanceof DomainError && error.code === 'UNAUTHENTICATED')) throw error;
    }
    return { initialized: Boolean(this.db.prepare('SELECT 1 FROM users LIMIT 1').get()), user };
  }
  requireUser(token: string | null): User {
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new DomainError('UNAUTHENTICATED', 'Iniciá sesión para continuar.');
    const row = this.db
      .prepare(
        'SELECT user_id,user_revision,expires_at_ms,last_seen_ms FROM auth_sessions WHERE token_hash=?',
      )
      .get(digest(token)) as
      | { user_id: string; user_revision: number; expires_at_ms: number; last_seen_ms: number }
      | undefined;
    if (
      !row ||
      row.expires_at_ms <= Date.now() ||
      (this.options.idleTimeoutMs && row.last_seen_ms + this.options.idleTimeoutMs <= Date.now())
    )
      throw new DomainError('UNAUTHENTICATED', 'La sesión venció. Volvé a ingresar.');
    const user = this.user(row.user_id);
    if (!user.active || user.revision !== row.user_revision)
      throw new DomainError('UNAUTHENTICATED', 'La cuenta cambió. Volvé a ingresar.');
    if (this.options.idleTimeoutMs)
      this.db
        .prepare('UPDATE auth_sessions SET last_seen_ms=? WHERE token_hash=?')
        .run(Date.now(), digest(token));
    return user;
  }
  authorize(token: string | null, operation: string): User {
    const user = this.requireUser(token);
    if (!hasPermission(user.role, operation))
      throw new DomainError('FORBIDDEN', 'Tu perfil no tiene permiso para esta operación.');
    return user;
  }
  private grant(user: User): SessionGrant {
    if (this.options.singleSession)
      this.db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(user.id);
    const sessionToken = randomBytes(32).toString('hex');
    this.db.prepare('DELETE FROM auth_sessions WHERE expires_at_ms<=?').run(Date.now());
    this.db
      .prepare(
        'INSERT INTO auth_sessions (token_hash,user_id,user_revision,expires_at_ms,last_seen_ms) VALUES (?,?,?,?,?)',
      )
      .run(
        digest(sessionToken),
        user.id,
        user.revision,
        Date.now() + 8 * 60 * 60 * 1000,
        Date.now(),
      );
    return { user, sessionToken };
  }
  bootstrap(raw: BootstrapInput): SessionGrant {
    const input = BootstrapSchema.parse(raw);
    return this.db
      .transaction(() => {
        if (this.db.prepare('SELECT 1 FROM users LIMIT 1').get())
          throw new DomainError('FORBIDDEN', 'La configuración inicial ya fue realizada.');
        const id = randomUUID(),
          now = new Date().toISOString();
        this.db
          .prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)')
          .run(
            id,
            input.username,
            input.name,
            'OWNER',
            1,
            hashPassword(input.password),
            1,
            now,
            now,
          );
        const user = this.user(id);
        this.db
          .prepare("UPDATE checkout_drafts SET id=?,owner_user_id=? WHERE id='main'")
          .run(id, id);
        recordAudit(this.db, user, 'auth.bootstrap', id);
        return this.grant(user);
      })
      .immediate();
  }
  login(raw: LoginInput): SessionGrant {
    const input = LoginSchema.parse(raw),
      now = Date.now();
    this.db.prepare('DELETE FROM auth_attempts WHERE updated_at_ms<?').run(now - 60000);
    const attempt = this.db
      .prepare('SELECT failures,blocked_until_ms,updated_at_ms FROM auth_attempts WHERE username=?')
      .get(input.username) as
      { failures: number; blocked_until_ms: number; updated_at_ms: number } | undefined;
    if (attempt && attempt.blocked_until_ms > now)
      throw new DomainError(
        'AUTH_THROTTLED',
        'Demasiados intentos. Esperá un minuto antes de volver a ingresar.',
      );
    const attemptCount = (
      this.db.prepare('SELECT COUNT(*) AS n FROM auth_attempts').get() as { n: number }
    ).n;
    if (!attempt && attemptCount >= 1000)
      throw new DomainError(
        'AUTH_THROTTLED',
        'Demasiados intentos. Esperá un minuto antes de volver a ingresar.',
      );
    const row = this.db
      .prepare('SELECT id,password_hash,active FROM users WHERE username=?')
      .get(input.username) as { id: string; password_hash: string; active: number } | undefined;
    const valid = verifyPassword(input.password, row?.password_hash ?? this.dummyHash);
    if (!row || !row.active || !valid) {
      const failures = attempt && now - attempt.updated_at_ms < 60000 ? attempt.failures + 1 : 1;
      this.db
        .prepare(
          'INSERT INTO auth_attempts VALUES (?,?,?,?) ON CONFLICT(username) DO UPDATE SET failures=excluded.failures,blocked_until_ms=excluded.blocked_until_ms,updated_at_ms=excluded.updated_at_ms',
        )
        .run(input.username, failures, failures >= 5 ? now + 60000 : 0, now);
      throw new DomainError('UNAUTHENTICATED', 'Usuario o contraseña incorrectos.');
    }
    return this.db
      .transaction(() => {
        this.db.prepare('DELETE FROM auth_attempts WHERE username=?').run(input.username);
        return this.grant(this.user(row.id));
      })
      .immediate();
  }
  logout(token: string | null): null {
    if (token) this.db.prepare('DELETE FROM auth_sessions WHERE token_hash=?').run(digest(token));
    return null;
  }
  listUsers(token: string | null): User[] {
    this.authorize(token, 'users.list');
    return (this.db.prepare('SELECT id FROM users ORDER BY name,id').all() as { id: string }[]).map(
      (row) => this.user(row.id),
    );
  }
  saveUser(token: string | null, raw: UserSaveInput): User {
    const input = UserSaveSchema.parse(raw);
    return this.db
      .transaction(() => {
        const actor = this.authorize(token, 'users.save'),
          current = input.id ? this.user(input.id) : null;
        if (current && current.revision !== input.expectedRevision)
          throw new DomainError('REVISION_CONFLICT', 'La cuenta cambió. Recargá antes de guardar.');
        if (
          current?.role === 'OWNER' &&
          current.active &&
          (!input.active || input.role !== 'OWNER')
        ) {
          const count = (
            this.db
              .prepare("SELECT COUNT(*) AS n FROM users WHERE role='OWNER' AND active=1")
              .get() as { n: number }
          ).n;
          if (count <= 1)
            throw new DomainError('VALIDATION', 'Debe quedar al menos un jefe activo.');
        }
        if (
          this.db
            .prepare('SELECT 1 FROM users WHERE username=? AND id!=?')
            .get(input.username, current?.id ?? '')
        )
          throw new DomainError('VALIDATION', 'Ese usuario ya existe.');
        const id = current?.id ?? randomUUID(),
          now = new Date().toISOString();
        if (current) {
          this.db
            .prepare(
              'UPDATE users SET username=?,name=?,role=?,active=?,password_hash=COALESCE(?,password_hash),revision=revision+1,updated_at_utc=? WHERE id=?',
            )
            .run(
              input.username,
              input.name,
              input.role,
              Number(input.active),
              input.password ? hashPassword(input.password) : null,
              now,
              id,
            );
          this.db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(id);
        } else
          this.db
            .prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)')
            .run(
              id,
              input.username,
              input.name,
              input.role,
              Number(input.active),
              hashPassword(input.password!),
              1,
              now,
              now,
            );
        recordAudit(this.db, actor, 'users.save', id);
        return this.user(id);
      })
      .immediate();
  }
  changePassword(token: string | null, raw: ChangePasswordInput): null {
    const input = ChangePasswordSchema.parse(raw);
    return this.db
      .transaction(() => {
        const actor = this.authorize(token, 'auth.changePassword');
        const row = this.db.prepare('SELECT password_hash FROM users WHERE id=?').get(actor.id) as {
          password_hash: string;
        };
        if (!verifyPassword(input.currentPassword, row.password_hash))
          throw new DomainError('UNAUTHENTICATED', 'La contraseña actual es incorrecta.');
        this.db
          .prepare(
            'UPDATE users SET password_hash=?,revision=revision+1,updated_at_utc=? WHERE id=?',
          )
          .run(hashPassword(input.newPassword), new Date().toISOString(), actor.id);
        this.db.prepare('DELETE FROM auth_sessions WHERE user_id=?').run(actor.id);
        recordAudit(this.db, actor, 'auth.changePassword', actor.id);
        return null;
      })
      .immediate();
  }
}
