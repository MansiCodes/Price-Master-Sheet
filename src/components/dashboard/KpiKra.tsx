import { formatINR } from "@/lib/format/inr";

type Tone = "teal" | "coral" | "amber" | "violet";
type KpiIcon =
  | "sales"
  | "purchases"
  | "stock"
  | "production"
  | "manpower"
  | "expenses"
  | "profit";

const ICON_PATH: Record<KpiIcon, string> = {
  sales:
    "M4 19V9M10 19V5M16 19v-7M22 19H2M4 9l5-4 4 3 6-6",
  purchases:
    "M3 5h2l1.6 9.6a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6M9 20a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 9 20Zm8 0a1.2 1.2 0 1 0 0-2.4A1.2 1.2 0 0 0 17 20Z",
  stock: "M12 3 4 7v10l8 4 8-4V7l-8-4Zm0 9v9M4 7l8 4 8-4",
  production: "M3 21V10l6-4v4l6-4v15M15 21V12l6 3v6M3 21h18",
  manpower:
    "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3 20c0-3 2.7-5 6-5s6 2 6 5M15.5 15c2.8 0 5.5 1.8 5.5 5",
  expenses:
    "M6 3h9l6 6v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm9 0v6h6M8 13h8M8 17h5",
  profit: "M3 17l6-6 4 4 8-8M15 7h6v6",
};

function KpiGlyph({ name }: { name: KpiIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATH[name]} />
    </svg>
  );
}

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon?: KpiIcon;
  spark?: number[];
  children?: React.ReactNode;
};

export function KpiCard({
  label,
  value,
  hint,
  tone = "teal",
  icon,
  children,
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__head">
        {icon ? (
          <span className="kpi-card__icon" aria-hidden="true">
            <KpiGlyph name={icon} />
          </span>
        ) : null}
        <p className="kpi-card__label">{label}</p>
      </div>
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
  tone?: Tone;
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
