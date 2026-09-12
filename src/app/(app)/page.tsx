import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import {
  canApproveEntries,
  canEnterData,
  canViewFullPnl,
  getAccessiblePlantIds,
  hasGlobalPlantAccess,
  isMachineSupervisorOnly,
  seesOwnEntriesOnly,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { getPlantDisplayName } from "@/lib/plant-segments";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { MachineProductionHome } from "@/components/machine-production/MachineProductionHome";
import { getMachineProductionHomeMetrics } from "@/lib/machine-production/home-metrics";
import {
  type TodayModuleStatus,
  type ShiftModulesMap,
} from "@/components/today/TodayHub";
import { computeDayShiftCompletions } from "@/lib/shift-completion";
import { refreshDailyStatusForDate } from "@/lib/daily-status";
import { getEntryApprovalStartDate } from "@/lib/entry-approval";
import "@/components/dashboard/dashboard.css";

const MODULES: { key: TodayModuleStatus["key"]; label: string }[] = [
  { key: "purchaseFilled", label: "Purchase" },
  { key: "saleFilled", label: "Sales" },
  { key: "stockFilled", label: "Stock" },
  { key: "productionFilled", label: "Production" },
  { key: "pettyCashFilled", label: "Expense" },
];

function emptyShiftModules(): ShiftModulesMap {
  const empty = MODULES.map((m) => ({
    ...m,
    filled: false,
    done: 0,
    total: 1,
  }));
  return { DAY: empty, NIGHT: empty };
}

function toModuleList(
  modules: Awaited<
    ReturnType<typeof computeDayShiftCompletions>
  >["DAY"]["modules"],
): TodayModuleStatus[] {
  return modules.map((mod) => ({
    key: mod.key,
    label: mod.label,
    filled: mod.filled,
    done: mod.filled ? 1 : 0,
    total: 1,
  }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { period: periodParam } = await searchParams;
  const period = parseDashboardPeriod(periodParam);

  const dbFlags = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { canAccessStock: true, globalRole: true, isActive: true },
  });
  if (!dbFlags?.isActive) redirect("/login");

  const user = {
    ...session.user,
    globalRole: dbFlags.globalRole,
    canAccessStock: Boolean(dbFlags.canAccessStock),
  };

  // Stock-enabled Machine Supervisors keep MP home; layout provides Stock + Today's Entry.
  if (isMachineSupervisorOnly(user.globalRole)) {
    const metrics = await getMachineProductionHomeMetrics();
    return <MachineProductionHome metrics={metrics} />;
  }

  const globalPlantAccess = hasGlobalPlantAccess(user.globalRole);
  const plantIds = await getAccessiblePlantIds(user.id);

  const selectedPlantId = await resolveSelectedPlantId(user.id, {
    hasGlobalPlantAccess: globalPlantAccess,
  });

  const scopedPlantIds = selectedPlantId ? [selectedPlantId] : plantIds;

  const plants =
    scopedPlantIds.length > 0
      ? await prisma.plant.findMany({
          where: { id: { in: scopedPlantIds }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : [];

  const primary = selectedPlantId
    ? (plants.find((p) => p.id === selectedPlantId) ?? null)
    : plants.length === 1
      ? plants[0]
      : null;
  const showFullPnl = canViewFullPnl(user.globalRole);
  const dateStr = todayDateString();

  const ownEntriesOnly = seesOwnEntriesOnly(user.globalRole);
  const metrics = await getDashboardMetrics(scopedPlantIds, {
    includePnl: showFullPnl,
    enteredById: ownEntriesOnly ? user.id : undefined,
    approvedOnly: false,
    period,
  });
  const showNet = showFullPnl && metrics.mtdNetProfit != null;

  let shiftModules = emptyShiftModules();

  if (primary) {
    const day = parseDateOnly(dateStr);
    await refreshDailyStatusForDate(primary.id, day);
    const completions = await computeDayShiftCompletions({
      plantId: primary.id,
      date: day,
      enteredById: ownEntriesOnly ? user.id : undefined,
    });
    shiftModules = {
      DAY: toModuleList(completions.DAY.modules),
      NIGHT: toModuleList(completions.NIGHT.modules),
    };
  }

  const machineProductionMetrics =
    user.canMachineSupervise || user.canAdminMachineProduction
      ? await getMachineProductionHomeMetrics()
      : null;

  const pendingApprovals =
    canApproveEntries(user.globalRole) && scopedPlantIds.length > 0
      ? (
          await prisma.dailyEntryStatus.findMany({
            where: {
              plantId: { in: scopedPlantIds },
              allComplete: true,
              approvedByHead: false,
              rejectedByHead: false,
              date: { gte: getEntryApprovalStartDate() },
            },
            include: {
              plant: { select: { name: true, code: true } },
            },
            orderBy: [{ date: "desc" }, { shift: "asc" }],
            take: 50,
          })
        ).map((row) => ({
          id: row.id,
          plantId: row.plantId,
          date: row.date.toISOString(),
          shift: row.shift,
          approvedByHead: row.approvedByHead,
          approvedByAdmin: row.approvedByAdmin,
          plant: {
            name: getPlantDisplayName(row.plant.code, row.plant.name),
          },
        }))
      : [];

  return (
    <DashboardHome
      metrics={metrics}
      period={period}
      dateStr={dateStr}
      canEnter={canEnterData(user.globalRole)}
      showNet={showNet}
      plant={
        primary
          ? {
              ...primary,
              name: getPlantDisplayName(primary.code, primary.name),
            }
          : null
      }
      shiftModules={shiftModules}
      scope={primary ? "plant" : "org"}
      machineProductionMetrics={machineProductionMetrics}
      userRole={user.globalRole}
      canAccessStock={Boolean(user.canAccessStock)}
      pendingApprovals={pendingApprovals}
    />
  );
}
