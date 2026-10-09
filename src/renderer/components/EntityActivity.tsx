import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthStatus } from '../../shared/auth';
import { StructuredActivityPanel } from '../features/control/StructuredActivityPanel';
export function EntityActivity({
  entityType,
  entityId,
}: {
  entityType: 'product' | 'sale';
  entityId: string;
}) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const role = client.getQueryData<AuthStatus>(['auth-status'])?.user?.role;
  if (role !== 'OWNER' && role !== 'ADMIN') return null;
  return (
    <details
      className="entity-activity control-surface"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>Historial de cambios</summary>
      {open && <StructuredActivityPanel entityType={entityType} entityId={entityId} />}
    </details>
  );
}
