import { getTranslations, getLocale } from "next-intl/server";
import { WeekCompareChart } from "@/components/dashboard/Charts";
import { formatMoney, KpiCard } from "@/components/dashboard/KpiKra";
import {
  TodayHub,
  type ShiftModulesMap,
} from "@/components/today/TodayHub";
import { MachineProductionHome } from "@/components/machine-production/MachineProductionHome";
import type { DashboardMetrics } from "@/lib/dashboard/metrics";
import type { MpHomeMetrics } from "@/lib/machine-production/home-metrics";
import { localeToBcp47, type AppLocale } from "@/i18n/config";
import { PendingApprovalsTable } from "@/components/dashboard/PendingApprovalsTable";

function formatDay(dateStr: string, locale: AppLocale): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(localeToBcp47(locale), {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export async function DashboardHome({
  metrics,
  dateStr,
  canEnter,
  showNet,
  plant,
  shiftModules,
  scope,
  machineProductionMetrics = null,
  userRole = "",
  pendingApprovals = [],
}: {
  metrics: DashboardMetrics;
  dateStr: string;
  canEnter: boolean;
  showNet: boolean;
  plant: { id: string; name: string; code: string } | null;
  shiftModules: ShiftModulesMap;
  scope: "org" | "plant";
  machineProductionMetrics?: MpHomeMetrics | null;
  userRole?: string;
  pendingApprovals?: Array<{
    id: string;
    plantId: string;
    date: string;
    shift: string;
    approvedByHead: boolean;
    approvedByAdmin: boolean;
    plant: { name: string };
  }>;
}) {
  const t = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");
  const locale = (await getLocale()) as AppLocale;

  const kpiHint =
    scope === "plant" && plant
      ? t("monthToDatePlant", { plant: plant.name })
      : t("monthToDate");

  return (
    <div className="dashboard mis dash-merged">
      <section
        className="mis-kpi-grid mis-kpi-grid--six"
        aria-label={t("ariaMonthMetrics")}
      >
        <KpiCard
          label={t("sales")}
          value={formatMoney(metrics.mtdSales)}
          tone="teal"
          hint={kpiHint}
          icon="sales"
        />
        <KpiCard
          label={t("purchases")}
          value={formatMoney(metrics.mtdPurchases)}
          tone="teal"
          hint={kpiHint}
          icon="purchases"
        />
        <KpiCard
          label={t("stockValue")}
          value={formatMoney(metrics.mtdStockValue)}
          tone="teal"
          hint={
            scope === "plant" ? t("closingChecksPlant") : t("closingChecks")
          }
          icon="stock"
        />
        <KpiCard
          label={t("expenses")}
          value={formatMoney(metrics.mtdExpenses)}
          tone="teal"
          hint={kpiHint}
          icon="expenses"
        />
        {showNet ? (
          <KpiCard
            label={t("netProfit")}
            value={formatMoney(metrics.mtdNetProfit ?? 0)}
            tone="teal"
            hint={kpiHint}
            icon="profit"
          />
        ) : null}
      </section>

      <div className="dash-merged__body">
        <div className="dash-merged__today">
          {plant ? (
            <TodayHub
              plantId={plant.id}
              plantName={plant.name}
              plantCode={plant.code}
              date={dateStr}
              shiftModules={shiftModules}
              canEnter={canEnter}
              embedded
            />
          ) : (
            <section className="mis-panel">
              <h2 className="section-label">{tCommon("todaysEntry")}</h2>
              <p className="page-sub" style={{ margin: 0 }}>
                —
              </p>
            </section>
          )}
        </div>

        <div className="dash-merged__side">
          <section className="mis-panel">
            <h2 className="section-label">{t("weekCompare")}</h2>
            <ul className="mis-day-list">
              {metrics.dailyReportRows.map((row) => (
                <li
                  key={row.date}
                  className={`mis-day-row${row.allComplete ? " is-done" : ""}`}
                >
                  <span className="mis-day-row__date">
                    {formatDay(row.date, locale)}
                  </span>
                  <span className="mis-day-row__score">
                    <span className="mis-day-row__shift">
                      D{row.dayShift.completed}/{row.dayShift.total}
                      <span
                        className={`mis-day-row__dot${row.dayShift.allComplete ? " is-filled" : ""}`}
                        aria-hidden
                      />
                    </span>
                    <span className="mis-day-row__sep">·</span>
                    <span className="mis-day-row__shift">
                      N{row.nightShift.completed}/{row.nightShift.total}
                      <span
                        className={`mis-day-row__dot${row.nightShift.allComplete ? " is-filled" : ""}`}
                        aria-hidden
                      />
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {pendingApprovals && pendingApprovals.length > 0 ? (
        <PendingApprovalsTable
          pendingApprovals={pendingApprovals}
          userRole={userRole}
          locale={locale}
        />
      ) : null}

      <div className="dash-merged__pair">
        <section className="mis-panel week-panel">
          <div className="dash-panel__head">
            <h2 className="section-label">
              {t("sales")} vs {t("purchases")}
            </h2>
            <div className="dash-panel__head-meta">
              <div className="legend">
                <span className="legend__item legend__item--teal">
                  {t("sales")}
                </span>
                <span className="legend__item legend__item--coral">
                  {t("purchases")}
                </span>
              </div>
            </div>
          </div>
          <WeekCompareChart points={metrics.weekSeries} />
        </section>
      </div>

      {machineProductionMetrics ? (
        <section
          className="dash-merged__mp"
          aria-label="Machine Production"
          style={{ marginTop: "1.25rem" }}
        >
          <h2 className="section-label" style={{ marginBottom: "0.65rem" }}>
            Machine Production
          </h2>
          <MachineProductionHome
            metrics={machineProductionMetrics}
            embedded
          />
        </section>
      ) : null}
    </div>
  );
}
