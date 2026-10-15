import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import productsSql from './migrations/002_products.sql?raw';
import inventorySql from './migrations/003_inventory.sql?raw';
import salesSql from './migrations/004_sales.sql?raw';
import usersSql from './migrations/005_users.sql?raw';
import webSql from './migrations/006_web_operations.sql?raw';
import adminSql from './migrations/007_system_admin.sql?raw';
import taxonomySql from './migrations/008_product_taxonomy.sql?raw';
import identificationSql from './migrations/009_product_identification.sql?raw';
import receiptsSql from './migrations/010_receipts.sql?raw';
import perlaSql from './migrations/011_perla_brand.sql?raw';
import perlaNegraSql from './migrations/012_perla_negra_brand.sql?raw';
import businessFeaturesSql from './migrations/013_business_features.sql?raw';
import suppliersPurchasesSql from './migrations/014_suppliers_purchases.sql?raw';
import costsProfitabilitySql from './migrations/015_costs_profitability.sql?raw';
import saleReturnsSql from './migrations/016_sale_returns.sql?raw';
import inventoryLotsSql from './migrations/017_inventory_lots.sql?raw';
import pricesPromotionsSql from './migrations/018_prices_promotions.sql?raw';
import notificationsComparisonsSql from './migrations/019_notifications_comparisons.sql?raw';
import supplierAccountsSql from './migrations/020_supplier_accounts.sql?raw';
import customersCreditSql from './migrations/021_customers_credit.sql?raw';
import locationsTransfersSql from './migrations/022_locations_transfers.sql?raw';
import locationScaleSql from './migrations/023_location_scale.sql?raw';
import controlWorkspaceSql from './migrations/024_control_workspace.sql?raw';
import control25 from './migrations/025_control_orders.sql?raw';
import control26 from './migrations/026_control_commercial.sql?raw';
import control27 from './migrations/027_control_counts.sql?raw';
import control28 from './migrations/028_control_agenda.sql?raw';
import control29 from './migrations/029_control_weekly.sql?raw';
import queryIndexes30 from './migrations/030_query_indexes.sql?raw';
import schemaCleanup31 from './migrations/031_schema_cleanup.sql?raw';
import { DomainError } from '../../shared/errors';

export interface Migration {
  version: number;
  sql: string;
}
export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `CREATE TABLE app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    ) STRICT;`,
  },
  { version: 2, sql: productsSql },
  { version: 3, sql: inventorySql },
  { version: 4, sql: salesSql },
  { version: 5, sql: usersSql },
  { version: 6, sql: webSql },
  { version: 7, sql: adminSql },
  { version: 8, sql: taxonomySql },
  { version: 9, sql: identificationSql },
  { version: 10, sql: receiptsSql },
  { version: 11, sql: perlaSql },
  { version: 12, sql: perlaNegraSql },
  { version: 13, sql: businessFeaturesSql },
  { version: 14, sql: suppliersPurchasesSql },
  { version: 15, sql: costsProfitabilitySql },
  { version: 16, sql: saleReturnsSql },
  { version: 17, sql: inventoryLotsSql },
  { version: 18, sql: pricesPromotionsSql },
  { version: 19, sql: notificationsComparisonsSql },
  { version: 20, sql: supplierAccountsSql },
  { version: 21, sql: customersCreditSql },
  { version: 22, sql: locationsTransfersSql },
  { version: 23, sql: locationScaleSql },
  { version: 24, sql: controlWorkspaceSql },
  { version: 25, sql: control25 },
  { version: 26, sql: control26 },
  { version: 27, sql: control27 },
  { version: 28, sql: control28 },
  { version: 29, sql: control29 },
  { version: 30, sql: queryIndexes30 },
  { version: 31, sql: schemaCleanup31 },
];
export const SCHEMA_VERSION = MIGRATIONS.at(-1)!.version;
const rawChecksum = (sql: string) => createHash('sha256').update(sql).digest('hex');
const checksum = (sql: string) => rawChecksum(sql.replace(/\r\n/g, '\n'));

export function migrate(database: Database.Database, migrations: Migration[] = MIGRATIONS): void {
  database
    .transaction(() => {
      database.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL,
    checksum TEXT
  ) STRICT;`);
      const columns = database.pragma('table_info(schema_migrations)') as { name: string }[];
      if (!columns.some((column) => column.name === 'checksum'))
        database.exec('ALTER TABLE schema_migrations ADD COLUMN checksum TEXT');
      const current = database
        .prepare('SELECT MAX(version) AS version FROM schema_migrations')
        .get() as { version: number | null };
      const latest = migrations.at(-1)?.version ?? 0;
      if ((current.version ?? 0) > latest)
        throw new DomainError(
          'SCHEMA_TOO_NEW',
          'Esta base requiere una versión más reciente de Perla Negra. No se modificaron los datos.',
        );
      const applied = database
        .prepare('SELECT version, checksum FROM schema_migrations ORDER BY version')
        .all() as { version: number; checksum: string | null }[];
      for (const row of applied) {
        const original = migrations.find((migration) => migration.version === row.version);
        if (
          !original ||
          (row.checksum &&
            row.checksum !== checksum(original.sql) &&
            row.checksum !== rawChecksum(original.sql.replace(/\r?\n/g, '\r\n')))
        )
          throw new DomainError(
            'BACKUP_INVALID',
            'El historial de migraciones no coincide con esta aplicación.',
          );
        if (row.checksum !== checksum(original.sql))
          database
            .prepare('UPDATE schema_migrations SET checksum=? WHERE version=?')
            .run(checksum(original.sql), row.version);
      }
      for (const migration of migrations) {
        if (migration.version <= (current.version ?? 0)) continue;
        database.exec(migration.sql);
        database
          .prepare('INSERT INTO schema_migrations (version, applied_at, checksum) VALUES (?, ?, ?)')
          .run(migration.version, new Date().toISOString(), checksum(migration.sql));
      }
    })
    .immediate();
}
