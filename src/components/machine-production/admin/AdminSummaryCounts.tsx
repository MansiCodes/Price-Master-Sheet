import type { Summary } from "@/components/machine-production/admin-dashboard-model";

export function AdminSummaryCounts({ summary }: { summary: Summary }) {
  return (
    <div className="mp-counts mp-counts--admin" aria-label="Production summary">
      <span className="mp-count">
        <span className="mp-count__label">Total</span>
        <span className="mp-count__value">{summary.total}</span>
      </span>
      <span className="mp-count mp-count--ok">
        <span className="mp-count__label">Completed</span>
        <span className="mp-count__value">{summary.completed}</span>
      </span>
      <span className="mp-count mp-count--pending">
        <span className="mp-count__label">Pending</span>
        <span className="mp-count__value">{summary.pending}</span>
      </span>
      <span className="mp-count mp-count--overdue">
        <span className="mp-count__label">Overdue</span>
        <span className="mp-count__value">{summary.overdue}</span>
      </span>
      <div className="mp-counts__metrics">
        <span className="mp-count mp-count--metric">
          <span className="mp-count__label">Planned</span>
          <span className="mp-count__value">
            {summary.plannedProduction ?? 0}
          </span>
        </span>
        <span className="mp-count mp-count--metric">
          <span className="mp-count__label">Actual</span>
          <span className="mp-count__value">
            {summary.actualProduction}
          </span>
        </span>
        <span className="mp-count mp-count--metric">
          <span className="mp-count__label">Eff</span>
          <span className="mp-count__value">
            {summary.averageEfficiency}%
          </span>
        </span>
      </div>
    </div>
  );
}
