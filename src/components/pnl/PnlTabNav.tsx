"use client";

import { useTranslations } from "next-intl";
import { REPORT_TABS, type ReportTab } from "@/components/pnl/types";

function TabLabel({
  tab,
  label,
  compact,
}: {
  tab: ReportTab;
  label: string;
  compact?: boolean;
}) {
  if (compact && tab === "factoryRent") {
    const parts = label.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (
        <span className="pnl-tab-nav__stacked">
          <span>{parts.slice(0, -1).join(" ")}</span>
          <span>{parts[parts.length - 1]}</span>
        </span>
      );
    }
  }
  return label;
}

export function PnlTabNav({
  active,
  onChange,
  tabs,
  compact,
}: {
  active: ReportTab;
  onChange: (tab: ReportTab) => void;
  tabs?: ReportTab[];
  /** Single-row tab bar; Factory Rent uses a two-line label. */
  compact?: boolean;
}) {
  const t = useTranslations("pnl");
  const labels: Record<ReportTab, string> = {
    pnl: t("pnl"),
    sales: t("sales"),
    purchase: t("purchase"),
    stock: t("stock"),
    electricityRent: t("electricityRent"),
    factoryRent: t("factoryRent"),
    fixedAssets: t("fixedAssets"),
    expense: t("expense"),
    pettyCash: t("pettyCash"),
    contactList: t("contactList"),
  };

  const visible = tabs?.length
    ? REPORT_TABS.filter((tab) => tabs.includes(tab.key)).map((tab) => tab.key)
    : REPORT_TABS.map((tab) => tab.key);

  const fit = visible.length <= 8;
  const dense = !fit && (compact ?? visible.length > 8);

  return (
    <div
      className={`pnl-tab-nav pnl-tab-nav--n${visible.length}${fit ? " pnl-tab-nav--fit" : ""}${dense ? " pnl-tab-nav--compact" : ""}`}
      role="tablist"
      aria-label="Report type"
    >
      {REPORT_TABS.map((tab) =>
        visible.includes(tab.key) ? (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === tab.key}
            aria-label={
              dense && tab.key === "factoryRent" ? labels[tab.key] : undefined
            }
            className={active === tab.key ? "is-active" : ""}
            onClick={() => onChange(tab.key)}
          >
            <TabLabel tab={tab.key} label={labels[tab.key]} compact={dense} />
          </button>
        ) : null,
      )}
    </div>
  );
}
