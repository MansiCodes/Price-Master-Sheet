"use client";

import { useTranslations } from "next-intl";
import "@/components/ui/date-filter.css";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const today = todayISO();

  return (
    <div className="pnl-date-filter" aria-label="Date range filter">
      <div className="pnl-date-filter__field">
        <label htmlFor="pnl-from">{t("from")}</label>
        <div className="pnl-date-filter__input-wrap">
          <input
            id="pnl-from"
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
      </div>
      <div className="pnl-date-filter__field">
        <label htmlFor="pnl-to">{t("to")}</label>
        <div className="pnl-date-filter__input-wrap">
          <input
            id="pnl-to"
            type="date"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(e) => onToChange(e.target.value)}
          />
        </div>
      </div>
      {from || to ? (
        <button
          type="button"
          className="pnl-date-filter__clear"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          title="Clear date filter to show all data"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
