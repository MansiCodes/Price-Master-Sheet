import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminDashboard } from "@/components/machine-production/AdminDashboard";
import { canAdminMachineProduction } from "@/lib/rbac";

export default async function MachineProductionAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!canAdminMachineProduction(session.user.globalRole)) {
    redirect("/machine-production");
  }

  return <AdminDashboard />;
}
