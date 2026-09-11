import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { dateOnlyRegex, parseDateOnly, todayDateString } from "@/lib/dates";
import {
  getAccessiblePlantIds,
  hasGlobalPlantAccess,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { isQuadSignalPlant } from "@/lib/plant-layout";
import { plantIdFilter, resolveReportPlantIds } from "@/lib/plant-merge";
import { buildCableStockStatus } from "@/lib/stock-production-status";
import { StockStatusClient } from "@/components/stock/StockStatusClient";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { date: dateStr, tab: tabParam } = await searchParams;
  const plantIds = await getAccessiblePlantIds(session.user.id);
  const selectedPlantId = await resolveSelectedPlantId(session.user.id, {
    hasGlobalPlantAccess: hasGlobalPlantAccess(session.user.globalRole),
  });

  if (plantIds.length === 0 || !selectedPlantId) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1 className="page-title">Stock</h1>
        <p className="page-sub">Select a plant to view stock status.</p>
      </div>
    );
  }

  const plant = await prisma.plant.findUnique({
    where: { id: selectedPlantId },
    select: { id: true, code: true, name: true },
  });

  const today = todayDateString();
  const date =
    dateStr && dateOnlyRegex.test(dateStr) && dateStr <= today
      ? dateStr
      : today;
  const day = parseDateOnly(date);
  const endOfDay = new Date(day);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const tab = tabParam === "raw" ? "raw" : "cable";

  let cableBlocks: ReturnType<typeof buildCableStockStatus> = [];

  if (plant && isQuadSignalPlant(plant.code)) {
    const reportIds = await resolveReportPlantIds(selectedPlantId);
    const pScope = plantIdFilter(reportIds);
    const rows = await prisma.stockEntry.findMany({
      where: {
        ...pScope,
        category: "FG",
        date: { lte: endOfDay },
        notes: { startsWith: "QSSTOCK:" },
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 200,
      select: {
        id: true,
        date: true,
        itemName: true,
        notes: true,
      },
    });
    cableBlocks = buildCableStockStatus(rows);
  }

  return (
    <StockStatusClient
      date={date}
      tab={tab}
      cableBlocks={cableBlocks}
    />
  );
}
