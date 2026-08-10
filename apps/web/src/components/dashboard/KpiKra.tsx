import { formatINR } from "@/lib/format/inr";

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: "teal" | "coral" | "amber" | "violet";
  children?: React.ReactNode;
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "teal",
  children,
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <p className="kpi-card__label">{label}</p>
      <p className="kpi-card__value">{value}</p>
      {hint ? <p className="kpi-card__hint">{hint}</p> : null}
      {children}
    </article>
  );
}

export function formatMoney(n: number): string {
  return formatINR(n);
}

type KraCardProps = {
  title: string;
  description: string;
  progress: number;
  targetLabel?: string;
  tone?: "teal" | "coral" | "amber" | "violet";
  chart?: React.ReactNode;
};

export function KraCard({
  title,
  description,
  progress,
  targetLabel = "Target 100%",
  tone = "teal",
  chart,
}: KraCardProps) {
  const pct = Math.max(0, Math.min(100, progress));
  return (
    <article className={`kra-card kra-card--${tone}`}>
      <div className="kra-card__top">
        <div>
          <h3 className="kra-card__title">{title}</h3>
          <p className="kra-card__desc">{description}</p>
        </div>
        {chart}
      </div>
      <div className="kra-card__meter" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="kra-card__meta">
        <span>{pct}% achieved</span>
        <span>{targetLabel}</span>
      </div>
    </article>
  );
}
