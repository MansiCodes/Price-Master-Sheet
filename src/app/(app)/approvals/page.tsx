import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds, isAdminOrHead } from "@/lib/rbac";
import { GlobalRole } from "@prisma/client";
import { PendingApprovalsTable } from "@/components/dashboard/PendingApprovalsTable";
import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/config";

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  if (!isAdminOrHead(user.globalRole)) {
    redirect("/");
  }

  const plantIds = await getAccessiblePlantIds(user.id);
  const locale = (await getLocale()) as AppLocale;

  const pendingApprovals = await prisma.dailyEntryStatus.findMany({
    where: {
      plantId: { in: plantIds },
      allComplete: true,
      ...(user.globalRole === GlobalRole.BUSINESS_HEAD
        ? { approvedByHead: false }
        : { approvedByHead: true, approvedByAdmin: false }),
    },
    include: {
      plant: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const serializedApprovals = pendingApprovals.map((p) => ({
    id: p.id,
    plantId: p.plantId,
    date: p.date.toISOString(),
    shift: p.shift,
    approvedByHead: p.approvedByHead,
    approvedByAdmin: p.approvedByAdmin,
    plant: { name: p.plant.name },
  }));

  return (
    <div style={{ padding: "2rem" }}>
      <h1 className="page-title">Shift Approvals</h1>
      <p className="page-sub">Review completed shifts and approve or reject their entries.</p>
      
      {serializedApprovals.length === 0 ? (
        <div
          style={{
            padding: "3rem",
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "0.5rem",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
            marginTop: "1.5rem",
          }}
        >
          No pending approvals found.
        </div>
      ) : (
        <div style={{ marginTop: "1.5rem" }}>
          <PendingApprovalsTable
            pendingApprovals={serializedApprovals}
            userRole={user.globalRole}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
