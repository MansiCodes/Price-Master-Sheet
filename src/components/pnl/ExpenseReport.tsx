"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { isCat6Plant } from "@/lib/plant-layout";

type ExpenseRow = {
  id: string;
  date: string;
  shift: string;
  expenseHead: string;
  description: string | null;
  openingReading: string | number | null;
  closingReading: string | number | null;
  amount: string | number;
  contractorSalary: string | number;
  supervisorSalary: string | number;
  billPhotoUrl?: string | null;
  billPhotoUrls?: string[];
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function formatMonth(value: string | Date) {
  const iso = isoDate(value);
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function totalAmount(r: ExpenseRow) {
  return (
    Number(r.amount) + Number(r.contractorSalary) + Number(r.supervisorSalary)
  );
}

export function ExpenseReport({
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
  const baseUrl = `/api/plants/${plantId}/petty-cash?entryType=EXPENSE&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, response, setPage, setPageSize } =
    usePaginatedReport<ExpenseRow>(baseUrl, t("failedExpenses"));
  const totals = response?.totals as { total?: number } | undefined;

  const columns: ReportColumn<ExpenseRow>[] = useMemo(
    () =>
      cat6
        ? [
            {
              key: "s",
              label: "S.No",
              compact: true,
              render: (_r, index) =>
                String((page - 1) * pageSize + (index ?? 0) + 1),
            },
            {
              key: "month",
              label: "Months",
              render: (r) => formatMonth(r.date),
            },
            {
              key: "head",
              label: t("category"),
              render: (r) => r.expenseHead,
            },
            {
              key: "desc",
              label: "Remarks",
              wrap: "wide",
              render: (r) => r.description || tCommon("dash"),
            },
            {
              key: "amount",
              label: "Salary Amt",
              align: "right",
              render: (r) => formatINR(totalAmount(r)),
            },
            {
              key: "photos",
              label: "Bill",
              compact: true,
              render: (r) => (
                <BillPhotosCell
                  urls={r.billPhotoUrls}
                  fallbackUrl={r.billPhotoUrl}
                />
              ),
            },
          ]
        : [
            { key: "date", label: t("date"), render: (r) => isoDate(r.date) },
            { key: "shift", label: t("shift"), render: (r) => r.shift },
            { key: "head", label: t("category"), render: (r) => r.expenseHead },
            {
              key: "desc",
              label: t("remarksNotes"),
              wrap: "wide",
              render: (r) => r.description || tCommon("dash"),
            },
            {
              key: "opening",
              label: t("openingReading"),
              align: "right",
              render: (r) =>
                r.openingReading == null
                  ? tCommon("dash")
                  : String(r.openingReading),
            },
            {
              key: "closing",
              label: t("closingReading"),
              align: "right",
              render: (r) =>
                r.closingReading == null
                  ? tCommon("dash")
                  : String(r.closingReading),
            },
            {
              key: "amount",
              label: t("amount"),
              align: "right",
              render: (r) => formatINR(totalAmount(r)),
            },
            {
              key: "photos",
              label: "Bill",
              compact: true,
              render: (r) => (
                <BillPhotosCell
                  urls={r.billPhotoUrls}
                  fallbackUrl={r.billPhotoUrl}
                />
              ),
            },
          ],
    [cat6, page, pageSize, t, tCommon],
  );

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("expenseTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={columns}
        rows={rows}
        loading={loading}
        emptyLabel={t("noRecords")}
        footer={
          totals
            ? cat6
              ? { month: "TOTAL", amount: formatINR(totals.total ?? 0) }
              : { head: "TOTAL", amount: formatINR(totals.total ?? 0) }
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
