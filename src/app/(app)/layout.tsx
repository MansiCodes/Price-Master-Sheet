import { GlobalRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/db";
import {
  getAccessiblePlantIds,
  canEnterData,
  canViewPnl,
  canViewPriceSheet,
  isAdminOrHead,
  isPlantManager,
  isSuperAdmin,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const user = session.user;
  const role = user.globalRole;
  const superAdmin = role ? isSuperAdmin(role) : false;
  const plantIds = user ? await getAccessiblePlantIds(user.id) : [];
  const selectedPlantId = user
    ? await resolveSelectedPlantId(user.id, { isSuperAdmin: false })
    : null;
  const primaryPlantId = selectedPlantId ?? plantIds[0] ?? null;

  const switchablePlants =
    user && plantIds.length > 1
      ? await prisma.plant.findMany({
          where: { id: { in: plantIds }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : [];

  const selectedPlant =
    selectedPlantId && user
      ? await prisma.plant.findUnique({
          where: { id: selectedPlantId },
          select: { name: true },
        })
      : null;

  const showPnl = role ? canViewPnl(role) : false;
  const showPriceSheet =
    !!user &&
    (user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user));
  const showAdmin = role ? isAdminOrHead(role) : false;
  const showSuper = role ? isSuperAdmin(role) : false;
  const isManager = role ? isPlantManager(role) : false;
  const canEnter = role ? canEnterData(role) : false;
  const showSwitchPlant = plantIds.length > 1;

  return (
    <AppShell
      navFlags={{
        showPnl,
        showPriceSheet,
        showAdmin,
        showSuper,
        isManager,
        primaryPlantId,
        showSwitchPlant,
        selectedPlantName: selectedPlant?.name ?? null,
      }}
      user={
        user
          ? { name: user.name ?? null, email: user.email ?? "", role: user.globalRole }
          : null
      }
      canEnter={canEnter}
      plants={switchablePlants}
      currentPlantId={selectedPlantId}
      allowAllPlants={superAdmin}
    >
      {children}
    </AppShell>
  );
}
