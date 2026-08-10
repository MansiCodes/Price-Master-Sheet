import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { isAdminOrHead } from "@/lib/rbac";
import { AuditTrailClient } from "./AuditTrailClient";

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!isAdminOrHead(session.user.globalRole)) {
    return (
      <div>
        <h1 className="page-title">Access denied</h1>
        <p className="page-sub">Admin / business head only.</p>
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      actor: { select: { name: true, email: true } },
    },
  });

  const rows = logs.map((log) => {
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
  });

  return <AuditTrailClient initialRows={rows} />;
}
