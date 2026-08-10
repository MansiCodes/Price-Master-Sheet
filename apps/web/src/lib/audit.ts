import { prisma } from "@/lib/db";

export type WriteAuditLogInput = {
  entityType: string;
  entityId: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  actorId: string;
  plantId?: string | null;
  isBackdated?: boolean;
};

function toAuditString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  const {
    entityType,
    entityId,
    field = null,
    oldValue,
    newValue,
    actorId,
    plantId = null,
    isBackdated = false,
  } = input;

  return prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      field,
      oldValue: toAuditString(oldValue),
      newValue: toAuditString(newValue),
      actorId,
      plantId,
      isBackdated,
    },
  });
}
