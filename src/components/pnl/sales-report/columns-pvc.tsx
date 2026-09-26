import { formatINR } from "@/lib/format/inr";
import { type ReportColumn } from "@/components/pnl/ReportTable";
import { BillPhotosCell } from "@/components/pnl/BillPhotosCell";
import { formatDayMonthYear } from "@/lib/dates";
import { PnlApprovalBadge } from "@/components/pnl/PnlApprovalBadge";
import {
  formatBillDate,
  formatQty,
  formatRate,
  goodsValue,
} from "@/components/pnl/sales-report/format";
import type { SaleRow } from "@/components/pnl/sales-report/types";

export function buildPvcSalesColumns(
  page: number,
  pageSize: number,
): ReportColumn<SaleRow>[] {
  return [
    {
      key: "s",
      label: "S No.",
      render: (_r, index) =>
        String((page - 1) * pageSize + (index ?? 0) + 1),
    },
    {
      key: "customer",
      label: "Customer",
      wrap: true,
      render: (r) => r.customerName?.trim() || "—",
    },
    {
      key: "remarks",
      label: "Remarks",
      wrap: "wide",
      render: (r) => r.notes?.trim() || "—",
    },
    {
      key: "invoice",
      label: "Invoice no.",
      render: (r) => r.billNumber?.trim() || "—",
    },
    {
      key: "product",
      label: "Item Details",
      wrap: true,
      render: (r) => r.itemDescription,
    },
    {
      key: "unit",
      label: "Unit",
      compact: true,
      render: (r) => r.unit || "—",
    },
    {
      key: "qty",
      label: "Qty",
      align: "right",
      compact: true,
      render: (r) => formatQty(r.quantity),
    },
    {
      key: "rate",
      label: "Rate",
      align: "right",
      compact: true,
      render: (r) => formatRate(r.rate),
    },
    {
      key: "goods",
      label: "Goods value",
      align: "right",
      render: (r) => formatINR(goodsValue(r)),
    },
    {
      key: "billDate",
      label: "Bill date",
      render: (r) => formatBillDate(r.billDate || r.date),
    },
    {
      key: "excelUploadedAt",
      label: "Excel upload",
      compact: true,
      render: (r) =>
        r.excelUploadedAt
          ? formatDayMonthYear(r.excelUploadedAt)
          : "—",
    },
    {
      key: "approvedByHead",
      label: "Approval Status",
      compact: true,
      render: (r) => <PnlApprovalBadge row={r} level="head" />,
    },
    {
      key: "photos",
      label: "Bill",
      compact: true,
      render: (r) => (
        <BillPhotosCell urls={r.billPhotoUrls} fallbackUrl={r.billPhotoUrl} />
      ),
    },
  ];
}
