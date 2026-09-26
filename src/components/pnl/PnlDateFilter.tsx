"use client";

import { useTranslations } from "next-intl";
import "@/components/ui/date-filter.css";
import { PnlThemedDateField } from "@/components/pnl/PnlThemedDateField";

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
  const hasClear = Boolean(from || to);

  return (
    <div
      className={`pnl-date-filter${hasClear ? " pnl-date-filter--has-clear" : ""}`}
      aria-label="Date range filter"
    >
      <PnlThemedDateField
        id="pnl-from"
        label={t("from")}
        value={from}
        max={to || today}
        align="start"
        onChange={onFromChange}
      />
      <PnlThemedDateField
        id="pnl-to"
        label={t("to")}
        value={to}
        min={from || undefined}
        max={today}
        align="end"
        onChange={onToChange}
      />
      {hasClear ? (
        <button
          type="button"
          className="pnl-date-filter__clear"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          title="Clear date filter to show all data"
          aria-label="Clear date filter"
        >
          <svg
            className="pnl-date-filter__clear-icon"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            aria-hidden
          >
            <path
              d="M4 4l8 8M12 4l-8 8"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          <span className="pnl-date-filter__clear-label">Clear</span>
        </button>
      ) : null}
    </div>
  );
}
