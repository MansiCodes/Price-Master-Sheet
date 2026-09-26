import { GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hasGlobalPlantAccess } from "@/lib/rbac-checks";

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
  if (hasGlobalPlantAccess(user.globalRole)) return true;
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

  if (hasGlobalPlantAccess(user.globalRole)) {
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
