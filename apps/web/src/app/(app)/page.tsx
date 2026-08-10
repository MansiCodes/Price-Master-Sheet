import Link from "next/link";
import { redirect } from "next/navigation";
import { GlobalRole } from "@prisma/client";
import { auth } from "@/auth";
import { refreshDailyStatus } from "@/lib/daily-status";
import { parseDateOnly, todayDateString } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getDashboardMetrics } from "@/lib/dashboard/metrics";
import {
  canEnterData,
  canViewPnl,
  canViewPriceSheet,
  getAccessiblePlantIds,
} from "@/lib/rbac";
import { SparkBars } from "@/components/dashboard/Charts";
import { formatMoney, KpiCard } from "@/components/dashboard/KpiKra";
import {
  TodayHub,
  type TodayModuleStatus,
} from "@/components/today/TodayHub";
import "@/components/dashboard/dashboard.css";

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

const MODULES: { key: TodayModuleStatus["key"]; label: string }[] = [
  { key: "purchaseFilled", label: "Purchase" },
  { key: "saleFilled", label: "Sales" },
  { key: "manpowerFilled", label: "Production" },
  { key: "pettyCashFilled", label: "Expense" },
  { key: "stockFilled", label: "Stock check" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const plantIds = await getAccessiblePlantIds(user.id);
  const plants =
    plantIds.length > 0
      ? await prisma.plant.findMany({
          where: { id: { in: plantIds }, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        })
      : [];

  const primary = plants[0] ?? null;
  const showPnl = canViewPnl(user.globalRole);
  const showPriceSheet =
    user.globalRole === GlobalRole.SUPER_ADMIN || canViewPriceSheet(user);
  const dateStr = todayDateString();

  const metrics = await getDashboardMetrics(plantIds, { includePnl: showPnl });

  let todayModules: TodayModuleStatus[] = MODULES.map((m) => ({
    ...m,
    filled: false,
  }));

  if (primary) {
    const day = parseDateOnly(dateStr);
    let status = await prisma.dailyEntryStatus.findUnique({
      where: { plantId_date: { plantId: primary.id, date: day } },
    });
    if (!status) {
      status = await refreshDailyStatus(primary.id, day);
    }
    todayModules = MODULES.map((mod) => ({
      key: mod.key,
      label: mod.label,
      filled: Boolean(status[mod.key]),
    }));
  }

  return (
    <div className="dashboard mis dash-merged">
      <section className="mis-kpi-grid" aria-label="Month metrics">
        <KpiCard
          label="Sales"
          value={formatMoney(metrics.mtdSales)}
          tone="teal"
          hint="Month to date"
        />
        <KpiCard
          label="Purchases"
          value={formatMoney(metrics.mtdPurchases)}
          tone="coral"
          hint="Month to date"
        />
        <KpiCard
          label="Stock value"
          value={formatMoney(metrics.mtdStockValue)}
          tone="violet"
          hint="Closing checks"
        />
        <KpiCard
          label="Production"
          value={`${metrics.mtdProductionQty.toLocaleString("en-IN")} units`}
          tone="amber"
          hint="Logged qty"
        />
        <KpiCard
          label="Manpower"
          value={formatMoney(metrics.mtdManpower)}
          tone="teal"
          hint="Month to date"
        />
        <KpiCard
          label="Expenses"
          value={formatMoney(metrics.mtdExpenses)}
          tone="coral"
          hint="Misc / petty"
        />
        {showPnl && metrics.mtdNetProfit != null ? (
          <KpiCard
            label="Net profit"
            value={formatMoney(metrics.mtdNetProfit)}
            tone={metrics.mtdNetProfit >= 0 ? "teal" : "coral"}
            hint="Live P&L"
          />
        ) : null}
      </section>

      <div className="dash-merged__body">
        <div className="dash-merged__today">
          {primary ? (
            <TodayHub
              plantId={primary.id}
              plantName={primary.name}
              plantCode={primary.code}
              date={dateStr}
              modules={todayModules}
              canEnter={canEnterData(user.globalRole)}
              embedded
            />
          ) : (
            <section className="mis-panel">
              <h2 className="section-label">Today&apos;s report</h2>
              <p className="page-sub" style={{ margin: 0 }}>
                No plant assigned to your account yet.
              </p>
            </section>
          )}
        </div>

        <div className="dash-merged__side">
          <section className="mis-panel">
            <h2 className="section-label">Daily report status</h2>
            <ul className="mis-day-list">
              {metrics.dailyReportRows.map((row) => (
                <li key={row.date} className="mis-day-row">
                  <span className="mis-day-row__date">{formatDay(row.date)}</span>
                  <span className="mis-day-row__score">
                    {row.completed}/{row.total}
                  </span>
                  <span
                    className={`mis-day-row__flag ${
                      row.allComplete
                        ? "is-ok"
                        : row.completed === 0
                          ? "is-empty"
                          : "is-warn"
                    }`}
                  >
                    {row.allComplete ? "✓" : row.completed === 0 ? "—" : "⚠"}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mis-panel">
            <div className="dash-panel__head">
              <h2 className="section-label" style={{ margin: 0 }}>
                7-day sales vs purchases
              </h2>
              <div className="legend">
                <span className="legend__item legend__item--teal">Sales</span>
                <span className="legend__item legend__item--coral">Purchases</span>
              </div>
            </div>
            <SparkBars
              sales={metrics.weekSeries.map((d) => d.sales)}
              purchases={metrics.weekSeries.map((d) => d.purchases)}
            />
          </section>

          {(showPriceSheet || showPnl) && (
            <section className="mis-panel mis-links">
              <h2 className="section-label">Reports</h2>
              <div className="mis-link-row">
                {showPriceSheet ? (
                  <Link href="/price-sheet" className="mis-link-chip mis-link-chip--amber">
                    Price Sheet
                  </Link>
                ) : null}
                {showPnl ? (
                  <Link
                    href="/plants/pnl/consolidated"
                    className="mis-link-chip mis-link-chip--teal"
                  >
                    Consolidated P&amp;L
                  </Link>
                ) : null}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
