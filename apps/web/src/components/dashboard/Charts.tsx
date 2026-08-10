"use client";

type SparkBarsProps = {
  sales: number[];
  purchases: number[];
  labels?: string[];
};

/** Dual-series bar sparkline (sales teal / purchases coral). */
export function SparkBars({ sales, purchases }: SparkBarsProps) {
  const max = Math.max(1, ...sales, ...purchases);
  const n = Math.max(sales.length, purchases.length, 1);
  const gap = 6;
  const barW = 10;
  const groupW = barW * 2 + gap;
  const height = 88;
  const width = n * groupW + 8;

  return (
    <svg
      className="spark-bars"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="7-day sales vs purchases"
    >
      {Array.from({ length: n }, (_, i) => {
        const sH = (sales[i] ?? 0) / max * (height - 12);
        const pH = (purchases[i] ?? 0) / max * (height - 12);
        const x = 4 + i * groupW;
        return (
          <g key={i}>
            <rect
              x={x}
              y={height - 4 - sH}
              width={barW}
              height={Math.max(2, sH)}
              rx={3}
              fill="#0d9488"
            />
            <rect
              x={x + barW + 2}
              y={height - 4 - pH}
              width={barW}
              height={Math.max(2, pH)}
              rx={3}
              fill="#fb7185"
            />
          </g>
        );
      })}
    </svg>
  );
}

type DonutProps = {
  value: number; // 0-100
  color?: string;
  track?: string;
  label?: string;
};

export function DonutChart({
  value,
  color = "#0d9488",
  track = "#e7e5e4",
  label,
}: DonutProps) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;

  return (
    <div className="donut">
      <svg viewBox="0 0 96 96" width="96" height="96" aria-hidden="true">
        <circle cx="48" cy="48" r={r} fill="none" stroke={track} strokeWidth="10" />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 48 48)"
        />
        <text
          x="48"
          y="52"
          textAnchor="middle"
          fontSize="16"
          fontWeight="700"
          fill="#1c1917"
        >
          {clamped}%
        </text>
      </svg>
      {label ? <span className="donut__label">{label}</span> : null}
    </div>
  );
}
