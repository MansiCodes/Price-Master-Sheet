"use client";

import { useTranslations } from "next-intl";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";

type ProductionRow = {
  id: string;
  date: string;
  shift: string;
  productName: string;
  quantity: string | number;
  unit: string;
};

function isoDate(value: string | Date) {
  return formatDayMonthYear(value);
}

export function ProductionReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const baseUrl = `/api/plants/${plantId}/production?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, setPage, setPageSize } =
    usePaginatedReport<ProductionRow>(baseUrl, t("networkError"));

  const columns: ReportColumn<ProductionRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    { key: "shift", label: "Shift", render: (r) => r.shift },
    { key: "product", label: "Product", render: (r) => r.productName },
    {
      key: "qty",
      label: "Quantity",
      align: "right",
      render: (r) => `${Number(r.quantity)} ${r.unit}`,
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("productionTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable columns={columns} rows={rows} loading={loading} />
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
