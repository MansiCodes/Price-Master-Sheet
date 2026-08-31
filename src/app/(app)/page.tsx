import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { GlobalRole } from "@prisma/client";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import {
  canEnterData,
  canViewPnl,
  getAccessiblePlantIds,
  isMachineSupervisorOnly,
  isSuperAdmin,
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

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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

  const primary = plants[0] ?? null;
  const showPnl = canViewPnl(user.globalRole);
  const dateStr = todayDateString();

  const ownEntriesOnly = user.globalRole !== GlobalRole.SUPER_ADMIN && user.globalRole !== GlobalRole.BUSINESS_HEAD;
  const metrics = await getDashboardMetrics(scopedPlantIds, {
    includePnl: showPnl,
    enteredById: ownEntriesOnly ? user.id : undefined,
    approvedOnly: !ownEntriesOnly,
  });
  const showNet = showPnl && metrics.mtdNetProfit != null;

  let shiftModules = emptyShiftModules();

  if (primary) {
    const day = parseDateOnly(dateStr);
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

  const pendingApprovals = (user.globalRole === GlobalRole.SUPER_ADMIN || user.globalRole === GlobalRole.BUSINESS_HEAD)
    ? await prisma.dailyEntryStatus.findMany({
        where: {
          plantId: { in: plantIds },
          allComplete: true,
          ...(user.globalRole === GlobalRole.BUSINESS_HEAD
            ? { approvedByHead: false }
            : { approvedByHead: true, approvedByAdmin: false }),
        },
        include: {
          plant: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 20,
      })
    : [];

  const serializedApprovals = pendingApprovals.map((p) => ({
    id: p.id,
    plantId: p.plantId,
    date: p.date.toISOString(),
    shift: p.shift,
    approvedByHead: p.approvedByHead,
    approvedByAdmin: p.approvedByAdmin,
    plant: { name: p.plant.name },
  }));

  return (
    <DashboardHome
      metrics={metrics}
      dateStr={dateStr}
      canEnter={canEnterData(user.globalRole)}
      showNet={showNet}
      plant={primary}
      shiftModules={shiftModules}
      scope={primary ? "plant" : "org"}
      machineProductionMetrics={machineProductionMetrics}
      userRole={user.globalRole}
      pendingApprovals={serializedApprovals}
    />
  );
}
