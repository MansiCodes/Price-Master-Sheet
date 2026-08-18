"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { isCat6Plant } from "@/lib/plant-layout";

type StockRow = {
  id: string;
  date: string;
  shift: string;
  itemName: string;
  quantity: string | number;
  unit: string;
  rate?: string | number;
  closingValue: string | number;
  photoUrl?: string | null;
  photoUrls?: string[];
};

function isoDate(value: string | Date) {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function num(value: string | number | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function StockReport({
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
  const cat6 = isCat6Plant(plantCode);
  const baseUrl = `/api/plants/${plantId}/stock?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const { rows, page, pageSize, total, loading, error, response, setPage, setPageSize } =
    usePaginatedReport<StockRow>(baseUrl, t("networkError"));
  const totals = response?.totals as { closingValue?: number } | undefined;

  const pvcColumns: ReportColumn<StockRow>[] = [
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
    {
      key: "photos",
      label: "Image",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];

  const cat6Columns: ReportColumn<StockRow>[] = [
    {
      key: "s",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "item",
      label: "Item Name",
      wrap: true,
      render: (r) => r.itemName,
    },
    {
      key: "qty",
      label: "QTY",
      align: "right",
      compact: true,
      render: (r) => String(Number(r.quantity)),
    },
    {
      key: "unit",
      label: "UNIT",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "rate",
      label: "RATE",
      align: "right",
      compact: true,
      render: (r) =>
        num(r.rate).toLocaleString("en-IN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: "value",
      label: "Value",
      align: "right",
      render: (r) => formatINR(r.closingValue),
    },
    {
      key: "photos",
      label: "Image",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];

  return (
    <section className="pnl-report-panel">
      <h3 className="pnl-report-panel__title">{t("stockTitle")}</h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={cat6 ? cat6Columns : pvcColumns}
        rows={rows}
        loading={loading}
        footer={
          totals
            ? {
                item: "TOTAL",
                value: formatINR(totals.closingValue ?? 0),
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
