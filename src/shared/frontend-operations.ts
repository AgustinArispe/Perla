export interface Terminal {
  id: string;
  name: string;
  active: boolean;
  revision: number;
}
export interface RegisterShift {
  id: string;
  terminalId: string;
  status: 'OPEN' | 'CLOSED';
  openingCashCents: number;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  countedCashCents: number | null;
  expectedCashCents: number | null;
  differenceCents: number | null;
  revision: number;
}
export interface RegisterMovement {
  id: string;
  kind: 'IN' | 'OUT' | 'REFUND';
  amountCents: number;
  reason: string;
  actorUserId: string;
  createdAt: string;
  saleId: string | null;
}
export interface ShiftDetail extends RegisterShift {
  movements: RegisterMovement[];
}
export interface AuditEvent {
  id: string;
  operation: string;
  entityId: string | null;
  actorUserId: string | null;
  actorName: string | null;
  createdAt: string;
}
export interface OperationPage<T> {
  items: T[];
  nextCursor: string | null;
}
