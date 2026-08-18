"use client";

import { useTranslations } from "next-intl";
import { REPORT_TABS, type ReportTab } from "@/components/pnl/types";

export function PnlTabNav({
  active,
  onChange,
  tabs,
}: {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
  tabs?: ReportTab[];
}) {
  const t = useTranslations("pnl");
  const labels: Record<ReportTab, string> = {
    pnl: t("pnl"),
    sales: t("sales"),
    purchase: t("purchase"),
    production: t("production"),
    stock: t("stock"),
    electricityRent: t("electricityRent"),
    factoryRent: t("factoryRent"),
    fixedAssets: t("fixedAssets"),
    expense: t("expense"),
    pettyCash: t("pettyCash"),
  };

  const visible = tabs?.length
    ? REPORT_TABS.filter((tab) => tabs.includes(tab.key)).map((tab) => tab.key)
    : REPORT_TABS.map((tab) => tab.key);

  return (
    <div className="pnl-tab-nav" role="tablist" aria-label="Report type">
      {REPORT_TABS.map((tab) =>
        visible.includes(tab.key) ? (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            className={active === tab.key ? "is-active" : ""}
            onClick={() => onChange(tab.key)}
          >
            {labels[tab.key]}
          </button>
        ) : null,
      )}
    </div>
  );
}
