"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/lib/dashboard/period";

export function DashboardPeriodFilter({ active }: { active: DashboardPeriod }) {
  const t = useTranslations("dashboard");

  const labels: Record<DashboardPeriod, string> = {
    week: t("periodWeekly"),
    month: t("periodMonthly"),
    quarter: t("periodQuarterly"),
    year: t("periodYearly"),
  };

  return (
    <div
      className="dashboard-period-filter"
      role="tablist"
      aria-label={t("periodFilter")}
    >
      {DASHBOARD_PERIODS.map((period) => (
        <Link
          key={period}
          href={period === "month" ? "/" : `/?period=${period}`}
          className={`dashboard-period-filter__btn${
            active === period ? " is-active" : ""
          }`}
          role="tab"
          aria-selected={active === period}
        >
          {labels[period]}
        </Link>
      ))}
    </div>
  );
}
