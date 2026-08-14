import { WeekCompareChart } from "@/components/dashboard/Charts";
import { formatMoney, KpiCard } from "@/components/dashboard/KpiKra";
import {
  TodayHub,
  type ShiftModulesMap,
} from "@/components/today/TodayHub";
import type { DashboardMetrics } from "@/lib/dashboard/metrics";

function formatDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

export function DashboardHome({
  metrics,
  dateStr,
  canEnter,
  showNet,
  plant,
  shiftModules,
  scope,
  showCreditScore,
  creditScore,
}: {
  metrics: DashboardMetrics;
  dateStr: string;
  canEnter: boolean;
  showNet: boolean;
  plant: { id: string; name: string; code: string } | null;
  shiftModules: ShiftModulesMap;
  scope: "org" | "plant";
  showCreditScore: boolean;
  creditScore: number | null;
}) {
  const kpiHint =
    scope === "plant" && plant
      ? `${plant.name} · month to date`
      : "Month to date";

  return (
    <div className="dashboard mis dash-merged">
      <section
        className="mis-kpi-grid mis-kpi-grid--six"
        aria-label="Month metrics"
      >
        <KpiCard
          label="Sales"
          value={formatMoney(metrics.mtdSales)}
          tone="teal"
          hint={kpiHint}
          icon="sales"
        />
        <KpiCard
          label="Purchases"
          value={formatMoney(metrics.mtdPurchases)}
          tone="teal"
          hint={kpiHint}
          icon="purchases"
        />
        <KpiCard
          label="Stock value"
          value={formatMoney(metrics.mtdStockValue)}
          tone="teal"
          hint={scope === "plant" ? "Closing checks · this plant" : "Closing checks"}
          icon="stock"
        />
        <KpiCard
          label="Production"
          value={`${metrics.mtdProductionQty.toLocaleString("en-IN")} units`}
          tone="teal"
          hint={scope === "plant" ? "Logged qty · this plant" : "Logged qty"}
          icon="production"
        />
        <KpiCard
          label="Expenses"
          value={formatMoney(metrics.mtdExpenses)}
          tone="teal"
          hint={scope === "plant" ? "Misc / petty · this plant" : "Misc / petty"}
          icon="expenses"
        />
        {showNet ? (
          <KpiCard
            label="Net profit"
            value={formatMoney(metrics.mtdNetProfit ?? 0)}
            tone="teal"
            hint={scope === "plant" ? "Live P&L · this plant" : "Live P&L"}
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
              <h2 className="section-label">Today&apos;s report</h2>
              <p className="page-sub" style={{ margin: 0 }}>
                No plant assigned to your account yet.
              </p>
            </section>
          )}
        </div>

        <div className="dash-merged__side">
          {showCreditScore ? (
            <section className="mis-panel credit-score-panel">
              <h2 className="section-label">Credit score</h2>
              <p className="credit-score-panel__value">
                {creditScore != null ? creditScore : "—"}
              </p>
              <p className="credit-score-panel__hint">
                {creditScore != null && creditScore > 0
                  ? "+100 points each time you complete all five forms in one shift."
                  : "Complete all five forms in the same shift (day or night) to earn 100."}
              </p>
            </section>
          ) : null}

          <section className="mis-panel">
            <h2 className="section-label">Daily report status</h2>
            <ul className="mis-day-list">
              {metrics.dailyReportRows.map((row) => (
                <li
                  key={row.date}
                  className={`mis-day-row${row.allComplete ? " is-done" : ""}`}
                >
                  <span className="mis-day-row__date">{formatDay(row.date)}</span>
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

      <div className="dash-merged__pair">
        <section className="mis-panel week-panel">
          <div className="dash-panel__head">
            <h2 className="section-label">Sales vs purchase</h2>
            <div className="dash-panel__head-meta">
              <div className="legend">
                <span className="legend__item legend__item--teal">Sales</span>
                <span className="legend__item legend__item--coral">Purchases</span>
              </div>
              <span className="week-range">Last 7 days</span>
            </div>
          </div>
          <WeekCompareChart points={metrics.weekSeries} />
        </section>
      </div>
    </div>
  );
}
