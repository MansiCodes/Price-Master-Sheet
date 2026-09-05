import { GlobalRole } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Active Plant Managers assigned to a plant (via UserPlantRole).
 */
export async function getPlantManagerNames(
  plantId: string,
): Promise<string[]> {
  const rows = await prisma.userPlantRole.findMany({
    where: {
      plantId,
      user: {
        isActive: true,
        globalRole: GlobalRole.PLANT_MANAGER,
      },
    },
    select: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const names: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const label = row.user.name?.trim() || row.user.email;
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    names.push(label);
  }
  return names;
}

export function formatPlantManagerLabel(names: string[]): string | null {
  if (names.length === 0) return null;
  return names.join(", ");
}
