import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { queryAuditLogs } from "@/lib/audit";
import { isAdminOrHead } from "@/lib/rbac";
import { AuditTrailClient } from "./AuditTrailClient";

export default async function AuditLogPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const t = await getTranslations("admin");
  const tPnl = await getTranslations("pnl");
  if (!isAdminOrHead(session.user.globalRole)) {
    return (
      <div>
        <h1 className="page-title">{tPnl("accessDenied")}</h1>
        <p className="page-sub">{t("audit")}</p>
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
