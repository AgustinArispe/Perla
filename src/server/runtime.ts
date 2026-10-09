import { ControlRequestSchema } from '../shared/control';
import {
  captureAuditState,
  recordMutationAudit,
  CommercialControlService,
} from '../worker/control/commercial';

import { controlExcel } from './control-export';

import { exportExcel } from './excel';

import { createHash } from 'node:crypto';

import { z } from 'zod';

import { openDatabase } from '../worker/db/connection';

import { AuthService } from '../worker/auth/service';

import { verifyPassword } from '../worker/auth/password';

import { Application } from '../worker/application';

import { OperationsService } from '../worker/operations/service';

import { OperationSchemas } from '../shared/operations';

import { DomainError, failure } from '../shared/errors';

import type { Result } from '../shared/contracts';

import { CheckoutSchema, VoidSchema, type SaleDetail } from '../shared/sales';

import { ReturnConfirmSchema, type SaleReturnDetail } from '../shared/returns';

import { BackupService, recoverInterruptedRestore } from './backups/service';

import { acquireDatabaseLease } from './lease';

import { parseWeight } from '../domain/weight';

import { calculateSale } from '../domain/sale';

import type { Product } from '../shared/catalog';

import {
  SelectTerminalSchema,
  WeightCalculatorSchema,
  BackupIdSchema,
  RestoreBackupSchema,
  type WebSaleDetail,
} from '../shared/web';

import type { AuthStatus } from '../shared/auth';

export interface Executor {
  request(operation: string, payload: unknown, token: string | null): Promise<Result<unknown>>;
}

export interface RuntimeOptions {
  databasePath: string;

  backupDirectory: string;

  backupKey: Buffer;

  appVersion: string;

  sessionIdleTimeoutMs?: number;

  sessionMaxLifetimeMs?: number;
}

export class ServerRuntime implements Executor {
  database!: ReturnType<typeof openDatabase>;

  private auth!: AuthService;

  private app!: Application;

  private operations!: OperationsService;

  readonly backups: BackupService;

  private exportingExcel = false;

  private weeklyTimer?: ReturnType<typeof setInterval>;

  private previews = new Map<string, string>();

  private lease: ReturnType<typeof acquireDatabaseLease>;

  constructor(private options: RuntimeOptions) {
    this.lease = acquireDatabaseLease(options.databasePath);

    try {
      recoverInterruptedRestore(options.databasePath);

      this.reopen();
    } catch (error) {
      this.lease.close();

      throw error;
    }

    this.weeklyTimer = setInterval(() => this.recoverWeekly(), 60000);

    this.weeklyTimer.unref();

    this.recoverWeekly();

    this.backups = new BackupService({
      databasePath: options.databasePath,

      backupDirectory: options.backupDirectory,

      key: options.backupKey,

      appVersion: options.appVersion,

      getDatabase: () => this.database,

      closeDatabase: () => {
        if (this.database.open) this.database.close();
      },

      reopenDatabase: () => this.reopen(),
    });
  }

  private reopen() {
    this.database = openDatabase(this.options.databasePath);

    this.auth = new AuthService(this.database, {
      idleTimeoutMs: this.options.sessionIdleTimeoutMs ?? 30 * 60_000,

      sessionMaxLifetimeMs: this.options.sessionMaxLifetimeMs ?? 8 * 60 * 60_000,

      singleSession: true,
    });

    this.app = new Application(this.database, this.auth);

    this.operations = new OperationsService(this.database);
  }

  private recoverWeekly() {
    if (
      this.database?.open &&
      (
        this.database
          .prepare("SELECT enabled FROM business_features WHERE feature_key='MONTHLY_DASHBOARD'")
          .get() as { enabled: number }
      )?.enabled
    ) {
      try {
        new CommercialControlService(this.database).recoverWeekly(1);
      } catch (error) {
        console.error('No se pudo recuperar el resumen semanal', error);
      }
    }
  }

  close() {
    clearInterval(this.weeklyTimer);

    if (this.database?.open) this.database.close();

    this.lease.close();
  }

  async request(
    operation: string,

    payload: unknown,

    token: string | null,
  ): Promise<Result<unknown>> {
    try {
      return { ok: true, value: await this.execute(operation, payload, token) };
    } catch (error) {
      return failure(error);
    }
  }

  private terminal(token: string | null) {
    const row = this.database

      .prepare('SELECT terminal_id FROM auth_sessions WHERE token_hash=?')

      .get(
        createHash('sha256')
          .update(token ?? '')

          .digest('hex'),
      ) as { terminal_id: string | null } | undefined;

    if (!row?.terminal_id)
      throw new DomainError('VALIDATION', 'Seleccioná una caja para continuar.');

    return row.terminal_id;
  }

  private locationForTerminal(terminalId: string): string {
    return (
      this.database
        .prepare(
          `SELECT COALESCE(

      (SELECT location_id FROM terminal_locations WHERE terminal_id=?),

      (SELECT id FROM locations WHERE is_default=1)

    ) AS id`,
        )
        .get(terminalId) as { id: string }
    ).id;
  }

  private async execute(
    operation: string,

    payload: unknown,

    token: string | null,
  ): Promise<unknown> {
    if (operation === 'internal.health') return { database: 'ready' };

    if (operation === 'auth.status') {
      const status = this.app.dispatch(operation, payload, token) as AuthStatus;

      const row = status.user
        ? (this.database

            .prepare('SELECT terminal_id AS terminalId FROM auth_sessions WHERE token_hash=?')

            .get(createHash('sha256').update(token!).digest('hex')) as {
            terminalId: string | null;
          })
        : undefined;

      return { ...status, terminalId: row?.terminalId ?? null };
    }

    if (operation === 'auth.bootstrap')
      throw new DomainError('FORBIDDEN', 'Usá la administración privada.');

    if (operation === 'checkout.calculateWeight') {
      this.auth.requireUser(token);

      const input = WeightCalculatorSchema.parse(payload);

      const product = this.app.dispatch(
        'products.get',

        { productId: input.productId },

        token,
      ) as Product;

      if (!product.active || product.saleUnit !== 'KG')
        throw new DomainError('VALIDATION', 'Elegí un producto activo vendido por kilo.');

      let quantityBase: number;

      try {
        quantityBase = parseWeight(input.weight, input.unit);
      } catch (error) {
        throw new DomainError(
          'VALIDATION',

          error instanceof Error ? error.message : 'Peso inválido.',
        );
      }

      const result = calculateSale([{ unit: 'KG', priceCents: product.priceCents, quantityBase }], {
        type: 'NONE',
      });

      return {
        productId: product.id,

        productRevision: product.revision,

        priceCents: product.priceCents,

        quantityBase,

        totalCents: result.totalCents,
      };
    }

    if (operation === 'control.export') {
      const exportInput = ControlRequestSchema.parse(payload);
      if (
        !['export', 'exportWeekly', 'exportActivity'].includes(exportInput.action) ||
        exportInput.area === 'workspace'
      )
        throw new DomainError('VALIDATION', 'Seleccioná una exportación válida.');
      const result = this.app.dispatch('control.execute', exportInput, token);

      if (this.exportingExcel)
        throw new DomainError(
          'DB_BUSY',
          'Se está preparando otro Excel. Intentá en unos segundos.',
        );

      this.exportingExcel = true;

      try {
        return await controlExcel(result);
      } finally {
        this.exportingExcel = false;
      }
    }

    if (operation === 'exports.excel') {
      const actor = this.auth.requireUser(token);

      if (!['OWNER', 'ADMIN', 'SUPERVISOR'].includes(actor.role))
        throw new DomainError('FORBIDDEN', 'No tenés permiso para exportar información.');

      if (this.exportingExcel)
        throw new DomainError(
          'DB_BUSY',
          'Se está preparando otro Excel. Volvé a intentar en unos segundos.',
        );

      this.exportingExcel = true;

      try {
        return await exportExcel(this.database, payload, (op, input) =>
          Object.hasOwn(OperationSchemas, op)
            ? this.operations.execute(op, input, actor)
            : this.app.dispatch(op, input, token),
        );
      } finally {
        this.exportingExcel = false;
      }
    }

    if (operation === 'auth.terminal') {
      this.auth.requireUser(token);

      const { terminalId } = SelectTerminalSchema.parse(payload);

      if (!this.database.prepare('SELECT 1 FROM terminals WHERE id=? AND active=1').get(terminalId))
        throw new DomainError('NOT_FOUND', 'La caja no está disponible.');

      this.database

        .prepare('UPDATE auth_sessions SET terminal_id=? WHERE token_hash=?')

        .run(terminalId, createHash('sha256').update(token!).digest('hex'));

      return { terminalId };
    }

    if (operation.startsWith('backups.')) {
      const actor = this.auth.requireUser(token);

      if (!['OWNER', 'ADMIN'].includes(actor.role))
        throw new DomainError(
          'FORBIDDEN',
          'Solo el jefe o administrador puede administrar copias.',
        );

      if (operation === 'backups.list') {
        z.strictObject({}).parse(payload);

        return this.backups.list();
      }

      if (operation === 'backups.create') {
        z.strictObject({}).parse(payload);

        return this.backups.create();
      }

      if (operation === 'backups.upload') {
        if (!(payload instanceof Uint8Array))
          throw new DomainError('VALIDATION', 'Archivo inválido.');

        return this.backups.upload(Buffer.from(payload));
      }

      if (operation === 'backups.restore') {
        const input = RestoreBackupSchema.parse(payload);

        if (this.previews.get(input.previewToken) !== actor.id)
          throw new DomainError('BACKUP_INVALID', 'Revisá nuevamente la copia.');

        const row = this.database

          .prepare('SELECT password_hash FROM users WHERE id=?')

          .get(actor.id) as { password_hash: string };

        if (!verifyPassword(input.currentPassword, row.password_hash))
          throw new DomainError('UNAUTHENTICATED', 'La contraseña actual no es válida.');

        const result = await this.backups.restore(input.previewToken);

        this.previews.clear();

        return result;
      }

      const { id } = BackupIdSchema.parse(payload);

      if (operation === 'backups.download') return this.backups.download(id);

      if (operation === 'backups.inspect') {
        const result = await this.backups.inspect(id);

        if (this.previews.size >= 100) this.previews.clear();

        this.previews.set(result.previewToken, actor.id);

        return result;
      }

      throw new DomainError('VALIDATION', 'Operación desconocida.');
    }

    if (Object.hasOwn(OperationSchemas, operation)) {
      const actor = this.auth.requireUser(token);

      if (operation.startsWith('cash.')) {
        const input = OperationSchemas[operation as keyof typeof OperationSchemas].parse(
          payload,
        ) as Record<string, unknown>;

        const terminalId = this.terminal(token);

        if (input.terminalId && input.terminalId !== terminalId)
          throw new DomainError('FORBIDDEN', 'La caja no corresponde a esta sesión.');

        if (input.shiftId) {
          const shift = this.database

            .prepare('SELECT terminal_id FROM register_shifts WHERE id=?')

            .get(input.shiftId) as { terminal_id: string } | undefined;

          if (shift && shift.terminal_id !== terminalId)
            throw new DomainError('FORBIDDEN', 'La caja no corresponde a esta sesión.');
        }
      }

      if (operation === 'cash.open' || operation === 'cash.close')
        return this.database
          .transaction(() => {
            const before = captureAuditState(this.database, operation, payload);
            const result = this.operations.execute(operation, payload, actor);
            recordMutationAudit(this.database, actor, operation, payload, result, before);
            return result;
          })
          .immediate();
      return this.operations.execute(operation, payload, actor);
    }

    if (operation === 'sales.complete')
      return this.database

        .transaction(() => {
          const actor = this.auth.requireUser(token),
            input = CheckoutSchema.parse(payload);

          const existing = this.database

            .prepare('SELECT location_id FROM sales WHERE checkout_key=?')

            .get(input.checkoutKey) as { location_id: string | null } | undefined;

          let shift: ReturnType<OperationsService['cash']['requireOpen']> | undefined;

          if (!existing) {
            shift = this.operations.cash.requireOpen(this.terminal(token), actor);

            const settings = this.operations.execute('settings.get', {}, actor) as {
              paymentMethods: string[];
            };

            if (input.payments?.some((p) => !settings.paymentMethods.includes(p.method)))
              throw new DomainError('VALIDATION', 'El medio de pago no está habilitado.');
          }

          const terminalId = shift?.terminalId ?? this.terminal(token);

          const trustedInput = {
            ...input,
            locationId: existing?.location_id ?? this.locationForTerminal(terminalId),
          };

          const sale = this.app.dispatch(operation, trustedInput, token) as SaleDetail;

          if (shift)
            this.database

              .prepare('UPDATE sales SET terminal_id=?,register_shift_id=? WHERE id=?')

              .run(shift.terminalId, shift.id, sale.id);

          return this.saleContext(sale);
        })

        .immediate();

    if (operation === 'sales.void')
      return this.database

        .transaction(() => {
          const actor = this.auth.requireUser(token);

          const input = VoidSchema.parse(payload);

          const before = this.app.dispatch(
            'sales.detail',

            { saleId: input.saleId },

            token,
          ) as SaleDetail;

          const result = this.app.dispatch(operation, payload, token);

          const original = this.database

            .prepare('SELECT register_shift_id FROM sales WHERE id=?')

            .get(before.id) as { register_shift_id: string | null };

          if (
            before.status !== 'VOIDED' &&
            original.register_shift_id &&
            before.payments.some((p) => p.method === 'CASH')
          ) {
            const shift = this.operations.cash.requireOpen(this.terminal(token), actor);

            this.operations.cash.refund(before, shift.id, actor);
          }

          return this.saleContext(result as SaleDetail);
        })

        .immediate();

    if (operation === 'sales.return')
      return this.database

        .transaction(() => {
          const actor = this.auth.requireUser(token);

          const input = ReturnConfirmSchema.parse(payload);

          const existing = this.database

            .prepare('SELECT id FROM sale_returns WHERE operation_key=?')

            .get(input.operationKey);

          const result = this.app.dispatch(operation, input, token) as SaleReturnDetail;

          if (!existing && result.refundMethod === 'CASH' && result.refundCents > 0) {
            const shift = this.operations.cash.requireOpen(this.terminal(token), actor);

            this.operations.cash.partialRefund(result, shift.id, actor);
          }

          return result;
        })

        .immediate();

    const result = this.app.dispatch(operation, payload, token);

    if (['sales.detail', 'sales.findByCheckoutKey'].includes(operation) && result)
      return this.saleContext(result as SaleDetail);

    return result;
  }

  private saleContext(sale: SaleDetail): WebSaleDetail {
    const row = this.database

      .prepare(
        'SELECT terminal_id AS terminalId,register_shift_id AS registerShiftId FROM sales WHERE id=?',
      )

      .get(sale.id) as { terminalId: string | null; registerShiftId: string | null };

    return { ...sale, ...row };
  }
}
