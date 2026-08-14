"use client";

import { REPORT_TABS, type ReportTab } from "@/components/pnl/types";

export function PnlTabNav({
  active,
  onChange,
}: {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
}) {
  return (
    <div className="pnl-tab-nav" role="tablist" aria-label="Report type">
      {REPORT_TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={active === tab.key}
          className={active === tab.key ? "is-active" : ""}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
