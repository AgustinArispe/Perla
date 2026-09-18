import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { acquireDatabaseLease } from '../../src/server/lease';
it('exclusión real entre servicio y administración/recuperación; libera al cerrar', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bocha-lease-')),
    path = join(directory, 'pos.sqlite');
  const first = acquireDatabaseLease(path);
  try {
    expect(() => acquireDatabaseLease(path)).toThrow();
    first.close();
    const next = acquireDatabaseLease(path);
    next.close();
  } finally {
    first.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
