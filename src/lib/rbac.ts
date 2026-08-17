import { GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Role enum matching Prisma GlobalRole */
export const Role = GlobalRole;
export type Role = GlobalRole;

export type PriceSheetUser = {
  canViewPriceSheet: boolean;
};

const PNL_VIEW_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.VIEWER,
]);

const DATA_ENTRY_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
  GlobalRole.ACCOUNTANT,
]);

export function canViewPnl(role: GlobalRole | Role): boolean {
  return PNL_VIEW_ROLES.has(role);
}

export function canEnterData(role: GlobalRole | Role): boolean {
  return DATA_ENTRY_ROLES.has(role);
}

export function canViewPriceSheet(user: PriceSheetUser): boolean {
  return Boolean(user?.canViewPriceSheet);
}

export function isSuperAdmin(role: GlobalRole | Role): boolean {
  return role === GlobalRole.SUPER_ADMIN;
}

export function isPlantManager(role: GlobalRole | Role): boolean {
  return role === GlobalRole.PLANT_MANAGER;
}

export function isAdminOrHead(role: GlobalRole | Role): boolean {
  return (
    role === GlobalRole.SUPER_ADMIN || role === GlobalRole.BUSINESS_HEAD
  );
}

export async function canAccessPlant(
  userId: string,
  plantId: string,
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      globalRole: true,
      isActive: true,
      plantRoles: {
        where: { plantId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive) return false;
  if (user.globalRole === GlobalRole.SUPER_ADMIN) return true;
  return user.plantRoles.length > 0;
}

export async function getAccessiblePlantIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      globalRole: true,
      isActive: true,
      plantRoles: { select: { plantId: true } },
    },
  });

  if (!user || !user.isActive) return [];

  if (user.globalRole === GlobalRole.SUPER_ADMIN) {
    const plants = await prisma.plant.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    return plants.map((p) => p.id);
  }

  if (user.plantRoles.length > 0) {
    return user.plantRoles.map((r) => r.plantId);
  }

  // Plant managers created without a plant still need a dashboard + today's report.
  if (user.globalRole === GlobalRole.PLANT_MANAGER) {
    const plant = await prisma.plant.findFirst({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true },
    });
    if (!plant) return [];
    await prisma.userPlantRole.upsert({
      where: { userId_plantId: { userId, plantId: plant.id } },
      create: {
        userId,
        plantId: plant.id,
        role: GlobalRole.PLANT_MANAGER,
      },
      update: {},
    });
    return [plant.id];
  }

  return [];
}
