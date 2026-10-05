import { formatINR } from "@/lib/format/inr";
import {
  expenseTypeTotalLabel,
  isTypedExpenseCategory,
} from "@/lib/plant-catalogs";
import type { ReportFooterRow } from "@/components/pnl/ReportTable";

export function buildExpenseFooterRows(opts: {
  category: string;
  cat6: boolean;
  hasRows: boolean;
  totals?: {
    total?: number;
    byHead?: Record<string, number>;
  };
}): ReportFooterRow[] | undefined {
  const { category, cat6, hasRows, totals } = opts;
  if (!totals || !hasRows) return undefined;
  const labelKey = cat6 ? "s" : "head";
  const amount = formatINR(totals.total ?? 0);
  const byHead = totals.byHead ?? {};
  const types = Object.entries(byHead)
    .filter(([, value]) => Number(value) > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  if (!isTypedExpenseCategory(category) || types.length === 0) {
    return [{ cells: { [labelKey]: "TOTAL", amount }, variant: "total" }];
  }

  const rows: ReportFooterRow[] = [
    {
      variant: "subtotal",
      colSpanContent: (
        <div className="pnl-expense-type-totals">
          {types.map(([name, value]) => (
            <div key={name} className="pnl-expense-type-totals__item">
              <span>{expenseTypeTotalLabel(name)}</span>
              <span>{formatINR(value)}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];
  if (types.length > 1) {
    rows.push({
      cells: { [labelKey]: "TOTAL", amount },
      variant: "total",
    });
  }
  return rows;
}
