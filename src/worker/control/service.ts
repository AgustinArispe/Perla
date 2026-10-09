import type Database from 'better-sqlite3';
import type { User } from '../../shared/auth';
import { ControlRequestSchema } from '../../shared/control';
import { WorkspaceControlService } from './workspace';
import { ReplenishmentService } from './replenishment';
import { CommercialControlService } from './commercial';
import { OperationalControlService } from './operations';
export class ControlService {
  constructor(private readonly db: Database.Database) {}
  execute(raw: unknown, actor: User): unknown {
    const v = ControlRequestSchema.parse(raw);
    switch (v.area) {
      case 'workspace':
        return new WorkspaceControlService(this.db).execute(v.action, v.input, actor);
      case 'replenishment':
        return new ReplenishmentService(this.db).execute(v.action, v.input, actor);
      case 'commercial':
        return new CommercialControlService(this.db).execute(v.action, v.input, actor);
      case 'operations':
        return new OperationalControlService(this.db).execute(v.action, v.input, actor);
    }
  }
}
