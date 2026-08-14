import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { queryAuditLogs } from "@/lib/audit";
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

  const initial = await queryAuditLogs({ page: 1, pageSize: 10 });

  return (
    <AuditTrailClient
      initialRows={initial.rows}
      initialTotal={initial.total}
      initialActors={initial.actors}
    />
  );
}
