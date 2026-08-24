import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { canAccessPlant, canViewPnl } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import {
  formatPlantManagerLabel,
  getPlantManagerNames,
} from "@/lib/plant-managers";
import { PnlReportsShell } from "@/components/pnl/PnlReportsShell";

type PageProps = {
  params: Promise<{ plantId: string }>;
};

export default async function PlantPnlPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const t = await getTranslations("pnl");

  if (!canViewPnl(session.user.globalRole)) {
    return (
      <div>
        <h1 className="page-title">{t("hiddenTitle")}</h1>
        <p className="page-sub">{t("hiddenBody")}</p>
      </div>
    );
  }

  const { plantId } = await params;
  const allowed = await canAccessPlant(session.user.id, plantId);
  if (!allowed) {
    return (
      <div>
        <h1 className="page-title">{t("accessDenied")}</h1>
        <p className="page-sub">{t("accessDeniedBody")}</p>
      </div>
    );
  }

  const plant = await prisma.plant.findUnique({
    where: { id: plantId },
    select: { id: true, name: true, code: true },
  });

  if (!plant) {
    return (
      <div>
        <h1 className="page-title">{t("plantNotFound")}</h1>
      </div>
    );
  }

  const isSuperAdmin = session.user.globalRole === "SUPER_ADMIN";
  const managerNames = await getPlantManagerNames(plant.id);
  const plantManagerName = formatPlantManagerLabel(managerNames);

  return (
    <PnlReportsShell
      plantId={plant.id}
      plantName={plant.name}
      plantCode={plant.code}
      plantManagerName={plantManagerName}
      isSuperAdmin={isSuperAdmin}
    />
  );
}
