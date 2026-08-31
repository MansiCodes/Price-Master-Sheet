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

function statusFields(
  status:
    | {
        id: string;
        purchaseFilled: boolean;
        saleFilled: boolean;
        stockFilled: boolean;
        productionFilled: boolean;
        pettyCashFilled: boolean;
        allComplete: boolean;
        completedAt: Date | null;
        approvedByHead: boolean;
        approvedByAdmin: boolean;
      }
    | undefined,
) {
  return {
    id: status?.id ?? null,
    purchaseFilled: status?.purchaseFilled ?? false,
    saleFilled: status?.saleFilled ?? false,
    stockFilled: status?.stockFilled ?? false,
    productionFilled: status?.productionFilled ?? false,
    pettyCashFilled: status?.pettyCashFilled ?? false,
    allComplete: status?.allComplete ?? false,
    completedAt: status?.completedAt ?? null,
    approvedByHead: status?.approvedByHead ?? false,
    approvedByAdmin: status?.approvedByAdmin ?? false,
  };
}

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

  const byPlantShift = new Map<
    string,
    { DAY?: (typeof statuses)[number]; NIGHT?: (typeof statuses)[number] }
  >();
  for (const s of statuses) {
    const bucket = byPlantShift.get(s.plantId) ?? {};
    if (s.shift === "DAY") bucket.DAY = s;
    else bucket.NIGHT = s;
    byPlantShift.set(s.plantId, bucket);
  }

  const rows = plants.map((plant) => {
    const bucket = byPlantShift.get(plant.id);
    const dayStatus = statusFields(bucket?.DAY);
    const nightStatus = statusFields(bucket?.NIGHT);
    return {
      plant,
      shifts: {
        DAY: dayStatus,
        NIGHT: nightStatus,
      },
      allComplete: dayStatus.allComplete && nightStatus.allComplete,
    };
  });

  return NextResponse.json({
    date: dateStr,
    plants: rows,
    completeCount: rows.filter((r) => r.allComplete).length,
    totalCount: rows.length,
  });
}
