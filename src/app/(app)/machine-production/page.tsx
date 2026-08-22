import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SupervisorDashboard } from "@/components/machine-production/SupervisorDashboard";
import {
  canAccessMachineProduction,
  canAdminMachineProduction,
} from "@/lib/rbac";

export default async function MachineProductionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessMachineProduction(session.user.globalRole)) {
    redirect("/");
  }

  return (
    <Suspense fallback={<p className="mp-muted">Loading…</p>}>
      <SupervisorDashboard
        isAdmin={canAdminMachineProduction(session.user.globalRole)}
      />
    </Suspense>
  );
}
