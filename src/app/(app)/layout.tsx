import { GlobalRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/db";
import {
  getAccessiblePlantIds,
  canAccessMachineProduction,
  canEnterData,
  canViewPnl,
  canViewPriceSheet,
  isAdminOrHead,
  isMachineSupervisorOnly,
  isPlantManager,
  isSuperAdmin,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { getPlantRmSummary, getPlantSegment } from "@/lib/plant-segments";

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

  // Dedicated Machine Supervisors skip plant-scoped shell chrome.
  // Plant Manager / Accountant hybrids keep the plant shell + Machine Production.
  if (role && isMachineSupervisorOnly(role)) {
    return (
      <AppShell
        navFlags={{
          showPnl: false,
          showPriceSheet: false,
          showMachineProduction: true,
          isMachineSupervisor: true,
          showAdmin: false,
          showSuper: false,
          isManager: false,
          primaryPlantId: null,
          showSwitchPlant: false,
          selectedPlantName: null,
        }}
        user={{
          name: user.name ?? null,
          email: user.email ?? "",
          role: user.globalRole,
        }}
        canEnter={false}
        plants={[]}
        currentPlantId={null}
        allowAllPlants={false}
      >
        {children}
      </AppShell>
    );
  }

  const plantIds = user ? await getAccessiblePlantIds(user.id) : [];
  const selectedPlantId = user
    ? await resolveSelectedPlantId(user.id, { isSuperAdmin: superAdmin })
    : null;
  const primaryPlantId = selectedPlantId ?? plantIds[0] ?? null;

  const switchablePlantsRaw =
    user && (plantIds.length >= 1 || superAdmin)
      ? await prisma.plant.findMany({
          where: {
            ...(superAdmin ? { isActive: true } : { id: { in: plantIds }, isActive: true }),
          },
          select: { id: true, name: true, code: true },
        })
      : [];

  const switchablePlants = switchablePlantsRaw
    .map((p) => ({
      ...p,
      rmSummary: getPlantRmSummary(p.code),
      sortOrder: getPlantSegment(p.code)?.sortOrder ?? 99,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const selectedPlant =
    selectedPlantId && user
      ? await prisma.plant.findUnique({
          where: { id: selectedPlantId },
          select: { id: true, name: true, code: true },
        })
      : null;

  const showPnl = role ? canViewPnl(role) : false;
  const showPriceSheet =
    !!user &&
    (user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user));
  const showMachineProduction = role
    ? canAccessMachineProduction(role, {
        canMachineSupervise: Boolean(user.canMachineSupervise),
      })
    : false;
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
        showMachineProduction,
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
      entryPlant={selectedPlant}
    >
      {children}
    </AppShell>
  );
}
