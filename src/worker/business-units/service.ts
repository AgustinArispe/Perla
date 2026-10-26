import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import {
  BusinessUnitRenameSchema,
  PRIMARY_UNIT_ID,
  SECONDARY_UNIT_ID,
  type BusinessUnit,
  type BusinessUnitRename,
  type BusinessUnitStatus,
} from '../../shared/business-units';
import { DomainError } from '../../shared/errors';
import { FeatureService } from '../features/service';
import { recordAudit } from '../auth/audit';
export class BusinessUnitService {
  constructor(private readonly db: Database.Database) {}
  list(): BusinessUnit[] {
    return (
      this.db
        .prepare('SELECT id,name,secondary,revision FROM business_units ORDER BY secondary')
        .all() as (Omit<BusinessUnit, 'secondary'> & { secondary: number })[]
    ).map((row) => ({ ...row, secondary: Boolean(row.secondary) }));
  }
  resolve(actor?: User): BusinessUnit {
    const assigned =
      actor && new FeatureService(this.db).isEnabled('BUSINESS_UNITS')
        ? (
            this.db.prepare('SELECT business_unit_id id FROM users WHERE id=?').get(actor.id) as
              { id: string | null } | undefined
          )?.id
        : null;
    const unit = this.list().find((item) => item.id === (assigned ?? PRIMARY_UNIT_ID));
    if (!unit) throw new DomainError('VALIDATION', 'La unidad del usuario no existe.');
    return unit;
  }
  status(actor: User): BusinessUnitStatus {
    return {
      enabled: new FeatureService(this.db).isEnabled('BUSINESS_UNITS'),
      current: this.resolve(actor),
      units: this.list(),
      hasSecondaryHistory: Boolean(
        this.db
          .prepare('SELECT 1 FROM sales WHERE business_unit_id=? LIMIT 1')
          .get(SECONDARY_UNIT_ID),
      ),
    };
  }
  rename(raw: BusinessUnitRename, actor: User): BusinessUnitStatus {
    if (!['OWNER', 'ADMIN'].includes(actor.role))
      throw new DomainError('FORBIDDEN', 'Solo el jefe puede configurar las unidades.');
    const input = BusinessUnitRenameSchema.parse(raw);
    return this.db
      .transaction(() => {
        if (!new FeatureService(this.db).isEnabled('BUSINESS_UNITS'))
          throw new DomainError('FORBIDDEN', 'Activá BiEmpresa antes de configurar las unidades.');
        if (
          this.list().some(
            (unit) =>
              unit.id !== input.id &&
              unit.name.toLocaleLowerCase() === input.name.toLocaleLowerCase(),
          )
        )
          throw new DomainError('VALIDATION', 'Usá nombres diferentes para las unidades.');
        const result = this.db
          .prepare('UPDATE business_units SET name=?,revision=revision+1 WHERE id=? AND revision=?')
          .run(input.name, input.id, input.expectedRevision);
        if (!result.changes)
          throw new DomainError(
            'REVISION_CONFLICT',
            'La unidad cambió. Actualizá antes de guardar.',
          );
        recordAudit(this.db, actor, 'businessUnits.rename', input.id);
        return this.status(actor);
      })
      .immediate();
  }
}
