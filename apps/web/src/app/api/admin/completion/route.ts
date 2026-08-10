import { NextResponse } from "next/server";
import { GlobalRole } from "@prisma/client";
import { requireSession } from "@/lib/api";
import { todayDateString, parseDateOnly } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getAccessiblePlantIds } from "@/lib/rbac";

const COMPLETION_ROLES: ReadonlySet<GlobalRole> = new Set([
  GlobalRole.SUPER_ADMIN,
  GlobalRole.BUSINESS_HEAD,
  GlobalRole.PLANT_MANAGER,
]);

export async function GET() {
  const session = await requireSession();
  if ("error" in session) return session.error;

  if (!COMPLETION_ROLES.has(session.user.globalRole)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const dateStr = todayDateString();
  const day = parseDateOnly(dateStr);
  const plantIds = await getAccessiblePlantIds(session.user.id);

  if (plantIds.length === 0) {
    return NextResponse.json({ date: dateStr, plants: [] });
  }

  const plants = await prisma.plant.findMany({
    where: { id: { in: plantIds }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  const statuses = await prisma.dailyEntryStatus.findMany({
    where: { plantId: { in: plantIds }, date: day },
  });

  const byPlant = new Map(statuses.map((s) => [s.plantId, s]));

  const rows = plants.map((plant) => {
    const status = byPlant.get(plant.id);
    return {
      plant,
      purchaseFilled: status?.purchaseFilled ?? false,
      saleFilled: status?.saleFilled ?? false,
      stockFilled: status?.stockFilled ?? false,
      manpowerFilled: status?.manpowerFilled ?? false,
      pettyCashFilled: status?.pettyCashFilled ?? false,
      allComplete: status?.allComplete ?? false,
      completedAt: status?.completedAt ?? null,
    };
  });

  return NextResponse.json({
    date: dateStr,
    plants: rows,
    completeCount: rows.filter((r) => r.allComplete).length,
    totalCount: rows.length,
  });
}
