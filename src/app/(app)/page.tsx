import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import {
  canEnterData,
  canViewPnl,
  getAccessiblePlantIds,
  isSuperAdmin,
} from "@/lib/rbac";
import {
  needsPlantSelection,
  resolveSelectedPlantId,
} from "@/lib/selected-plant";
import { DashboardHome } from "@/components/dashboard/DashboardHome";
import { maybeAwardCreditScore } from "@/lib/credit-score";
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
  const superAdmin = isSuperAdmin(user.globalRole);
  const plantIds = await getAccessiblePlantIds(user.id);

  if (!superAdmin && (await needsPlantSelection(user.id))) {
    redirect("/select-plant");
  }

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

  let creditScore: number | null = null;
  if (!superAdmin && primary) {
    await maybeAwardCreditScore(user.id, primary.id, parseDateOnly(dateStr));
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { creditScore: true },
    });
    creditScore = dbUser?.creditScore ?? null;
  }

  const ownEntriesOnly = !isSuperAdmin(user.globalRole);
  const metrics = await getDashboardMetrics(scopedPlantIds, {
    includePnl: showPnl,
    enteredById: ownEntriesOnly ? user.id : undefined,
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

  return (
    <DashboardHome
      metrics={metrics}
      dateStr={dateStr}
      canEnter={canEnterData(user.globalRole)}
      showNet={showNet}
      plant={primary}
      shiftModules={shiftModules}
      scope={primary ? "plant" : "org"}
      showCreditScore={!superAdmin}
      creditScore={creditScore}
    />
  );
}
