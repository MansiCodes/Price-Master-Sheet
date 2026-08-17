"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import {
  REPORT_PAGE_SIZE,
  usePaginatedReport,
} from "@/components/pnl/usePaginatedReport";

type StockRow = {
  id: string;
  date: string;
  shift: string;
  itemName: string;
  quantity: string | number;
  unit: string;
  closingValue: string | number;
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function StockReport({
  plantId,
  from,
  to,
}: {
  plantId: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("pnl");
  const baseUrl = `/api/plants/${plantId}/stock?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, total, loading, error, setPage } =
    usePaginatedReport<StockRow>(baseUrl, t("networkError"));

  const columns: ReportColumn<StockRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
    { key: "shift", label: "Shift", render: (r) => r.shift },
    { key: "item", label: "Item", render: (r) => r.itemName },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      render: (r) => `${Number(r.quantity)} ${r.unit}`,
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      render: (r) => formatINR(r.closingValue),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("stockTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable columns={columns} rows={rows} loading={loading} />
      <Pagination
        page={page}
        pageSize={REPORT_PAGE_SIZE}
        total={total}
        onPageChange={setPage}
      />
    </section>
  );
}
