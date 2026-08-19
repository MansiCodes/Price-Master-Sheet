"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { PVC_EXPENSE_HEADS, pvcExpensePnlLine } from "@/lib/plant-catalogs";

type PvcExpenseRow = {
  id: string;
  expenseLabel: string;
  sortDate: string;
  periodLabel: string;
  description: string;
  details: string | null;
  amount: number;
  source: string;
};

export function PvcExpenseRegisterReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const [category, setCategory] = useState<string>(PVC_EXPENSE_HEADS[0]);

  const baseUrl = `/api/plants/${plantId}/pvc-expense-register?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&category=${encodeURIComponent(category)}`;

  const { rows, page, pageSize, total, loading, error, response, setPage, setPageSize } =
    usePaginatedReport<PvcExpenseRow>(baseUrl, t("networkError"), 20);

  const totals = response?.totals as { amount?: number } | undefined;

  const columns: ReportColumn<PvcExpenseRow>[] = useMemo(
    () => [
      {
        key: "sno",
        label: "S No.",
        align: "center",
        compact: true,
        width: "4.5rem",
        render: (_r, index) =>
          String((page - 1) * pageSize + (index ?? 0) + 1),
      },
      {
        key: "pnl",
        label: "P&L Line",
        wrap: true,
        width: "11rem",
        render: (r) => pvcExpensePnlLine(r.expenseLabel),
      },
      {
        key: "period",
        label: "Month / Date",
        width: "8rem",
        render: (r) => r.periodLabel,
      },
      {
        key: "desc",
        label: t("remarksNotes"),
        wrap: "wide",
        render: (r) => r.description,
      },
      {
        key: "details",
        label: "Details",
        wrap: "wide",
        render: (r) => r.details?.trim() || "—",
      },
      {
        key: "amount",
        label: t("amount"),
        align: "right",
        width: "11rem",
        render: (r) => formatINR(r.amount),
      },
    ],
    [page, pageSize, t],
  );

  return (
    <section className="pnl-report-panel pnl-report-panel--expense">
      <h3 className="pnl-report-panel__title">{t("expenseTitle")}</h3>
      <div className="pnl-expense-subnav" role="tablist" aria-label="Expense type">
        {PVC_EXPENSE_HEADS.map((head) => (
          <button
            key={head}
            type="button"
            role="tab"
            aria-selected={category === head}
            className={category === head ? "is-active" : ""}
            onClick={() => setCategory(head)}
          >
            {head}
          </button>
        ))}
      </div>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyLabel={t("noRecords")}
        variant="register"
        footer={
          totals && rows.length > 0
            ? { pnl: "TOTAL", amount: formatINR(totals.amount ?? 0) }
            : undefined
        }
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </section>
  );
}
