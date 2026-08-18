"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";
import { isCat6Plant } from "@/lib/plant-layout";

type PettyCashRow = {
  id: string;
  date: string;
  payMode: string;
  nature?: string | null;
  description: string | null;
  location?: string | null;
  checkedBy?: string | null;
  approvedBy?: string | null;
  billNumber: string | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

type PettyCashTotals = {
  expenses: number;
  contractorSalary: number;
  supervisorSalary: number;
  total: number;
};

function rowTotal(r: PettyCashRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function PettyCashReport({
  plantId,
  plantCode,
  from,
  to,
}: {
  plantId: string;
  plantCode?: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const tCommon = useTranslations("common");
  const cat6 = isCat6Plant(plantCode);
  const baseUrl = `/api/plants/${plantId}/petty-cash?entryType=PETTY_CASH&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const {
    rows,
    page,
    pageSize,
    total,
    loading,
    error,
    response,
    setPage,
    setPageSize,
  } =
    usePaginatedReport<PettyCashRow>(baseUrl, t("failedPettyCash"));
  const totals = response?.totals as PettyCashTotals | undefined;

  const columns: ReportColumn<PettyCashRow>[] = useMemo(
    () => [
      {
        key: "s",
        label: t("sNo"),
        compact: true,
        render: (_r, index) =>
          String((page - 1) * pageSize + (index ?? 0) + 1),
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
      {
        key: "billDate",
        label: t("billDate"),
        render: (r) => formatDayMonthYear(r.date),
      },
      {
        key: "photos",
        label: "Bill",
        compact: true,
        render: (r) => (
          <BillPhotosCell urls={r.billPhotoUrls} fallbackUrl={r.billPhotoUrl} />
        ),
      },
    ],
    [page, pageSize, t, tCommon],
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
        footer={
          totals
            ? cat6
              ? {
                  date: "TOTAL",
                  amount: formatINR(totals.expenses),
                }
              : {
                  desc: "TOTAL",
                  expenses: formatINR(totals.expenses),
                  contractor: formatINR(totals.contractorSalary),
                  supervisor: formatINR(totals.supervisorSalary),
                  total: formatINR(totals.total),
                }
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
