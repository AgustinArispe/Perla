import type Database from 'better-sqlite3';
import {
  availableFeatures,
  featureForOperation,
  purchaseHistoryOperations,
  transferHistoryOperations,
} from '../../domain/features';
import { DomainError } from '../../shared/errors';
import {
  FeatureChangeInputSchema,
  type FeatureChangeInput,
  type FeatureFlags,
  type FeatureKey,
  type FeatureStatus,
} from '../../shared/features';
import type { User } from '../../shared/auth';
import { recordAudit } from '../auth/audit';

type FeatureRow = { feature_key: FeatureKey; enabled: number };

export class FeatureService {
  constructor(private readonly db: Database.Database) {}

  status(): FeatureStatus {
    const revision = (
      this.db.prepare('SELECT features_revision FROM business_settings WHERE id=1').get() as {
        features_revision: number;
      }
    ).features_revision;
    const rows = this.db
      .prepare('SELECT feature_key,enabled FROM business_features')
      .all() as FeatureRow[];
    const persisted = new Map(rows.map((row) => [row.feature_key, Boolean(row.enabled)]));
    const enabled = Object.fromEntries(
      availableFeatures.map((feature) => [
        feature.key,
        persisted.get(feature.key) ??
          !(
            feature.key.startsWith('DELIVERY_NOTES_') ||
            feature.key === 'PREPARED_ORDERS' ||
            feature.key === 'BUSINESS_UNITS'
          ),
      ]),
    ) as FeatureFlags;
    return {
      revision,
      enabled,
      features: availableFeatures.map((feature) => ({ ...feature, enabled: enabled[feature.key] })),
    };
  }

  isEnabled(feature: FeatureKey): boolean {
    return this.status().enabled[feature];
  }

  assertOperation(operation: string, role?: User['role']): void {
    if (
      transferHistoryOperations.has(operation) &&
      !this.isEnabled('LOCATIONS_TRANSFERS') &&
      (role === 'OWNER' || role === 'ADMIN')
    )
      return;
    if (
      purchaseHistoryOperations.has(operation) &&
      !this.isEnabled('SUPPLIERS_PURCHASES') &&
      role !== 'OWNER' &&
      role !== 'ADMIN'
    )
      throw new DomainError(
        'FORBIDDEN',
        'Solo el jefe puede consultar o corregir compras mientras la función está desactivada.',
      );
    const feature = featureForOperation(operation);
    if (feature && !this.isEnabled(feature))
      throw new DomainError('FORBIDDEN', 'Esta función está desactivada para el negocio.');
  }

  change(raw: FeatureChangeInput, actor: User): FeatureStatus {
    if (!['OWNER', 'ADMIN'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Solo el jefe o administrador puede cambiar funciones.');
    const input = FeatureChangeInputSchema.parse(raw);
    return this.db
      .transaction(() => {
        const current = this.status();
        if (current.revision !== input.expectedRevision)
          throw new DomainError(
            'REVISION_CONFLICT',
            'La configuración cambió. Actualizala antes de guardar.',
          );
        const next: FeatureFlags = {
          REPLENISHMENT: input.enabled.REPLENISHMENT ?? current.enabled.REPLENISHMENT,
          STOCK_CONTROL: input.enabled.STOCK_CONTROL ?? current.enabled.STOCK_CONTROL,
          MONTHLY_DASHBOARD: input.enabled.MONTHLY_DASHBOARD ?? current.enabled.MONTHLY_DASHBOARD,
          RECEIPTS: input.enabled.RECEIPTS ?? current.enabled.RECEIPTS,
          PRODUCT_LABELS: input.enabled.PRODUCT_LABELS ?? current.enabled.PRODUCT_LABELS,
          SUPPLIERS_PURCHASES:
            input.enabled.SUPPLIERS_PURCHASES ?? current.enabled.SUPPLIERS_PURCHASES,
          COSTS_MARGIN: input.enabled.COSTS_MARGIN ?? current.enabled.COSTS_MARGIN,
          RETURNS: input.enabled.RETURNS ?? current.enabled.RETURNS,
          LOTS: input.enabled.LOTS ?? current.enabled.LOTS,
          PROMOTIONS: input.enabled.PROMOTIONS ?? current.enabled.PROMOTIONS,
          NOTIFICATIONS: input.enabled.NOTIFICATIONS ?? current.enabled.NOTIFICATIONS,
          SUPPLIER_ACCOUNTS: input.enabled.SUPPLIER_ACCOUNTS ?? current.enabled.SUPPLIER_ACCOUNTS,
          CUSTOMERS: input.enabled.CUSTOMERS ?? current.enabled.CUSTOMERS,
          CUSTOMER_CREDIT: input.enabled.CUSTOMER_CREDIT ?? current.enabled.CUSTOMER_CREDIT,
          LOCATIONS_TRANSFERS:
            input.enabled.LOCATIONS_TRANSFERS ?? current.enabled.LOCATIONS_TRANSFERS,
          DELIVERY_NOTES_SALES:
            input.enabled.DELIVERY_NOTES_SALES ?? current.enabled.DELIVERY_NOTES_SALES,
          DELIVERY_NOTES_PURCHASES:
            input.enabled.DELIVERY_NOTES_PURCHASES ?? current.enabled.DELIVERY_NOTES_PURCHASES,
          DELIVERY_NOTES_INTERNAL:
            input.enabled.DELIVERY_NOTES_INTERNAL ?? current.enabled.DELIVERY_NOTES_INTERNAL,
          PREPARED_ORDERS: input.enabled.PREPARED_ORDERS ?? current.enabled.PREPARED_ORDERS,
          BUSINESS_UNITS: input.enabled.BUSINESS_UNITS ?? current.enabled.BUSINESS_UNITS,
        };
        if (next.DELIVERY_NOTES_PURCHASES && !next.SUPPLIERS_PURCHASES)
          throw new DomainError(
            'VALIDATION',
            'Remitos de proveedores necesita Proveedores y compras.',
          );
        if (next.DELIVERY_NOTES_INTERNAL && !next.LOCATIONS_TRANSFERS)
          throw new DomainError('VALIDATION', 'Remitos internos necesita Ubicaciones y traslados.');
        if (next.REPLENISHMENT && (!next.STOCK_CONTROL || !next.SUPPLIERS_PURCHASES))
          throw new DomainError(
            'VALIDATION',
            'Reposición necesita Control de stock y Proveedores y compras.',
          );
        if (next.SUPPLIER_ACCOUNTS && !next.SUPPLIERS_PURCHASES)
          throw new DomainError(
            'VALIDATION',
            'Cuenta de proveedores necesita Proveedores y compras.',
          );
        if (next.CUSTOMER_CREDIT && !next.CUSTOMERS)
          throw new DomainError('VALIDATION', 'Cuenta corriente necesita Clientes.');
        if (next.LOCATIONS_TRANSFERS && !next.STOCK_CONTROL)
          throw new DomainError('VALIDATION', 'Ubicaciones y traslados necesita Control de stock.');
        if (!next.REPLENISHMENT && current.enabled.REPLENISHMENT) {
          const pending = (
            this.db
              .prepare(
                "SELECT COUNT(*) n FROM replenishment_orders WHERE status IN ('ORDERED','PARTIAL')",
              )
              .get() as { n: number }
          ).n;
          if (pending)
            throw new DomainError(
              'VALIDATION',
              'Recibí o cancelá los pedidos pendientes antes de desactivar Reposición.',
            );
        }
        if (!next.LOCATIONS_TRANSFERS && current.enabled.LOCATIONS_TRANSFERS) {
          const inTransit = (
            this.db
              .prepare("SELECT COUNT(*) n FROM stock_transfers WHERE status='IN_TRANSIT'")
              .get() as { n: number }
          ).n;
          if (inTransit)
            throw new DomainError(
              'VALIDATION',
              `Hay ${inTransit} ${inTransit === 1 ? 'traslado en tránsito' : 'traslados en tránsito'}. Recibilos o cancelalos antes de desactivar la función.`,
            );
        }
        if (!next.CUSTOMERS && current.enabled.CUSTOMERS) {
          const pending = (
            this.db
              .prepare(
                "SELECT COUNT(*) n FROM customer_receivables WHERE status='OPEN' AND balance_cents>0",
              )
              .get() as { n: number }
          ).n;
          if (pending)
            throw new DomainError(
              'VALIDATION',
              `Hay ${pending} ${pending === 1 ? 'saldo pendiente' : 'saldos pendientes'}. Conservá Clientes para poder cobrarlos.`,
            );
        }
        if (!next.SUPPLIER_ACCOUNTS && current.enabled.SUPPLIER_ACCOUNTS) {
          const pending = (
            this.db
              .prepare(
                "SELECT COUNT(*) AS n FROM supplier_payables WHERE status='OPEN' AND balance_cents>0",
              )
              .get() as { n: number }
          ).n;
          if (pending)
            throw new DomainError(
              'VALIDATION',
              `Hay ${pending} ${pending === 1 ? 'compra pendiente' : 'compras pendientes'}. Registrá los pagos antes de desactivar la cuenta.`,
            );
        }
        const changed = availableFeatures.filter(
          (feature) => current.enabled[feature.key] !== next[feature.key],
        );
        if (!changed.length) return current;
        const now = new Date().toISOString();
        const update = this.db.prepare(
          'UPDATE business_features SET enabled=?,updated_at_utc=? WHERE feature_key=?',
        );
        for (const feature of changed) update.run(Number(next[feature.key]), now, feature.key);
        if (current.enabled.STOCK_CONTROL && !next.STOCK_CONTROL)
          this.db
            .prepare(
              'UPDATE products SET stock_initialized=0,revision=revision+1,updated_at_utc=? WHERE track_stock=1',
            )
            .run(now);
        this.db
          .prepare(
            'UPDATE business_settings SET features_revision=features_revision+1,updated_at_utc=? WHERE id=1',
          )
          .run(now);
        recordAudit(this.db, actor, 'settings.features.save', '1');
        return this.status();
      })
      .immediate();
  }
}
