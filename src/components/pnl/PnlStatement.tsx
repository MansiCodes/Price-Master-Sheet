"use client";

import type { PnlStatementLine } from "@/lib/pnl/types";
import { formatAmount, formatRatio } from "@/components/pnl/types";
import { isCat6Plant } from "@/lib/plant-layout";

function visibleLines(lines: PnlStatementLine[]): PnlStatementLine[] {
  return lines.filter((row) => {
    if (row.kind === "blank") return true;
    if (row.amount == null && (row.kind === "profit" || row.kind === "tax")) {
      return false;
    }
    return true;
  });
}

function padLines(
  debit: PnlStatementLine[],
  credit: PnlStatementLine[],
): { debit: PnlStatementLine[]; credit: PnlStatementLine[] } {
  const left = visibleLines(debit);
  const right = visibleLines(credit);
  const target = Math.max(left.length, right.length);
  while (left.length < target) {
    left.push({ label: "", amount: null, ratio: null, kind: "blank" });
  }
  while (right.length < target) {
    right.push({ label: "", amount: null, ratio: null, kind: "blank" });
  }
  return { debit: left, credit: right };
}

function StatementSide({
  title,
  lines,
  total,
  showRatio = true,
}: {
  title: string;
  lines: PnlStatementLine[];
  total: number;
  showRatio?: boolean;
}) {
  return (
    <div className="pnl-stmt__side">
      <div className="pnl-stmt__col-head">
        <span>Particulars</span>
        <span>Amount</span>
        {showRatio ? <span>Ratio %</span> : null}
      </div>
      <ul className="pnl-stmt__lines">
        {lines.map((row, index) => {
          if (row.kind === "blank") {
            return <li key={`blank-${index}`} className="pnl-stmt__blank" />;
          }
          return (
            <li
              key={`${row.label}-${index}`}
              className={`pnl-stmt__line pnl-stmt__line--${row.kind}`}
            >
              <span className="pnl-stmt__label">{row.label}</span>
              <span className="pnl-stmt__amount">
                {row.amount == null
                  ? ""
                  : formatAmount(row.amount)}
              </span>
              {showRatio ? (
                <span className="pnl-stmt__ratio">{formatRatio(row.ratio)}</span>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="pnl-stmt__total-bar">
        <span>{title} total</span>
        <span>{formatAmount(total)}</span>
        {showRatio ? <span /> : null}
      </div>
    </div>
  );
}

function StatementSection({
  label,
  debit,
  credit,
  total,
  showRatio = true,
}: {
  label: string;
  debit: PnlStatementLine[];
  credit: PnlStatementLine[];
  total: number;
  showRatio?: boolean;
}) {
  const padded = padLines(debit, credit);
  return (
    <section className="pnl-stmt__section" aria-label={label}>
      <div className="pnl-stmt__grid">
        <StatementSide
          title="Debit"
          lines={padded.debit}
          total={total}
          showRatio={showRatio}
        />
        <StatementSide
          title="Credit"
          lines={padded.credit}
          total={total}
          showRatio={showRatio}
        />
      </div>
    </section>
  );
}

export function PnlStatement({
  trading,
  indirect,
  plantCode,
  loading,
}: {
  trading: {
    debit: PnlStatementLine[];
    credit: PnlStatementLine[];
    total: number;
  };
  indirect: {
    debit: PnlStatementLine[];
    credit: PnlStatementLine[];
    total: number;
  };
  plantCode?: string;
  loading?: boolean;
}) {
  const cat6 = isCat6Plant(plantCode);
  return (
    <article className={`pnl-stmt${cat6 ? " pnl-stmt--cat6" : ""}${loading ? " is-loading" : ""}`}>
      <StatementSection
        label="Trading account"
        debit={trading.debit}
        credit={trading.credit}
        total={trading.total}
        showRatio={!cat6}
      />
      <StatementSection
        label="Indirect account"
        debit={indirect.debit}
        credit={indirect.credit}
        total={indirect.total}
        showRatio={!cat6}
      />
    </article>
  );
}

export function PnlStatementSkeleton() {
  return (
    <article className="pnl-stmt pnl-stmt--skeleton" aria-label="Loading P&L">
      {[0, 1].map((section) => (
        <section className="pnl-stmt__section" key={section}>
          <div className="pnl-stmt__grid">
            {[0, 1].map((side) => (
              <div className="pnl-stmt__side" key={side}>
                <div className="pnl-stmt__col-head">
                  <span>Particulars</span><span>Amount</span><span>Ratio %</span>
                </div>
                <div className="pnl-stmt__lines">
                  {Array.from({ length: 6 }, (_, row) => (
                    <div className="pnl-stmt__line" key={row}>
                      <span className="pnl-skeleton-line" />
                      <span className="pnl-skeleton-line" />
                      <span className="pnl-skeleton-line" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
