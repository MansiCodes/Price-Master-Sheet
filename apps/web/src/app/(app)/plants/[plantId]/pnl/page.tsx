import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canAccessPlant, canViewPnl } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { PnlClient } from "./pnl-client";

type PageProps = {
  params: Promise<{ plantId: string }>;
};

export default async function PlantPnlPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!canViewPnl(session.user.globalRole)) {
    return (
      <div>
        <h1 className="page-title">P&amp;L hidden</h1>
        <p className="page-sub">
          Your role cannot view plant profit &amp; loss.
        </p>
      </div>
    );
  }

  const { plantId } = await params;
  const allowed = await canAccessPlant(session.user.id, plantId);
  if (!allowed) {
    return (
      <div>
        <h1 className="page-title">Access denied</h1>
        <p className="page-sub">You do not have access to this plant.</p>
      </div>
    );
  }

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true },
  });

  if (!plant) {
    return (
      <div>
        <h1 className="page-title">Plant not found</h1>
      </div>
    );
  }

  return (
    <div>
      <PnlClient plantId={plant.id} />
    </div>
  );
}
