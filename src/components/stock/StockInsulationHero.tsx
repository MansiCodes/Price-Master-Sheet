import type { SharedInsulationStatus } from "@/lib/stock-production-status";
import { formatNum } from "./stock-status-format";

export function StockInsulationHero({
  title,
  status,
  fullWidth,
}: {
  title: string;
  status: SharedInsulationStatus | null;
  fullWidth: boolean;
}) {
  return (
    <li
      className={`stock-status-card stock-status-card--insulation-hero${
        fullWidth ? " is-full" : ""
      }`}
    >
      <div className="insul-hero__left">
        <div className="insul-hero__img">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <div className="insul-hero__details">
          <h3 className="insul-hero__title">
            {title} <span className="insul-hero__bullet">&bull;</span> Insulation
          </h3>
          <p className="insul-hero__meta">
            Insul: <strong>{formatNum(status?.closing ?? 0)}km ({formatNum(status?.production ?? 0)}km)</strong>
          </p>
          <p className="insul-hero__closing">
            Closing &mdash; <strong>{formatNum(status?.closing ?? 0)}km</strong>
          </p>
        </div>
      </div>
    </li>
  );
}
