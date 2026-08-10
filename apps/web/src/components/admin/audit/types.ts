export type AuditRow = {
  id: string;
  createdAt: string;
  dateKey: string;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  isBackdated: boolean;
  actorName: string;
  actorEmail: string;
};

export function truncateAuditValue(value: string | null, max = 80): string {
  if (!value) return "—";
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function formatAuditChange(oldValue: string | null, newValue: string | null): string {
  if (oldValue) {
    return `${truncateAuditValue(oldValue, 40)} → ${truncateAuditValue(newValue, 40)}`;
  }
  return truncateAuditValue(newValue, 80);
}
