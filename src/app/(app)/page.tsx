import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import {
  canEnterData,
  canViewPnl,
  getAccessiblePlantIds,
  isMachineSupervisorOnly,
  isSuperAdmin,
  seesOwnEntriesOnly,
} from "@/lib/rbac";
import { resolveSelectedPlantId } from "@/lib/selected-plant";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { MachineProductionHome } from "@/components/machine-production/MachineProductionHome";
import { getMachineProductionHomeMetrics } from "@/lib/machine-production/home-metrics";
import {
  type TodayModuleStatus,
  type ShiftModulesMap,
} from "@/components/today/TodayHub";
import { computeDayShiftCompletions } from "@/lib/shift-completion";
import { refreshDailyStatusForDate } from "@/lib/daily-status";
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

  const user = session.user;
  if (isMachineSupervisorOnly(user.globalRole)) {
    const metrics = await getMachineProductionHomeMetrics();
    return <MachineProductionHome metrics={metrics} />;
  }

  const superAdmin = isSuperAdmin(user.globalRole);
  const plantIds = await getAccessiblePlantIds(user.id);

  const selectedPlantId = await resolveSelectedPlantId(user.id, {
    isSuperAdmin: superAdmin,
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
  const showPnl = canViewPnl(user.globalRole);
  const dateStr = todayDateString();

  const ownEntriesOnly = seesOwnEntriesOnly(user.globalRole);
  const metrics = await getDashboardMetrics(scopedPlantIds, {
    includePnl: showPnl,
    enteredById: ownEntriesOnly ? user.id : undefined,
    approvedOnly: false,
    period,
  });
  const showNet = showPnl && metrics.mtdNetProfit != null;

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

  const machineProductionMetrics = user.canMachineSupervise
    ? await getMachineProductionHomeMetrics()
    : null;

  return (
    <DashboardHome
      metrics={metrics}
      period={period}
      dateStr={dateStr}
      canEnter={canEnterData(user.globalRole)}
      showNet={showNet}
      plant={primary}
      shiftModules={shiftModules}
      scope={primary ? "plant" : "org"}
      machineProductionMetrics={machineProductionMetrics}
      userRole={user.globalRole}
      pendingApprovals={[]}
    />
  );
}
