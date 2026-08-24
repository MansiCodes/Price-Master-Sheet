import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SupervisorDashboard } from "@/components/machine-production/SupervisorDashboard";
import { CardGridLoadingSkeleton } from "@/components/loading/CoreLoadingSkeleton";
import { canAccessMachineProduction } from "@/lib/rbac";

export default async function MachineProductionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAccessMachineProduction(session.user.globalRole)) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={<CardGridLoadingSkeleton label="Loading machine production" />}
    >
      <SupervisorDashboard />
    </Suspense>
  );
}
