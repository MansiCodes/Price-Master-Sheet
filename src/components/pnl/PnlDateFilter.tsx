"use client";

import { useTranslations } from "next-intl";

export function PnlDateFilter({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}) {
  const t = useTranslations("common");

  return (
    <div className="pnl-date-filter" aria-label="Date range filter">
      <div className="pnl-date-filter__field">
        <label htmlFor="pnl-from">{t("from")}</label>
        <input
          id="pnl-from"
          type="date"
          value={from}
          max={to}
          onChange={(e) => onFromChange(e.target.value)}
        />
      </div>
      <div className="pnl-date-filter__field">
        <label htmlFor="pnl-to">{t("to")}</label>
        <input
          id="pnl-to"
          type="date"
          value={to}
          min={from}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
    </div>
  );
}
