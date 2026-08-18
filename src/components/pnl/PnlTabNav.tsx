"use client";

import { useTranslations } from "next-intl";
import { REPORT_TABS, type ReportTab } from "@/components/pnl/types";

export function PnlTabNav({
  active,
  onChange,
  hideProduction = false,
}: {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
  hideProduction?: boolean;
}) {
  const t = useTranslations("pnl");
  const tabs = hideProduction
    ? REPORT_TABS.filter((tab) => tab.key !== "production")
    : REPORT_TABS;

  return (
    <div className="pnl-tab-nav" role="tablist" aria-label="Report type">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={active === tab.key ? "is-active" : ""}
          onClick={() => onChange(tab.key)}
        >
          {t(tab.key)}
        </button>
      ))}
    </div>
  );
}
