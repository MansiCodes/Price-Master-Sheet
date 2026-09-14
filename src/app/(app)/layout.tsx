import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/shell/AppShell";
import { prisma } from "@/lib/db";
import {
  getAccessiblePlantIds,
  canAccessMachineProduction,
  canAdminMachineProduction,
  canApproveEntries,
  canEnterData,
  canViewPnl,
  canViewPriceSheet,
  canViewUsersDirectory,
  hasGlobalPlantAccess,
  isAccountantPnlLimited,
  isAdminOrHead,
  isMachineSupervisorOnly,
  isPlantManager,
  isSuperAdmin,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { getPlantRmSummary, getPlantSegment, getPlantDisplayName, isLegacyMergedPlantCode } from "@/lib/plant-segments";
import { isQuadSignalPlant } from "@/lib/plant-layout";

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
  // Fresh flags from DB — JWT can lag after Extra access edits until re-login.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      canAccessStock: true,
      canMachineSupervise: true,
      canAdminMachineProduction: true,
      canViewPriceSheet: true,
      globalRole: true,
      name: true,
      email: true,
      isActive: true,
    },
  });
  if (!dbUser || !dbUser.isActive) {
    redirect("/login");
  }
  const user = {
    ...session.user,
    globalRole: dbUser.globalRole,
    canAccessStock: Boolean(dbUser.canAccessStock),
    canMachineSupervise: Boolean(dbUser.canMachineSupervise),
    canAdminMachineProduction: Boolean(dbUser.canAdminMachineProduction),
    canViewPriceSheet: Boolean(dbUser.canViewPriceSheet),
    name: dbUser.name ?? session.user.name,
    email: dbUser.email ?? session.user.email,
  };
  const role = user.globalRole;
  const superAdmin = role ? isSuperAdmin(role) : false;
  const globalPlantAccess = role ? hasGlobalPlantAccess(role) : false;

  // Dedicated Machine Supervisors skip plant-scoped shell chrome.
  // Plant Manager / Accountant hybrids keep the plant shell + Machine Production.
  const mpOpts = {
    canMachineSupervise: Boolean(user.canMachineSupervise),
    canAdminMachineProduction: Boolean(user.canAdminMachineProduction),
  };
  const mpAdmin = role ? canAdminMachineProduction(role, mpOpts) : false;
  // Pure Machine Supervisors without Stock extra keep the slim MS shell.
  // With Stock extra they use the plant shell (Stock page + Today's Entry stock).
  if (role && isMachineSupervisorOnly(role) && !user.canAccessStock) {
    return (
      <AppShell
        navFlags={{
          showPnl: false,
          showPriceSheet: false,
          showMachineProduction: true,
          isMachineSupervisor: true,
          showAdmin: false,
          showUsers: false,
          showApprovals: false,
          showStock: false,
          showSuper: false,
          showMpAdmin: mpAdmin,
          isManager: false,
          primaryPlantId: null,
          showSwitchPlant: false,
          selectedPlantName: null,
        }}
        user={{
          name: user.name ?? null,
          email: user.email ?? "",
          role: user.globalRole,
          canAccessStock: false,
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

  const plantIdsRaw = user ? await getAccessiblePlantIds(user.id) : [];
  // Machine Supervisor + Stock must have Quad plant assignment; repair empty roles.
  let plantIds = plantIdsRaw;
  if (
    role &&
    isMachineSupervisorOnly(role) &&
    user.canAccessStock &&
    plantIds.length === 0
  ) {
    const quad = await prisma.plant.findFirst({
      where: {
        isActive: true,
        OR: [
          { code: { equals: "QUAD", mode: "insensitive" } },
          { code: { equals: "QUADSIGNAL", mode: "insensitive" } },
          { code: { equals: "SIGNALLING", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    if (quad) {
      await prisma.userPlantRole.upsert({
        where: {
          userId_plantId: { userId: user.id, plantId: quad.id },
        },
        create: {
          userId: user.id,
          plantId: quad.id,
          role: user.globalRole,
        },
        update: {},
      });
      plantIds = [quad.id];
    }
  }
  const selectedPlantId = user
    ? await resolveSelectedPlantId(user.id, {
        hasGlobalPlantAccess: globalPlantAccess,
      })
    : null;
  const primaryPlantId = selectedPlantId ?? plantIds[0] ?? null;

  const switchablePlantsRaw =
    user && (plantIds.length >= 1 || globalPlantAccess)
      ? await prisma.plant.findMany({
          where: {
            ...(globalPlantAccess
              ? { isActive: true }
              : { id: { in: plantIds }, isActive: true }),
          },
          select: { id: true, name: true, code: true },
        })
      : [];

  const switchablePlants = switchablePlantsRaw
    .filter((p) => !isLegacyMergedPlantCode(p.code))
    .map((p) => ({
      ...p,
      name: getPlantDisplayName(p.code, p.name),
      rmSummary: getPlantRmSummary(p.code),
      sortOrder: getPlantSegment(p.code)?.sortOrder ?? 99,
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const selectedPlantRaw =
    selectedPlantId && user
      ? await prisma.plant.findUnique({
          where: { id: selectedPlantId },
          select: { id: true, name: true, code: true },
        })
      : null;
  const selectedPlant = selectedPlantRaw
    ? {
        ...selectedPlantRaw,
        name: getPlantDisplayName(selectedPlantRaw.code, selectedPlantRaw.name),
      }
    : null;

  const showPnl =
    role && !isMachineSupervisorOnly(role) ? canViewPnl(role) : false;
  const pnlSalesPurchaseOnly = role ? isAccountantPnlLimited(role) : false;
  const showPriceSheet =
    !!user &&
    !isMachineSupervisorOnly(role) &&
    (hasGlobalPlantAccess(user.globalRole) || canViewPriceSheet(user));
  const showMachineProduction = role
    ? canAccessMachineProduction(role, mpOpts)
    : false;
  const showAdmin = role && !isMachineSupervisorOnly(role) ? isAdminOrHead(role) : false;
  const showUsers =
    role && !isMachineSupervisorOnly(role)
      ? canViewUsersDirectory(role)
      : false;
  const showApprovals =
    role && !isMachineSupervisorOnly(role) ? canApproveEntries(role) : false;
  const showStock =
    !!selectedPlantRaw &&
    isQuadSignalPlant(selectedPlantRaw.code) &&
    (role !== "MACHINE_SUPERVISOR" || Boolean(user?.canAccessStock));
  const showSuper = role ? isSuperAdmin(role) : false;
  const isManager = role ? isPlantManager(role) : false;
  const canEnter = role ? canEnterData(role) : false;
  const showSwitchPlant = plantIds.length > 1;

  return (
    <AppShell
      navFlags={{
        showPnl,
        pnlSalesPurchaseOnly,
        showPriceSheet,
        showMachineProduction,
        isMachineSupervisor: role ? isMachineSupervisorOnly(role) : false,
        showAdmin,
        showUsers,
        showApprovals,
        showStock,
        showSuper,
        showMpAdmin: mpAdmin,
        isManager,
        primaryPlantId,
        showSwitchPlant,
        selectedPlantName: selectedPlant?.name ?? null,
      }}
      user={
        user
          ? {
              name: user.name ?? null,
              email: user.email ?? "",
              role: user.globalRole,
              canAccessStock: Boolean(user.canAccessStock),
            }
          : null
      }
      canEnter={canEnter}
      plants={switchablePlants}
      currentPlantId={selectedPlantId}
      allowAllPlants={false}
      entryPlant={selectedPlant}
    >
      {children}
    </AppShell>
  );
}
