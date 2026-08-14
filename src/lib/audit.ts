import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const AUDIT_PAGE_SIZE = 10;
const HIDDEN_ENTITY_TYPES = ["ManpowerEntry"];

export type AuditLogRow = {
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

export type AuditLogQuery = {
  page?: number;
  pageSize?: number;
  q?: string;
  actorName?: string;
  dateFrom?: string;
  dateTo?: string;
};

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

function mapAuditLog(log: {
  id: string;
  createdAt: Date;
  entityType: string;
  entityId: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  isBackdated: boolean;
  actor: { name: string | null; email: string };
}): AuditLogRow {
  const iso = log.createdAt.toISOString();
  return {
    id: log.id,
    createdAt: iso.replace("T", " ").slice(0, 19),
    dateKey: iso.slice(0, 10),
    entityType: log.entityType,
    entityId: log.entityId,
    field: log.field,
    oldValue: log.oldValue,
    newValue: log.newValue,
    isBackdated: log.isBackdated,
    actorName: log.actor.name ?? log.actor.email,
    actorEmail: log.actor.email,
  };
}

export async function queryAuditLogs(input: AuditLogQuery = {}) {
  const pageSize = Math.min(
    50,
    Math.max(1, Math.floor(input.pageSize ?? AUDIT_PAGE_SIZE)),
  );
  const requested = Math.max(1, Math.floor(input.page ?? 1));
  const q = input.q?.trim();

  const where: Prisma.AuditLogWhereInput = {
    entityType: { notIn: HIDDEN_ENTITY_TYPES },
  };

  if (input.actorName && input.actorName !== "ALL") {
    where.actor = {
      OR: [{ name: input.actorName }, { email: input.actorName }],
    };
  }

  if (input.dateFrom || input.dateTo) {
    where.createdAt = {
      ...(input.dateFrom
        ? { gte: new Date(`${input.dateFrom}T00:00:00.000Z`) }
        : {}),
      ...(input.dateTo
        ? { lte: new Date(`${input.dateTo}T23:59:59.999Z`) }
        : {}),
    };
  }

  if (q) {
    where.OR = [
      { entityType: { contains: q, mode: "insensitive" } },
      { field: { contains: q, mode: "insensitive" } },
      { newValue: { contains: q, mode: "insensitive" } },
      { oldValue: { contains: q, mode: "insensitive" } },
      { actor: { name: { contains: q, mode: "insensitive" } } },
      { actor: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, actorRows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where: { entityType: { notIn: HIDDEN_ENTITY_TYPES } },
      distinct: ["actorId"],
      select: {
        actor: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requested, totalPages);

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    include: {
      actor: { select: { name: true, email: true } },
    },
  });

  const actors = [
    ...new Set(
      actorRows.map((r) => r.actor.name ?? r.actor.email).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return {
    rows: logs.map(mapAuditLog),
    page,
    pageSize,
    total,
    totalPages,
    actors,
  };
}
