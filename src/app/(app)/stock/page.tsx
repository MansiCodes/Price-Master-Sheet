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
import { QUAD_SIGNAL_STOCK_RAW_MATERIALS } from "@/lib/plant-catalogs";
import {
  buildCableStockStatus,
  buildRawMaterialStockStatus,
} from "@/lib/stock-production-status";
import type {
  CableStockStatusBlock,
  RawMaterialStockRow,
  SharedInsulationStatus,
} from "@/lib/stock-production-status";
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
        <p className="page-sub">Select a plant to view stock status.</p>
      </div>
    );
  }

  const plant = await prisma.plant.findUnique({
    where: { id: selectedPlantId },
    select: { id: true, code: true, name: true },
  });

  if (!plant || !isQuadSignalPlant(plant.code)) {
    redirect("/");
  }

  const today = todayDateString();
  const date =
    dateStr && dateOnlyRegex.test(dateStr) && dateStr <= today
      ? dateStr
      : today;
  const day = parseDateOnly(date);

  const tab = tabParam === "raw" ? "raw" : "cable";

  let cableBlocks: CableStockStatusBlock[] = [];
  let sharedInsulation: SharedInsulationStatus | null = null;
  let quadInsulation: SharedInsulationStatus | null = null;
  let rawRows: RawMaterialStockRow[] = [];

  try {
    const reportIds = await resolveReportPlantIds(selectedPlantId);
    const pScope = plantIdFilter(reportIds);
    const qsFgWhere = {
      ...pScope,
      category: "FG" as const,
      date: { lte: day },
      notes: { startsWith: "QSSTOCK:" },
    };
    const qsSelect = {
      id: true,
      date: true,
      createdAt: true,
      itemName: true,
      notes: true,
    } as const;

    const [cableEntries, quadEntries, rmEntries] = await Promise.all([
      prisma.stockEntry.findMany({
        where: qsFgWhere,
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 2500,
        select: qsSelect,
      }),
      prisma.stockEntry.findMany({
        where: {
          ...qsFgWhere,
          itemName: { contains: "Quad", mode: "insensitive" },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 400,
        select: qsSelect,
      }),
      prisma.stockEntry.findMany({
        where: {
          ...pScope,
          category: "RM",
          date: { lte: day },
          notes: { startsWith: "QSSTOCK:" },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 300,
        select: {
          itemName: true,
          date: true,
          quantity: true,
          unit: true,
          rate: true,
          notes: true,
        },
      }),
    ]);

    const seenIds = new Set<string>();
    const mergedCableEntries = [];
    for (const row of [...quadEntries, ...cableEntries]) {
      if (seenIds.has(row.id)) continue;
      seenIds.add(row.id);
      mergedCableEntries.push(row);
    }
    mergedCableEntries.sort((a, b) => {
      const byDate = b.date.getTime() - a.date.getTime();
      if (byDate !== 0) return byDate;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const built = buildCableStockStatus(mergedCableEntries);
    cableBlocks = built.blocks;
    sharedInsulation = built.sharedInsulation;
    quadInsulation = built.quadInsulation;
    rawRows = buildRawMaterialStockStatus(
      QUAD_SIGNAL_STOCK_RAW_MATERIALS,
      rmEntries,
    );
  } catch (err) {
    // Keep Stock page up even if one bad QSSTOCK row / DB hiccup occurs.
    console.error("[stock-page] failed to load stock status", err);
  }

  return (
    <StockStatusClient
      plantId={selectedPlantId}
      date={date}
      tab={tab}
      cableBlocks={cableBlocks}
      sharedInsulation={sharedInsulation}
      quadInsulation={quadInsulation}
      rawRows={rawRows}
    />
  );
}
