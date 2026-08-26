import { auth } from "@/auth";
import { canAccessMachineProduction } from "@/lib/rbac";
import "@/components/machine-production/machine-production.css";

export default async function MachineProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const allowed =
    !!session?.user && canAccessMachineProduction(session.user.globalRole, { canMachineSupervise: session.user.canMachineSupervise });

  if (!allowed) {
    return (
      <div className="mp-denied">
        <h1>Access Denied</h1>
        <p>
          Machine Production is available to Supervisors and Admins only.
        </p>
      </div>
    );
  }

  return children;
}
