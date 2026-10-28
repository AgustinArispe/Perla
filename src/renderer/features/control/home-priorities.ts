import type { ControlPending } from '../../../shared/control';
export function homePriorities(groups: ControlPending[]) {
  const pending = groups.filter((group) => group.total > 0);
  const priority = pending
    .filter((group) => group.action === 'expiries' || group.action === 'cashDifferences')
    .sort(
      (a, b) => Number(a.action === 'cashDifferences') - Number(b.action === 'cashDifferences'),
    );
  return { priority, planned: pending.filter((group) => !priority.includes(group)) };
}
