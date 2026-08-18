"use client";

import { useTranslations } from "next-intl";
import { formatINR } from "@/lib/format/inr";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { ReportTable, type ReportColumn } from "@/components/pnl/ReportTable";
import { Pagination } from "@/components/ui/Pagination";
import { usePaginatedReport } from "@/components/pnl/usePaginatedReport";
import { formatDayMonthYear } from "@/lib/dates";

type StockRow = {
  id: string;
  date: string;
  notes?: string | null;
  itemName: string;
  category?: string | null;
  quantity: string | number;
  unit: string;
  rate?: string | number | null;
  closingValue: string | number;
  photoUrl?: string | null;
  photoUrls?: string[];
};

function isoDate(value: string | Date | null | undefined) {
  return formatDayMonthYear(value);
}

function num(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatQty(value: string | number, digits = 2) {
  return num(value).toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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
  const isPvc = plantCode?.toUpperCase() === "PVC";
  const baseUrl = `/api/plants/${plantId}/stock?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${isPvc ? "&snapshot=1" : ""}`;
  const { rows, page, pageSize, total, loading, error, setPage, setPageSize } =
    usePaginatedReport<StockRow>(baseUrl, t("networkError"), isPvc ? 20 : 10);

  const pvcColumns: ReportColumn<StockRow>[] = [
    {
      key: "sno",
      label: "S.No.",
      align: "center",
      compact: true,
      width: "4.5rem",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "stock",
      label: "Stock",
      align: "center",
      compact: true,
      width: "5rem",
      render: (r) => r.category || "RM",
    },
    {
      key: "particulars",
      label: "Particulars",
      wrap: true,
      render: (r) => r.itemName,
    },
    {
      key: "closingStock",
      label: "Closing Stock",
      align: "right",
      width: "9rem",
      render: (r) => formatQty(r.quantity, 3),
    },
    {
      key: "unit",
      label: "Unit",
      align: "center",
      compact: true,
      width: "5rem",
      render: (r) => r.unit || "KGS",
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      width: "7rem",
      render: (r) => formatQty(num(r.rate)),
    },
    {
      key: "closingValue",
      label: "Closing Value",
      align: "right",
      width: "10rem",
      render: (r) =>
        formatINR(num(r.closingValue) || num(r.quantity) * num(r.rate)),
    },
    {
      key: "photos",
      label: "Image",
      align: "center",
      compact: true,
      width: "5.5rem",
      render: (r) => (
        <BillPhotosCell urls={r.photoUrls} fallbackUrl={r.photoUrl} />
      ),
    },
  ];

  const defaultColumns: ReportColumn<StockRow>[] = [
    { key: "date", label: "Date", render: (r) => isoDate(r.date) },
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
      <h3 className="pnl-report-panel__title">
        {isPvc ? "PVC Plant - Closing Stock" : t("stockTitle")}
      </h3>
      {error ? <div className="alert alert--error">{error}</div> : null}
      <ReportTable
        columns={isPvc ? pvcColumns : defaultColumns}
        rows={rows}
        loading={loading}
        variant={isPvc ? "register" : undefined}
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
