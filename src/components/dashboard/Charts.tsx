"use client";

import { useEffect, useState } from "react";

function useMobileChart() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 880px)");
    const sync = () => setMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return mobile;
}

type SparkBarsProps = {
  sales: number[];
  purchases: number[];
  labels?: string[];
};

function formatAxis(n: number): string {
  if (n >= 100000) return `₹${Math.round(n / 100000)}L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}K`;
  return `₹${Math.round(n)}`;
}

function axisScale(rawMax: number): { max: number; ticks: number[] } {
  const floor = 12000;
  const target = Math.max(rawMax, floor);
  const rough = target / 3;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1))));
  const residual = rough / mag;
  const nice = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 4 ? 4 : residual <= 5 ? 5 : 10;
  const step = nice * mag;
  const max = Math.ceil(target / step) * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  return { max, ticks };
}

function hasData(values: number[]): boolean {
  return values.some((v) => v > 0);
}

function strokePaths(
  values: number[],
  max: number,
  padL: number,
  padT: number,
  plotW: number,
  plotH: number,
) {
  const n = Math.max(values.length, 1);
  const coords = values.map((v, i) => {
    const x = padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = padT + plotH - (v / max) * plotH;
    return [x, y] as const;
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  const last = coords[coords.length - 1];
  const first = coords[0];
  const area = last && first
    ? `${line} L ${last[0]} ${padT + plotH} L ${first[0]} ${padT + plotH} Z`
    : "";
  return { coords, line, area };
}

export function WeekCompareChart({
  points,
}: {
  points: { date: string; sales: number; purchases: number }[];
}) {
  const sales = points.map((p) => p.sales);
  const purchases = points.map((p) => p.purchases);
  const labels = points.map((p) => {
    if (/^\d{4}-\d{2}$/.test(p.date)) {
      const [yy, mm] = p.date.split("-");
      return new Date(Date.UTC(Number(yy), Number(mm) - 1, 1)).toLocaleDateString(
        "en-GB",
        { month: "short", timeZone: "UTC" },
      );
    }
    const d = new Date(`${p.date}T00:00:00Z`);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    });
  });
  const mobile = useMobileChart();
  const n = Math.max(points.length, 1);
  const { max, ticks } = axisScale(Math.max(0, ...sales, ...purchases));
  const padL = mobile ? 36 : 40;
  const padR = mobile ? 6 : 10;
  const padT = mobile ? 10 : 10;
  const padB = mobile ? 26 : 26;
  const width = mobile ? 360 : 640;
  const height = mobile ? 290 : 300;
  const axisFont = mobile ? 9 : 9;
  const axisFontFamily = "var(--font-body), system-ui, sans-serif";
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const salesStroke = hasData(sales)
    ? strokePaths(sales, max, padL, padT, plotW, plotH)
    : null;
  const purchaseStroke = hasData(purchases)
    ? strokePaths(purchases, max, padL, padT, plotW, plotH)
    : null;

  return (
    <svg
      className="week-chart"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMinYMin meet"
      role="img"
      aria-label="Sales vs purchases trend"
    >
      {ticks.map((tick) => {
        const y = padT + plotH - (tick / max) * plotH;
        return (
          <g key={tick}>
            <line
              x1={padL}
              x2={width - padR}
              y1={y}
              y2={y}
              stroke="#e4e8e5"
              strokeWidth="1"
            />
            <text
              x={padL - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={axisFont}
              fontFamily={axisFontFamily}
              fontWeight="700"
              fill="#1a2421"
            >
              {formatAxis(tick)}
            </text>
          </g>
        );
      })}
      <line
        x1={padL}
        x2={width - padR}
        y1={padT + plotH}
        y2={padT + plotH}
        stroke="#d5dbd8"
        strokeWidth="1.2"
      />
      {purchaseStroke ? (
        <g>
          <path d={purchaseStroke.area} fill="#14b8a6" fillOpacity="0.18" />
          <path
            d={purchaseStroke.line}
            fill="none"
            stroke="#14b8a6"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
      {salesStroke ? (
        <g>
          <path d={salesStroke.area} fill="#127269" fillOpacity="0.16" />
          <path
            d={salesStroke.line}
            fill="none"
            stroke="#127269"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ) : null}
      {points.map((p, i) => {
        const x =
          padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW) - (mobile ? 4 : 0);
        return (
          <text
            key={p.date}
            x={x}
            y={height - 10}
            textAnchor="middle"
            fontSize={axisFont}
            fontFamily={axisFontFamily}
            fontWeight="700"
            fill="#1a2421"
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

export function WeekStatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "teal" | "coral";
}) {
  return (
    <article className={`week-stat week-stat--${tone}`}>
      <div className="week-stat__copy">
        <p className="week-stat__label">{label}</p>
        <p className="week-stat__value">{value}</p>
      </div>
    </article>
  );
}

function formatPieMoney(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

/** Donut pie: Sales vs Purchases for the selected dashboard period. */
export function SalesPurchasePieChart({
  sales,
  purchases,
  salesLabel = "Sales",
  purchasesLabel = "Purchases",
  emptyLabel = "No sales or purchases in this period",
}: {
  sales: number;
  purchases: number;
  salesLabel?: string;
  purchasesLabel?: string;
  emptyLabel?: string;
}) {
  const total = Math.max(0, sales) + Math.max(0, purchases);
  const salesPct = total > 0 ? (sales / total) * 100 : 0;
  const purchasePct = total > 0 ? (purchases / total) * 100 : 0;

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 78;
  const stroke = 36;
  const c = 2 * Math.PI * radius;
  const salesLen = total > 0 ? (sales / total) * c : 0;
  const purchaseLen = total > 0 ? (purchases / total) * c : 0;

  return (
    <div className="sales-purchase-pie">
      <div className="sales-purchase-pie__chart">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          width={size}
          height={size}
          role="img"
          aria-label={`${salesLabel} ${formatPieMoney(sales)}, ${purchasesLabel} ${formatPieMoney(purchases)}`}
        >
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="#e8eeeb"
            strokeWidth={stroke}
          />
          {total > 0 ? (
            <>
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#0d9488"
                strokeWidth={stroke}
                strokeDasharray={`${salesLen} ${c - salesLen}`}
                strokeDashoffset={0}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
              <circle
                cx={cx}
                cy={cy}
                r={radius}
                fill="none"
                stroke="#ef6351"
                strokeWidth={stroke}
                strokeDasharray={`${purchaseLen} ${c - purchaseLen}`}
                strokeDashoffset={-salesLen}
                strokeLinecap="butt"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            </>
          ) : null}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            className="sales-purchase-pie__total-label"
            fill="#5a6b64"
            fontSize="11"
            fontWeight="700"
          >
            Total
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="#1a2421"
            fontSize="15"
            fontWeight="700"
          >
            {total > 0 ? formatPieMoney(total) : "—"}
          </text>
        </svg>
      </div>

      {total <= 0 ? (
        <p className="sales-purchase-pie__empty">{emptyLabel}</p>
      ) : (
        <ul className="sales-purchase-pie__legend">
          <li>
            <span className="sales-purchase-pie__swatch sales-purchase-pie__swatch--sales" />
            <span className="sales-purchase-pie__name">{salesLabel}</span>
            <span className="sales-purchase-pie__amt">{formatPieMoney(sales)}</span>
            <span className="sales-purchase-pie__pct">{salesPct.toFixed(0)}%</span>
          </li>
          <li>
            <span className="sales-purchase-pie__swatch sales-purchase-pie__swatch--purchases" />
            <span className="sales-purchase-pie__name">{purchasesLabel}</span>
            <span className="sales-purchase-pie__amt">
              {formatPieMoney(purchases)}
            </span>
            <span className="sales-purchase-pie__pct">
              {purchasePct.toFixed(0)}%
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

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
              fill="#14b8a6"
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