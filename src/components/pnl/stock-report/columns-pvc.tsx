import { formatINR } from "@/lib/format/inr";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { formatDayMonthYear } from "@/lib/dates";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import { formatQty, isoDate, num } from "@/components/pnl/stock-report/format";
import type { StockRow } from "@/components/pnl/stock-report/types";

export function buildPvcStockColumns(
  page: number,
  pageSize: number,
): ReportColumn<StockRow>[] {
  return [
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
      key: "date",
      label: "Date",
      align: "center",
      compact: true,
      width: "6.5rem",
      render: (r) => isoDate(r.date),
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
      key: "excelUploadedAt",
      label: "Excel upload",
      compact: true,
      render: (r) =>
        r.excelUploadedAt ? formatDayMonthYear(r.excelUploadedAt) : "—",
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
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
}

export function buildCat6StockColumns(
  page: number,
  pageSize: number,
): ReportColumn<StockRow>[] {
  return [
    {
      key: "s",
      label: "S.No",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "date",
      label: "Date",
      align: "center",
      compact: true,
      render: (r) => isoDate(r.date),
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
      key: "excelUploadedAt",
      label: "Excel upload",
      compact: true,
      render: (r) =>
        r.excelUploadedAt ? formatDayMonthYear(r.excelUploadedAt) : "—",
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
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
}
