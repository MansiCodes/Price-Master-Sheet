"use client";

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
