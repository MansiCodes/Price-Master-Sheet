"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { formatDisplayDate } from "@/components/pnl/types";
import { Pagination } from "@/components/ui/Pagination";
import {
  REPORT_PAGE_SIZE,
  usePaginatedReport,
} from "@/components/pnl/usePaginatedReport";

type PettyCashRow = {
  id: string;
  date: string;
  payMode: string;
  description: string | null;
  billNumber: string | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
};

type PettyCashTotals = {
  expenses: number;
  contractorSalary: number;
  supervisorSalary: number;
  total: number;
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function rowTotal(r: PettyCashRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function PettyCashReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const tCommon = useTranslations("common");
  const baseUrl = `/api/plants/${plantId}/petty-cash?entryType=PETTY_CASH&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, total, loading, error, response, setPage } =
    usePaginatedReport<PettyCashRow>(baseUrl, t("failedPettyCash"));
  const totals = response?.totals as PettyCashTotals | undefined;

  const columns: ReportColumn<PettyCashRow>[] = useMemo(
    () => [
      {
        key: "s",
        label: t("sNo"),
        compact: true,
        render: (_r, index) =>
          String((page - 1) * REPORT_PAGE_SIZE + (index ?? 0) + 1),
      },
      {
        key: "payMode",
        label: t("payMode"),
        render: (r) => r.payMode || tCommon("dash"),
      },
      {
        key: "desc",
        label: t("descriptionOfExpense"),
        wrap: "wide",
        render: (r) => r.description?.trim() || tCommon("dash"),
      },
      {
        key: "billNumber",
        label: t("billNumber"),
        wrap: true,
        render: (r) => r.billNumber?.trim() || tCommon("dash"),
      },
      {
        key: "billDate",
        label: t("billDate"),
        render: (r) => formatDisplayDate(isoDate(r.date)),
      },
      {
        key: "expenses",
        label: t("expenses"),
        align: "right",
        render: (r) => formatINR(Number(r.amount)),
      },
      {
        key: "contractor",
        label: t("contractorSalary"),
        align: "right",
        render: (r) => formatINR(Number(r.contractorSalary)),
      },
      {
        key: "supervisor",
        label: t("supervisorSalary"),
        align: "right",
        render: (r) => formatINR(Number(r.supervisorSalary)),
      },
      {
        key: "total",
        label: t("total"),
        align: "right",
        render: (r) => formatINR(rowTotal(r)),
      },
    ],
    [page, t, tCommon],
  );

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("pettyCashTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        variant="register"
        emptyLabel={t("noPettyCash")}
      />
      <Pagination
        page={page}
        pageSize={REPORT_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
      {total > 0 && totals ? (
        <dl className="pnl-report-totals">
          <div>
            <dt>{t("expenses")}</dt>
            <dd>{formatINR(totals.expenses)}</dd>
          </div>
          <div>
            <dt>{t("contractorSalary")}</dt>
            <dd>{formatINR(totals.contractorSalary)}</dd>
          </div>
          <div>
            <dt>{t("supervisorSalary")}</dt>
            <dd>{formatINR(totals.supervisorSalary)}</dd>
          </div>
          <div className="is-grand">
            <dt>{t("total")}</dt>
            <dd>{formatINR(totals.total)}</dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
