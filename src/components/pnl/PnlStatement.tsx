"use client";

import type { PnlStatementLine } from "@/lib/pnl/types";
import { formatAmount, formatRatio } from "@/components/pnl/types";

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
}: {
  title: string;
  lines: PnlStatementLine[];
  total: number;
}) {
  return (
    <div className="pnl-stmt__side">
      <div className="pnl-stmt__col-head">
        <span>Particulars</span>
        <span>Amount</span>
        <span>Ratio %</span>
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
                {row.kind === "header" && row.amount == null
                  ? ""
                  : formatAmount(row.amount)}
              </span>
              <span className="pnl-stmt__ratio">{formatRatio(row.ratio)}</span>
            </li>
          );
        })}
      </ul>
      <div className="pnl-stmt__total-bar">
        <span>{title} total</span>
        <span>{formatAmount(total)}</span>
        <span />
      </div>
    </div>
  );
}

function StatementSection({
  label,
  debit,
  credit,
  total,
}: {
  label: string;
  debit: PnlStatementLine[];
  credit: PnlStatementLine[];
  total: number;
}) {
  const padded = padLines(debit, credit);
  return (
    <section className="pnl-stmt__section" aria-label={label}>
      <div className="pnl-stmt__grid">
        <StatementSide title="Debit" lines={padded.debit} total={total} />
        <StatementSide title="Credit" lines={padded.credit} total={total} />
      </div>
    </section>
  );
}

export function PnlStatement({
  trading,
  indirect,
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
  loading?: boolean;
}) {
  return (
    <article className={`pnl-stmt${loading ? " is-loading" : ""}`}>
      <StatementSection
        label="Trading account"
        debit={trading.debit}
        credit={trading.credit}
        total={trading.total}
      />
      <StatementSection
        label="Indirect account"
        debit={indirect.debit}
        credit={indirect.credit}
        total={indirect.total}
      />
    </article>
  );
}
