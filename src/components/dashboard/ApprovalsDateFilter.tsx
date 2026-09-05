"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import "@/components/ui/date-filter.css";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ApprovalsDateFilter({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const today = todayISO();

  function navigate(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const qs = params.toString();
    router.push(qs ? `/approvals?${qs}` : "/approvals");
  }

  return (
    <div className="pnl-date-filter" aria-label="Approval date filter">
      <div className="pnl-date-filter__field">
        <label htmlFor="approvals-from">{t("from")}</label>
        <div className="pnl-date-filter__input-wrap">
          <input
            id="approvals-from"
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => navigate(e.target.value, to)}
          />
        </div>
      </div>
      <div className="pnl-date-filter__field">
        <label htmlFor="approvals-to">{t("to")}</label>
        <div className="pnl-date-filter__input-wrap">
          <input
            id="approvals-to"
            type="date"
            value={to}
            min={from || undefined}
            max={today}
            onChange={(e) => navigate(from, e.target.value)}
          />
        </div>
      </div>
      {from || to ? (
        <button
          type="button"
          className="pnl-date-filter__clear"
          onClick={() => navigate("", "")}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
